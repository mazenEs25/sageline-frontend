import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Phase, PhaseRequest } from '../models/phase.model';

@Injectable({ providedIn: 'root' })
export class PhaseService {
  private apiUrl = `${environment.apiUrl}/phases`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Phase[]> {
    return this.http.get<Phase[]>(this.apiUrl);
  }

  getBySecteur(secteurId: number): Observable<Phase[]> {
    return this.http.get<Phase[]>(`${this.apiUrl}/secteur/${secteurId}`);
  }

  getById(id: number): Observable<Phase> {
    return this.http.get<Phase>(`${this.apiUrl}/${id}`);
  }

  create(dto: PhaseRequest): Observable<Phase> {
    return this.http.post<Phase>(this.apiUrl, dto);
  }

  update(id: number, dto: PhaseRequest): Observable<Phase> {
    return this.http.put<Phase>(`${this.apiUrl}/${id}`, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}