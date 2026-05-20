import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ValidationResult, ValidationResultRequest } from '../models/validation-result.model';
import { environment } from '../../environments/environment';

/**
 * Legacy compatibility shim for the pre-Phase-002 measure model.
 *
 * <p><b>Status (Phase E):</b> deprecated as a whole. Two pages still use it
 * — the standalone {@code /results} admin grid and the admin
 * {@code validation-detail} page. The new model is {@link
 * import('./validation-measure.service').ValidationMeasureService}, which
 * exposes per-poste reads ({@code listByPoste}) plus the modern create / update /
 * batch endpoints under {@code /api/validations/{id}/measures}.</p>
 *
 * <p>The per-method {@code console.warn} spam was removed — it fired several times
 * per page render. A single warning is now emitted from the constructor the first
 * time the service is instantiated in a session, so the deprecation is still
 * visible in DevTools without polluting every measure mutation.</p>
 */
@Injectable({ providedIn: 'root' })
export class ValidationResultService {
  private url = `${environment.apiUrl}/validation-results`;
  private static warned = false;

  constructor(private http: HttpClient) {
    if (!ValidationResultService.warned) {
      ValidationResultService.warned = true;
      console.warn(
        '[deprecated] ValidationResultService is still in use (admin pages). ' +
        'New code should call ValidationMeasureService — see PosteValidationController for the per-poste API.'
      );
    }
  }

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
