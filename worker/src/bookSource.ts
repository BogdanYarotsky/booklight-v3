import Book from 'booklight-shared';


export default interface BookSource {
    getBooks(searchQuery: string): Promise<Book[]>;
}
