import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ValidationResult, ValidationResultRequest } from '../models/validation-result.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ValidationResultService {
  private url = `${environment.apiUrl}/validation-results`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ValidationResult[]> {
    return this.http.get<ValidationResult[]>(this.url);
  }

  getById(id: number): Observable<ValidationResult> {
    return this.http.get<ValidationResult>(`${this.url}/${id}`);
  }

  create(data: ValidationResultRequest): Observable<ValidationResult> {
    return this.http.post<ValidationResult>(this.url, data);
  }

  createBatch(data: ValidationResultRequest[]): Observable<ValidationResult[]> {
    return this.http.post<ValidationResult[]>(`${this.url}/batch`, data);
  }

  update(id: number, data: ValidationResultRequest): Observable<ValidationResult> {
    return this.http.put<ValidationResult>(`${this.url}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  getByValidation(validationId: number): Observable<ValidationResult[]> {
    return this.http.get<ValidationResult[]>(`${this.url}/validation/${validationId}`);
  }

  getConformByValidation(validationId: number): Observable<ValidationResult[]> {
    return this.http.get<ValidationResult[]>(`${this.url}/validation/${validationId}/conform`);
  }

  getNonConformByValidation(validationId: number): Observable<ValidationResult[]> {
    return this.http.get<ValidationResult[]>(`${this.url}/validation/${validationId}/non-conform`);
  }

  getNonConformCount(validationId: number): Observable<number> {
    return this.http.get<number>(`${this.url}/validation/${validationId}/non-conform/count`);
  }
}