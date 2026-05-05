import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Validation, PosteCompleteRequest } from '../models/validation.model';
import { TicketCreateRequest, TicketWeekPlanRequest, PrepValidationRequest, TicketCloseRequest } from '../models/ticket.model';
import { TicketStatus } from '../shared/enums/ticket.enum';

@Injectable({ providedIn: 'root' })
export class TicketService {
  private apiUrl = `${environment.apiUrl}/validations`;

  constructor(private http: HttpClient) {}

  // ===== LIST & SEARCH =====
  getAll(): Observable<Validation[]> {
    return this.http.get<Validation[]>(this.apiUrl);
  }

  getById(id: number): Observable<Validation> {
    return this.http.get<Validation>(`${this.apiUrl}/${id}`);
  }

  getByStatus(status: TicketStatus): Observable<Validation[]> {
    return this.http.get<Validation[]>(`${this.apiUrl}/status/${status}`);
  }

  getByZone(zoneId: number): Observable<Validation[]> {
    return this.http.get<Validation[]>(`${this.apiUrl}/zone/${zoneId}`);
  }

  getByLine(lineId: number): Observable<Validation[]> {
    return this.http.get<Validation[]>(`${this.apiUrl}/line/${lineId}`);
  }

  getBySecteur(secteurId: number): Observable<Validation[]> {
    return this.http.get<Validation[]>(`${this.apiUrl}/secteur/${secteurId}`);
  }

  getMyTickets(): Observable<Validation[]> {
    return this.http.get<Validation[]>(`${this.apiUrl}/my-tickets`);
  }

  getByWeek(date: string): Observable<Validation[]> {
    return this.http.get<Validation[]>(`${this.apiUrl}/week/${date}`);
  }

  // ===== CREATION =====
  create(dto: TicketCreateRequest): Observable<Validation> {
    return this.http.post<Validation>(this.apiUrl, dto);
  }

  planWeek(dto: TicketWeekPlanRequest): Observable<Validation[]> {
    return this.http.post<Validation[]>(`${this.apiUrl}/plan-week`, dto);
  }

  // ===== WORKFLOW TRANSITIONS =====
  startPrep(id: number): Observable<Validation> {
    return this.http.patch<Validation>(`${this.apiUrl}/${id}/start-prep`, {});
  }

  validatePrep(id: number, dto: PrepValidationRequest): Observable<Validation> {
    return this.http.patch<Validation>(`${this.apiUrl}/${id}/validate-prep`, dto);
  }

  startValidation(id: number): Observable<Validation> {
    return this.http.patch<Validation>(`${this.apiUrl}/${id}/start`, {});
  }

  submitForReview(id: number): Observable<Validation> {
    return this.http.patch<Validation>(`${this.apiUrl}/${id}/submit-review`, {});
  }

  closeTicket(id: number, dto: TicketCloseRequest): Observable<Validation> {
    return this.http.patch<Validation>(`${this.apiUrl}/${id}/close`, dto);
  }

  cancelTicket(id: number, reason?: string): Observable<Validation> {
    const params = reason ? new HttpParams().set('reason', reason) : undefined;
    return this.http.patch<Validation>(`${this.apiUrl}/${id}/cancel`, {}, { params });
  }

  /**
   * 2026-04 line-ticket model: close a single poste of the line.
   * Server auto-advances the parent ticket to EN_REVUE when the last poste
   * is closed.
   */
  markPosteDone(
    validationId: number,
    zoneId: number,
    dto: PosteCompleteRequest
  ): Observable<Validation> {
    return this.http.patch<Validation>(
      `${this.apiUrl}/${validationId}/postes/${zoneId}/complete`,
      dto
    );
  }

  // ===== DELETE =====
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}