import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ProductionLine, ProductionLineRequest } from '../models/production-line.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProductionLineService {
  private url = `${environment.apiUrl}/lines`;

  constructor(private http: HttpClient) { }

  getAll(): Observable<ProductionLine[]> {
    return this.http.get<ProductionLine[]>(this.url);
  }

  getById(id: number): Observable<ProductionLine> {
    return this.http.get<ProductionLine>(`${this.url}/${id}`);
  }

  create(line: ProductionLineRequest): Observable<ProductionLine> {
    return this.http.post<ProductionLine>(this.url, line);
  }

  update(id: number, line: ProductionLineRequest): Observable<ProductionLine> {
    return this.http.put<ProductionLine>(`${this.url}/${id}`, line);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  getActive(): Observable<ProductionLine[]> {
    return this.http.get<ProductionLine[]>(`${this.url}/active`);
  }

  activate(id: number): Observable<ProductionLine> {
    return this.http.patch<ProductionLine>(`${this.url}/${id}/activate`, {});
  }

  deactivate(id: number): Observable<ProductionLine> {
    return this.http.patch<ProductionLine>(`${this.url}/${id}/deactivate`, {});
  }
  getByPhase(phaseId: number): Observable<ProductionLine[]> {
    return this.http.get<ProductionLine[]>(`${this.url}/phase/${phaseId}`);
  }

  getBySecteur(secteurId: number): Observable<ProductionLine[]> {
    return this.http.get<ProductionLine[]>(`${this.url}/secteur/${secteurId}`);
  }
}