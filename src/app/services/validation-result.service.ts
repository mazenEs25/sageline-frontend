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
    console.warn('[deprecated] ValidationResultService.getAll — migrate to ValidationMeasureService');
    return this.http.get<ValidationResult[]>(this.url);
  }

  getById(id: number): Observable<ValidationResult> {
    console.warn('[deprecated] ValidationResultService.getById — migrate to ValidationMeasureService');
    return this.http.get<ValidationResult>(`${this.url}/${id}`);
  }

  create(data: ValidationResultRequest): Observable<ValidationResult> {
    console.warn('[deprecated] ValidationResultService.create — migrate to ValidationMeasureService');
    return this.http.post<ValidationResult>(this.url, data);
  }

  createBatch(data: ValidationResultRequest[]): Observable<ValidationResult[]> {
    console.warn('[deprecated] ValidationResultService.createBatch — migrate to ValidationMeasureService');
    return this.http.post<ValidationResult[]>(`${this.url}/batch`, data);
  }

  update(id: number, data: ValidationResultRequest): Observable<ValidationResult> {
    console.warn('[deprecated] ValidationResultService.update — migrate to ValidationMeasureService');
    return this.http.put<ValidationResult>(`${this.url}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    console.warn('[deprecated] ValidationResultService.delete — migrate to ValidationMeasureService');
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  getByValidation(validationId: number): Observable<ValidationResult[]> {
    console.warn('[deprecated] ValidationResultService.getByValidation — migrate to ValidationMeasureService');
    return this.http.get<ValidationResult[]>(`${this.url}/validation/${validationId}`);
  }

  getConformByValidation(validationId: number): Observable<ValidationResult[]> {
    console.warn('[deprecated] ValidationResultService.getConformByValidation — migrate to ValidationMeasureService');
    return this.http.get<ValidationResult[]>(`${this.url}/validation/${validationId}/conform`);
  }

  getNonConformByValidation(validationId: number): Observable<ValidationResult[]> {
    console.warn('[deprecated] ValidationResultService.getNonConformByValidation — migrate to ValidationMeasureService');
    return this.http.get<ValidationResult[]>(`${this.url}/validation/${validationId}/non-conform`);
  }

  getNonConformCount(validationId: number): Observable<number> {
    console.warn('[deprecated] ValidationResultService.getNonConformCount — migrate to ValidationMeasureService');
    return this.http.get<number>(`${this.url}/validation/${validationId}/non-conform/count`);
  }
}