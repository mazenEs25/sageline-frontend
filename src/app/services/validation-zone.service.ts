import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ValidationZone, ValidationZoneRequest } from '../models/validation-zone.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ValidationZoneService {
  private url = `${environment.apiUrl}/zones`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ValidationZone[]> {
    return this.http.get<ValidationZone[]>(this.url);
  }

  getById(id: number): Observable<ValidationZone> {
    return this.http.get<ValidationZone>(`${this.url}/${id}`);
  }

  create(zone: ValidationZoneRequest): Observable<ValidationZone> {
    return this.http.post<ValidationZone>(this.url, zone);
  }

  update(id: number, zone: ValidationZoneRequest): Observable<ValidationZone> {
    return this.http.put<ValidationZone>(`${this.url}/${id}`, zone);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  getByLine(lineId: number): Observable<ValidationZone[]> {
    return this.http.get<ValidationZone[]>(`${this.url}/line/${lineId}`);
  }
}