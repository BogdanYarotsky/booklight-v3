import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import Book from 'booklight-shared';

@Injectable({
  providedIn: 'root'
})
export class BookSearchService {
  private apiUrl = 'http://localhost:8080/api/search';

  constructor(private http: HttpClient) { }

  searchBooks(query: string): Observable<Book[]> {
    const url = `${this.apiUrl}?q=${query}`;
    return this.http.get<Book[]>(url);
  }
}
