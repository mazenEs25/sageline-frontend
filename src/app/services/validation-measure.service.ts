import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ValidationMeasure } from '../models/validation-measure.model';
import { CreateValidationMeasureRequest } from '../models/create-validation-measure.dto';
import { UpdateValidationMeasureRequest } from '../models/update-validation-measure.dto';
import {
  BatchCreateValidationMeasureRequest,
  BatchUpdateValidationMeasureRequest,
  BatchValidationMeasureResponse,
  FromCatalogSeedResponse
} from '../models/batch-validation-measure.model';

@Injectable({ providedIn: 'root' })
export class ValidationMeasureService {
  private apiUrl = `${environment.apiUrl}/validations`;

  constructor(private http: HttpClient) {}

  list(validationId: number): Observable<ValidationMeasure[]> {
    return this.http.get<ValidationMeasure[]>(`${this.apiUrl}/${validationId}/measures`);
  }

  create(validationId: number, dto: CreateValidationMeasureRequest): Observable<ValidationMeasure> {
    return this.http.post<ValidationMeasure>(`${this.apiUrl}/${validationId}/measures`, dto);
  }

  update(validationId: number, measureId: number, dto: UpdateValidationMeasureRequest): Observable<ValidationMeasure> {
    return this.http.put<ValidationMeasure>(`${this.apiUrl}/${validationId}/measures/${measureId}`, dto);
  }

  delete(validationId: number, measureId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${validationId}/measures/${measureId}`);
  }

  createBatch(validationId: number, body: BatchCreateValidationMeasureRequest): Observable<BatchValidationMeasureResponse> {
    return this.http.post<BatchValidationMeasureResponse>(`${this.apiUrl}/${validationId}/measures/batch`, body);
  }

  updateBatch(validationId: number, body: BatchUpdateValidationMeasureRequest): Observable<BatchValidationMeasureResponse> {
    return this.http.put<BatchValidationMeasureResponse>(`${this.apiUrl}/${validationId}/measures/batch`, body);
  }

  fromTemplate(validationId: number, templateId: number): Observable<ValidationMeasure> {
    return this.http.post<ValidationMeasure>(`${this.apiUrl}/${validationId}/measures/from-template/${templateId}`, {});
  }

  fromCatalog(validationId: number): Observable<FromCatalogSeedResponse> {
    return this.http.post<FromCatalogSeedResponse>(`${this.apiUrl}/${validationId}/measures/from-catalog`, {});
  }
}
