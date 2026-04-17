import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ValidationAssignment, AssignmentRequest, AssignmentBatchRequest } from '../models/validation-assignment.model';
import { AssignmentStatus } from '../shared/enums/ticket.enum';

@Injectable({ providedIn: 'root' })
export class AssignmentService {
  private apiUrl = `${environment.apiUrl}/assignments`;

  constructor(private http: HttpClient) {}

  create(dto: AssignmentRequest): Observable<ValidationAssignment> {
    return this.http.post<ValidationAssignment>(this.apiUrl, dto);
  }

  createBatch(dto: AssignmentBatchRequest): Observable<ValidationAssignment[]> {
    return this.http.post<ValidationAssignment[]>(`${this.apiUrl}/batch`, dto);
  }

  getByValidation(validationId: number): Observable<ValidationAssignment[]> {
    return this.http.get<ValidationAssignment[]>(`${this.apiUrl}/validation/${validationId}`);
  }

  getByUser(userId: number): Observable<ValidationAssignment[]> {
    return this.http.get<ValidationAssignment[]>(`${this.apiUrl}/user/${userId}`);
  }

  getActiveByUser(userId: number): Observable<ValidationAssignment[]> {
    return this.http.get<ValidationAssignment[]>(`${this.apiUrl}/user/${userId}/active`);
  }

  updateStatus(id: number, status: AssignmentStatus): Observable<ValidationAssignment> {
    const params = new HttpParams().set('status', status);
    return this.http.patch<ValidationAssignment>(`${this.apiUrl}/${id}/status`, null, { params });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}