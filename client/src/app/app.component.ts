import { Component, OnInit } from '@angular/core';
import { BookSearchService } from './book-search.service';
import Book from 'booklight-shared';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  books: Book[] = [];
  searchQuery = '';

  constructor(private bookSearchService: BookSearchService) { }

  ngOnInit() {
    this.searchBooks();
  }

  searchBooks() {
    this.bookSearchService.searchBooks(this.searchQuery)
      .subscribe(books => {
        this.books = books;
      });
  }

}
