import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
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
import { LogImportReport } from '../models/log-import-report.model';
import { LogImportOptions } from '../models/log-import-options.model';
import { LogSourceSnippet } from '../models/log-source-snippet.model';

@Injectable({ providedIn: 'root' })
export class ValidationMeasureService {
  private apiUrl = `${environment.apiUrl}/validations`;

  constructor(private http: HttpClient) {}

  list(validationId: number): Observable<ValidationMeasure[]> {
    return this.http.get<ValidationMeasure[]>(`${this.apiUrl}/${validationId}/measures`);
  }

  /**
   * Per-poste measure list. Backed by GET /api/validations/{id}/postes/{zoneId}/measures.
   * Use when the UI is scoped to a single poste of the line (Phase D).
   */
  listByPoste(validationId: number, zoneId: number): Observable<ValidationMeasure[]> {
    return this.http.get<ValidationMeasure[]>(
      `${this.apiUrl}/${validationId}/postes/${zoneId}/measures`
    );
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

  /**
   * Per-template instantiation. Kept for forward-compat; the backend does NOT currently
   * expose `POST /measures/from-template/{templateId}` — only the bulk variant below.
   * Calling this today will 404.
   */
  fromTemplate(validationId: number, templateId: number): Observable<ValidationMeasure> {
    return this.http.post<ValidationMeasure>(`${this.apiUrl}/${validationId}/measures/from-template/${templateId}`, {});
  }

  /**
   * Bulk-instantiate ALL active catalog templates for the ticket's zone posteType,
   * each created with status = NOT_EXECUTED. Already-present templates are skipped server-side.
   *
   * Real backend endpoint: POST /api/validations/{id}/measures/from-template (returns ValidationMeasure[]).
   * The earlier /from-catalog URL never existed — it was the source of the 500 in the UI.
   * We wrap the raw array into a {created, skipped, measures} shape so callers don't change.
   */
  fromCatalog(validationId: number): Observable<FromCatalogSeedResponse> {
    return this.http
      .post<ValidationMeasure[]>(`${this.apiUrl}/${validationId}/measures/from-template`, {})
      .pipe(
        map((measures: ValidationMeasure[]) => ({
          created: measures?.length ?? 0,
          skipped: 0, // server doesn't return a skip count; surface 0.
          measures: measures ?? []
        }))
      );
  }

  previewLog(validationId: number, file: File, options?: LogImportOptions): Observable<LogImportReport> {
    const body = this.buildLogFormData(file, options);
    return this.http.post<LogImportReport>(`${this.apiUrl}/${validationId}/preview-log`, body);
  }

  importLog(validationId: number, file: File, options?: LogImportOptions): Observable<LogImportReport> {
    const body = this.buildLogFormData(file, options);
    return this.http.post<LogImportReport>(`${this.apiUrl}/${validationId}/import-log`, body);
  }

  /**
   * Multipart body shared by preview-log + import-log.
   * The {@code "options"} part is JSON; Spring binds it to LogImportOptionsDTO via
   * the controller's {@code @RequestPart(value="options", required=false)} signature.
   * We only attach the part when the caller provides options — keeping back-compat.
   */
  private buildLogFormData(file: File, options?: LogImportOptions): FormData {
    const body = new FormData();
    body.append('file', file, file.name);
    if (options) {
      body.append(
        'options',
        new Blob([JSON.stringify(options)], { type: 'application/json' }),
        'options.json'
      );
    }
    return body;
  }

  getSourceSnippet(validationId: number, measureId: number): Observable<LogSourceSnippet> {
    return this.http.get<LogSourceSnippet>(`${this.apiUrl}/${validationId}/measures/${measureId}/source-snippet`);
  }
}
