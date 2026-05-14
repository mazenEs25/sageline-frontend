import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PosteMeasureCatalog, CreatePosteMeasureCatalogRequest, UpdatePosteMeasureCatalogRequest } from '../models/poste-measure-catalog.model';
import { PosteType } from '../shared/enums/ticket.enum';

@Injectable({ providedIn: 'root' })
export class PosteCatalogService {
  private apiUrl = `${environment.apiUrl}/poste-catalog`;

  constructor(private http: HttpClient) {}

  listAll(includeInactive = false): Observable<PosteMeasureCatalog[]> {
    let params = new HttpParams();
    if (includeInactive) {
      params = params.set('includeInactive', 'true');
    }
    return this.http.get<PosteMeasureCatalog[]>(this.apiUrl, { params });
  }

  getByPosteType(posteType: PosteType, includeInactive = false): Observable<PosteMeasureCatalog[]> {
    let params = new HttpParams();
    if (includeInactive) {
      params = params.set('includeInactive', 'true');
    }
    return this.http.get<PosteMeasureCatalog[]>(`${this.apiUrl}/${posteType}`, { params });
  }

  getMeasuresByPosteType(posteType: PosteType, includeInactive = false): Observable<PosteMeasureCatalog[]> {
    let params = new HttpParams();
    if (includeInactive) {
      params = params.set('includeInactive', 'true');
    }
    return this.http.get<PosteMeasureCatalog[]>(`${this.apiUrl}/${posteType}/measures`, { params });
  }

  create(dto: CreatePosteMeasureCatalogRequest): Observable<PosteMeasureCatalog> {
    return this.http.post<PosteMeasureCatalog>(`${this.apiUrl}/measures`, dto);
  }

  update(id: number, dto: UpdatePosteMeasureCatalogRequest): Observable<PosteMeasureCatalog> {
    return this.http.put<PosteMeasureCatalog>(`${this.apiUrl}/measures/${id}`, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/measures/${id}`);
  }
}
