import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ToolRecommendation, ToolRecommendationRequest } from '../models/tool-recommendation.model';
import { ToolScore } from '../models/tool-score.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ToolService {
  private url = `${environment.apiUrl}/tools`;

  constructor(private http: HttpClient) {}

  // AI Model 2 — Recommendations
  getRecommendations(zoneId?: number, lineId?: number): Observable<ToolScore[]> {
    let params = new HttpParams();
    if (zoneId) params = params.set('zoneId', zoneId.toString());
    if (lineId) params = params.set('lineId', lineId.toString());
    return this.http.get<ToolScore[]>(`${this.url}/recommend`, { params });
  }

  // CRUD
  getAll(): Observable<ToolRecommendation[]> {
    return this.http.get<ToolRecommendation[]>(this.url);
  }

  getById(id: number): Observable<ToolRecommendation> {
    return this.http.get<ToolRecommendation>(`${this.url}/${id}`);
  }

  create(tool: ToolRecommendationRequest): Observable<ToolRecommendation> {
    return this.http.post<ToolRecommendation>(this.url, tool);
  }

  update(id: number, tool: ToolRecommendationRequest): Observable<ToolRecommendation> {
    return this.http.put<ToolRecommendation>(`${this.url}/${id}`, tool);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}