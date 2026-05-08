import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Validation, ValidationRequest } from '../models/validation.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ValidationService {
  private url = `${environment.apiUrl}/validations`;

  constructor(private http: HttpClient) { }

  getAll(): Observable<Validation[]> {
    return this.http.get<Validation[]>(this.url);
  }

  /** Tickets where the current user has at least one ValidationAssignment (any status). */
  getMyTickets(): Observable<Validation[]> {
    return this.http.get<Validation[]>(`${this.url}/my-tickets`);
  }

  getById(id: number): Observable<Validation> {
    return this.http.get<Validation>(`${this.url}/${id}`);
  }

  create(data: ValidationRequest): Observable<Validation> {
    return this.http.post<Validation>(this.url, data);
  }

  update(id: number, data: ValidationRequest): Observable<Validation> {
    return this.http.put<Validation>(`${this.url}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  getActive(): Observable<Validation[]> {
    return this.http.get<Validation[]>(`${this.url}/active`);
  }

  getByStatus(status: string): Observable<Validation[]> {
    return this.http.get<Validation[]>(`${this.url}/status/${status}`);
  }

  getByZone(zoneId: number): Observable<Validation[]> {
    return this.http.get<Validation[]>(`${this.url}/zone/${zoneId}`);
  }
  getWithResults(id: number): Observable<Validation> {
    return this.http.get<Validation>(`${this.url}/${id}/results`);
  }

  close(id: number, finalStatus: string, comments?: string): Observable<Validation> {
    let params = new HttpParams().set('finalStatus', finalStatus);
    if (comments) {
      params = params.set('comments', comments);
    }
    return this.http.patch<Validation>(`${this.url}/${id}/close`, null, { params });
  }
  // ADD these methods — they delegate to the new ticket endpoints:

  getByLine(lineId: number): Observable<Validation[]> {
    return this.http.get<Validation[]>(`${this.url}/line/${lineId}`);
  }

  getBySecteur(secteurId: number): Observable<Validation[]> {
    return this.http.get<Validation[]>(`${this.url}/secteur/${secteurId}`);
  }
}