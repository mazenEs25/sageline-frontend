import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DashboardData, KPI, GlobalSummary } from '../models/kpi.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class KpiService {
  private url = `${environment.apiUrl}/kpis`;

  constructor(private http: HttpClient) {}

  getGlobalDashboard(): Observable<DashboardData> {
    return this.http.get<DashboardData>(`${this.url}/dashboard/global`);
  }

  getLineDashboard(lineId: number): Observable<DashboardData> {
    return this.http.get<DashboardData>(`${this.url}/dashboard/line/${lineId}`);
  }

  getConformityRate(lineId: number): Observable<number> {
    return this.http.get<number>(`${this.url}/line/${lineId}/conformity-rate`);
  }

  getValidationCount(lineId: number): Observable<number> {
    return this.http.get<number>(`${this.url}/line/${lineId}/validation-count`);
  }

  getLatest(lineId: number): Observable<KPI[]> {
    return this.http.get<KPI[]>(`${this.url}/line/${lineId}/latest`);
  }

  getByDateRange(lineId: number, start: string, end: string): Observable<KPI[]> {
    const params = new HttpParams()
      .set('start', start)
      .set('end', end);
    return this.http.get<KPI[]>(`${this.url}/line/${lineId}/date-range`, { params });
  }

  calculate(lineId: number): Observable<any> {
    return this.http.post<any>(`${this.url}/calculate/${lineId}`, {});
  }

  getEvolution(lineId: number, days: number = 30): Observable<any[]> {
    const params = new HttpParams().set('days', days.toString());
    return this.http.get<any[]>(`${this.url}/line/${lineId}/evolution`, { params });
  }

  getGlobalSummary(): Observable<GlobalSummary> {
    return this.http.get<GlobalSummary>(`${this.url}/global/summary`);
  }
}