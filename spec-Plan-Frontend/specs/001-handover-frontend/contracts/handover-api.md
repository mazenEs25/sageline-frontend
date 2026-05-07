# API Contract: Handover Endpoints

**Base URL**: `http://localhost:8089/api/handovers`
**Auth**: Bearer JWT (auto-attached by Keycloak interceptor)
**Feature**: 001-handover-frontend

All endpoints are implemented and tested on the backend. This document defines the
Angular `HandoverService` method signatures and the corresponding HTTP calls.

---

## Endpoints

### POST `/initiate/{validationId}`
**Roles**: TECH_VAL, ADMIN_IT
**Angular method**: `initiateHandover(validationId: number, body: HandoverInitiateRequest)`
**Request body**:
```json
{ "handoverNote": "string", "progressSummary": "string" }
```
**Response**: `HandoverResponse`
**Used by**: `HandoverInitiateDialogComponent`

---

### POST `/{handoverId}/accept`
**Roles**: TECH_VAL, CHEF_SECTEUR, ADMIN_IT
**Angular method**: `acceptHandover(handoverId: number)`
**Request body**: `{}` (empty)
**Response**: `HandoverResponse`
**Used by**: `HandoverAcceptPanelComponent`

---

### PATCH `/{handoverId}/assign`
**Roles**: CHEF_SECTEUR, ADMIN_IT
**Angular method**: `assignHandover(handoverId: number, techId: number)`
**Request body**:
```json
{ "techId": 42 }
```
**Response**: `HandoverResponse`
**Used by**: `HandoverBannerComponent` (CHEF_SECTEUR view), `HandoverQueuePanelComponent`

---

### PATCH `/{handoverId}/cancel`
**Roles**: CHEF_SECTEUR, ADMIN_IT
**Angular method**: `cancelHandover(handoverId: number)`
**Request body**: `{}` (empty)
**Response**: `HandoverResponse`
**Used by**: `HandoverQueuePanelComponent`

---

### GET `/pending`
**Roles**: CHEF_SECTEUR, ADMIN_IT
**Angular method**: `getPendingHandovers()`
**Response**: `HandoverResponse[]`
**Used by**: `HandoverQueuePanelComponent` (initial load)

---

### GET `/validation/{validationId}`
**Roles**: All authenticated roles
**Angular method**: `getHandoverHistory(validationId: number)`
**Response**: `HandoverResponse[]` (all handovers for this ticket, any status)
**Used by**: `HandoverTimelineComponent`, `HandoverAcceptPanelComponent`

---

## Angular Service Signature

```typescript
// src/app/services/handover.service.ts
@Injectable({ providedIn: 'root' })
export class HandoverService {
  private apiUrl = `${environment.apiUrl}/handovers`;

  constructor(private http: HttpClient) {}

  initiateHandover(validationId: number, body: HandoverInitiateRequest): Observable<HandoverResponse>;
  acceptHandover(handoverId: number): Observable<HandoverResponse>;
  assignHandover(handoverId: number, techId: number): Observable<HandoverResponse>;
  cancelHandover(handoverId: number): Observable<HandoverResponse>;
  getPendingHandovers(): Observable<HandoverResponse[]>;
  getHandoverHistory(validationId: number): Observable<HandoverResponse[]>;
}
```

---

## Error Handling Convention

All methods use the Angular `HttpClient` error path. Components catch errors via:
```typescript
.subscribe({
  next: (res) => { /* success */ },
  error: (err) => {
    this.messageService.add({
      severity: 'error',
      summary: 'Erreur',
      detail: err.error?.message || 'Une erreur est survenue'
    });
  }
})
```
`MessageService` must be provided at the component level (add to `providers: [MessageService]`
in the component decorator) or via the root `AppComponent`'s `p-toast`.
