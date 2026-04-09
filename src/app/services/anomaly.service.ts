import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AnomalyResult, ZoneAnomalyReport } from '../models/anomaly.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AnomalyService {
  private url = `${environment.apiUrl}/anomalies`;

  constructor(private http: HttpClient) {}

  detectForValidation(validationId: number): Observable<AnomalyResult[]> {
    return this.http.get<AnomalyResult[]>(`${this.url}/detect/${validationId}`);
  }

  scanAllActive(): Observable<AnomalyResult[]> {
    return this.http.get<AnomalyResult[]>(`${this.url}/scan`);
  }

  getZoneReport(zoneId: number, days: number = 30): Observable<ZoneAnomalyReport> {
    const params = new HttpParams().set('days', days.toString());
    return this.http.get<ZoneAnomalyReport>(`${this.url}/zone/${zoneId}/report`, { params });
  }
}