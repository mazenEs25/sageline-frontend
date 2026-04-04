import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User, UserRequest } from '../models/user.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UserService {
  private url = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<User[]> {
    return this.http.get<User[]>(this.url);
  }

  getById(id: number): Observable<User> {
    return this.http.get<User>(`${this.url}/${id}`);
  }

  create(user: UserRequest): Observable<User> {
    return this.http.post<User>(this.url, user);
  }

  update(id: number, user: UserRequest): Observable<User> {
    return this.http.put<User>(`${this.url}/${id}`, user);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  getByRole(role: string): Observable<User[]> {
    return this.http.get<User[]>(`${this.url}/role/${role}`);
  }

  getByLine(lineId: number): Observable<User[]> {
    return this.http.get<User[]>(`${this.url}/line/${lineId}`);
  }

  search(query: string): Observable<User[]> {
    return this.http.get<User[]>(`${this.url}/search`, { params: { q: query } });
  }

  count(): Observable<number> {
    return this.http.get<number>(`${this.url}/count`);
  }
}