# Contract: Workflow Readiness REST + WebSocket API (Phase 003)

**Consumed by**: Angular frontend at `src/app/services/ticket.service.ts` (HTTP) and `src/app/services/web-socket.service.ts` (STOMP).
**Provided by**: Spring Boot backend (sibling project), branch `003-workflow-guard`.
**HTTP base URL**: `${environment.apiUrl}` → `http://localhost:8089/api`
**STOMP base URL**: `http://localhost:8089/ws` (SockJS).
**Auth**: Bearer JWT auto-attached by `keycloak-angular` interceptor (existing) for HTTP. STOMP CONNECT frame carries the bearer per existing `WebSocketService` wiring.

This document is the **frozen contract** the frontend Phase 003 deliverables consume. Backend tasks live in the sibling backend project; this file is the integration boundary.

---

## 1. Get readiness for a ticket

```
GET /api/validations/{validationId}/readiness
GET /api/validations/{validationId}/readiness?targetStatus=EN_REVUE
```

**Roles**: any authenticated user with ticket-read access (`ADMIN_IT`, `CHEF_SECTEUR`, `EXPERT`, `TECH_VAL`, `TECH_PREP`, `RESPONSABLE`). The bar is informational.

**Query parameters**:

| Name | Required | Notes |
|---|---|---|
| `targetStatus` | optional | When omitted, the backend computes readiness for the default next-status transition from the ticket's current status (Phase 003 only implements `EN_COURS → EN_REVUE`). |

**Response 200**:

```json
{
  "ticketId": 142,
  "currentStatus": "EN_COURS",
  "targetStatus": "EN_REVUE",
  "mandatoryTotal": 16,
  "mandatoryFilled": 14,
  "mandatoryMissing": 2,
  "missingMeasures": [
    {
      "measureCode": "POWER_RMS_AVG_VSA1_ANT3_5670",
      "label": "RMS average power (VSA1 ANT3 5670 MHz)",
      "required": true,
      "catalogTemplateId": 91
    },
    {
      "measureCode": "POWER_PEAK_AVG_VSA2_ANT1_5500",
      "label": "Peak average power (VSA2 ANT1 5500 MHz)",
      "required": true,
      "catalogTemplateId": 92
    }
  ],
  "outOfRangeMeasures": [
    {
      "measureId": 4225,
      "measureCode": "POWER_RMS_AVG_VSA1_ANT1_5500",
      "label": "RMS average power (VSA1 ANT1 5500 MHz)",
      "measuredValue": 20.0,
      "unit": "dBm",
      "lowerBound": 13.5,
      "upperBound": 16.5,
      "deviationPct": 433.33
    }
  ],
  "canTransition": false,
  "blockingReasons": [
    "2 mandatory measures still in NOT_EXECUTED state"
  ]
}
```

**Errors**:

- `404` — ticket id unknown.
- `403` — caller lacks ticket-read access (handled by the existing global interceptor).

---

## 2. Submit a ticket for review — guarded

```
PATCH /api/validations/{validationId}/submit-review
```

**Roles**: `ADMIN_IT`, `CHEF_SECTEUR`, `TECH_VAL` (unchanged from pre-Phase-003).

**Request body**: none (the existing endpoint takes no body; Phase 003 does not change this).

**Response 200**: the updated `Validation` resource (existing shape; not redefined here).

**Response 422 — guard blocked**:

```json
{
  "ticketId": 142,
  "currentStatus": "EN_COURS",
  "targetStatus": "EN_REVUE",
  "mandatoryTotal": 16,
  "mandatoryFilled": 14,
  "mandatoryMissing": 2,
  "missingMeasures": [ ... ],
  "outOfRangeMeasures": [ ... ],
  "canTransition": false,
  "blockingReasons": [
    "2 mandatory measures still in NOT_EXECUTED state"
  ]
}
```

The 422 body is exactly the `WorkflowReadiness` shape from §1. The frontend's `TicketService.submitReview(...)` transforms this into a typed `WorkflowReadinessBlockedError` per data-model §2.

**Other errors**:

- `403` — caller lacks the transition role.
- `409` — ticket is not in `EN_COURS` (existing status-machine error; unchanged).
- `5xx` — surfaces as a normal `HttpErrorResponse`; the page shows a generic error toast.

---

## 3. WebSocket readiness topic

**Topic**: `/topic/validation/{validationId}/readiness`

**Trigger**: backend pushes a new readiness snapshot on every successful insert, update, or delete of a `ValidationMeasure` belonging to the given validation (whether the mutation is HTTP-driven or, in Phase 004, log-import-driven).

**Payload shape**: identical to the §1 response body.

**Client subscription**: `TicketDetailComponent` calls `webSocketService.subscribe('/topic/validation/{id}/readiness', payload => ...)` on `ngOnInit` and the existing service handles deduplication and reconnect. Bursts are debounced at 200 ms client-side (research R3).

**Backpressure / ordering**: the backend may collapse rapid bursts into one push; the frontend always trusts the **latest** payload received (no merge logic). No sequence numbers are required by this contract.

---

## 4. Out of scope for this contract

- Other transitions (`PREP_VALIDEE → EN_COURS`, `EN_REVUE → CONFORME/NON_CONFORME`) — those guards arrive in later phases and may extend or version this contract; for now `?targetStatus=` only meaningfully accepts `EN_REVUE`.
- `Deprecation` header semantics — this endpoint is net-new; no deprecation path applies.
- Verdict / conformity payloads — Phase 005.
- AI risk annotations on missing measures — out of scope per Constitution X.

---

## 5. Frozen as of 2026-05-15

This contract is the integration boundary between the backend and frontend tracks of Phase 003. Any change to field names, types, nullability, or HTTP status codes invalidates the frontend test fixtures in `ticket.service.spec.ts` and `workflow-readiness-bar.component.spec.ts` and requires coordinated updates on both sides.
