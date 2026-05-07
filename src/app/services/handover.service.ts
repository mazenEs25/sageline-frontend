import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { HandoverResponse, HandoverInitiateRequest, HandoverAssignRequest } from '../models/handover.model';

@Injectable({
  providedIn: 'root'
})
export class HandoverService {
  private apiUrl = `${environment.apiUrl}/handovers`;

  constructor(private http: HttpClient) { }

  initiateHandover(validationId: number, body: HandoverInitiateRequest): Observable<HandoverResponse> {
    return this.http.post<HandoverResponse>(`${this.apiUrl}/initiate/${validationId}`, body);
  }

  acceptHandover(handoverId: number): Observable<HandoverResponse> {
    return this.http.post<HandoverResponse>(`${this.apiUrl}/${handoverId}/accept`, {});
  }

  assignHandover(handoverId: number, techId: number): Observable<HandoverResponse> {
    return this.http.patch<HandoverResponse>(`${this.apiUrl}/${handoverId}/assign`, { techId });
  }

  cancelHandover(handoverId: number): Observable<HandoverResponse> {
    return this.http.patch<HandoverResponse>(`${this.apiUrl}/${handoverId}/cancel`, {});
  }

  getPendingHandovers(): Observable<HandoverResponse[]> {
    return this.http.get<HandoverResponse[]>(`${this.apiUrl}/pending`);
  }

  getHandoverHistory(validationId: number): Observable<HandoverResponse[]> {
    return this.http.get<HandoverResponse[]>(`${this.apiUrl}/validation/${validationId}`);
  }
}
