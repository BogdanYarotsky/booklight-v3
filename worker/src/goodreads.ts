import Book from 'booklight-shared';
import { Browser, Page } from "puppeteer-core";
import BookSource from "./bookSource";

export default class Goodreads implements BookSource {
    constructor(private browser: Browser) { }

    async getBooks(searchQuery: string): Promise<Book[]> {
        const promises = [];
        for (let pageNum = 1; pageNum <= 3; pageNum++) {
            const url = this.buildUrl(searchQuery, pageNum);
            const booksPromise = this.parsePage(url);
            promises.push(booksPromise);
        }
        const bookLists = await Promise.all(promises);
        const books = bookLists.flat();
        return books.sort((a, b) => a.score < b.score ? 1 : -1);
    }

    private async parsePage(url: string): Promise<Book[]> {
        const page = await this.browser.newPage();
        await this.interceptUselessRequests(page);
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        const books = await this.parseBooks(page);
        return books;
    }

    private buildUrl(searchQuery: string, pageNumber: number): string {
        return `https://www.goodreads.com/search?page=${pageNumber}&q=${searchQuery}`;
    }

    private async parseBooks(page: Page): Promise<Book[]> {
        return await page.$$eval("tr[itemtype='http://schema.org/Book']",
            rows => rows.map<Book>(row => {
                const ratingInfo = row.querySelector(".minirating")?.textContent?.trim() ?? "";
                const strings = ratingInfo.split(" ");
                const rating = strings.length > 0 ? Number(strings[0]) : 0;
                const reviews = strings.length > 4 ? Number(strings[4].replace(/,/g, "")) : 0;
                const titleElement = row.querySelector(".bookTitle");
                return {
                    title: titleElement?.textContent?.trim() ?? "",
                    url: titleElement?.getAttribute("href") ?? "",
                    imageUrl: row.querySelector(".bookCover")?.getAttribute("src") ?? "",
                    authors: [...row.querySelectorAll(".authorName")].map(a => a.textContent ?? ""),
                    rating: rating,
                    reviews: reviews,
                    score: Number((rating * 0.92 + Math.log(reviews) * 0.08).toFixed(2))
                };
            })
        );
    }

    // is there a way to do so for all pages?
    private async interceptUselessRequests(page: Page) {
        await page.setRequestInterception(true);
        page.on("request", r => {
            if (r.resourceType() === "document") {
                r.continue();
            } else {
                r.abort();
            }
        });
    }
}