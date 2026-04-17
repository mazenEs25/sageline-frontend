import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Secteur, SecteurRequest } from '../models/secteur.model';

@Injectable({ providedIn: 'root' })
export class SecteurService {
  private apiUrl = `${environment.apiUrl}/secteurs`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Secteur[]> {
    return this.http.get<Secteur[]>(this.apiUrl);
  }

  getActive(): Observable<Secteur[]> {
    return this.http.get<Secteur[]>(`${this.apiUrl}/active`);
  }

  getById(id: number): Observable<Secteur> {
    return this.http.get<Secteur>(`${this.apiUrl}/${id}`);
  }

  create(dto: SecteurRequest): Observable<Secteur> {
    return this.http.post<Secteur>(this.apiUrl, dto);
  }

  update(id: number, dto: SecteurRequest): Observable<Secteur> {
    return this.http.put<Secteur>(`${this.apiUrl}/${id}`, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}