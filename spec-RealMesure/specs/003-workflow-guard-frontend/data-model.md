# Data Model: Workflow Guard — Frontend (Phase 003)

**Date**: 2026-05-15
**Spec**: [spec.md](./spec.md)
**Contract**: [contracts/workflow-readiness-api.md](./contracts/workflow-readiness-api.md)

Frontend TypeScript shapes that mirror, one-to-one, the backend `WorkflowReadinessDTO` delivered by the parallel Spring Boot project (Constitution VI). No field renames, no derived fields, no client-side recomputation of `canTransition`.

---

## 1. `WorkflowReadiness` (response model and WS push payload)

File: `src/app/models/workflow-readiness.model.ts`

```typescript
import { TicketStatus } from '../shared/enums/ticket-status.enum';

export interface WorkflowReadinessMissingMeasure {
  measureCode: string;          // e.g. "POWER_RMS_AVG_VSA1_ANT3_5670"
  label: string;                // human-readable
  required: boolean;            // always true on this list; included for symmetry with backend DTO
  catalogTemplateId: number | null; // null when the underlying template was deleted
}

export interface WorkflowReadinessOutOfRangeMeasure {
  measureId: number;            // the existing ValidationMeasure id
  measureCode: string;
  label: string;
  measuredValue: number;
  unit: string;
  lowerBound: number;
  upperBound: number;
  deviationPct: number;
}

export interface WorkflowReadiness {
  ticketId: number;
  currentStatus: TicketStatus;          // typically EN_COURS
  targetStatus: TicketStatus;           // typically EN_REVUE
  mandatoryTotal: number;               // >= 0
  mandatoryFilled: number;              // 0..mandatoryTotal
  mandatoryMissing: number;             // mandatoryTotal - mandatoryFilled
  missingMeasures: WorkflowReadinessMissingMeasure[];
  outOfRangeMeasures: WorkflowReadinessOutOfRangeMeasure[];
  canTransition: boolean;               // SOLE source of truth for Submit-button enable
  blockingReasons: string[];            // human-readable, e.g. "2 mandatory measures still in NOT_EXECUTED state"
}
```

### Field rules

| Field | Constraint | Notes |
|---|---|---|
| `ticketId` | numeric, must match the open ticket | bar ignores updates whose `ticketId` differs |
| `currentStatus` / `targetStatus` | `TicketStatus` enum | Phase 003 only emits readiness for `EN_COURS → EN_REVUE`; other targets are out of scope |
| `mandatoryTotal` | `>= 0` | `0` ⇒ neutral gray empty-catalog state (FR-007) |
| `mandatoryFilled` | `0..mandatoryTotal` | drives the percentage; never `>` total |
| `mandatoryMissing` | `mandatoryTotal - mandatoryFilled` | redundant, included to mirror DTO and avoid arithmetic in templates |
| `missingMeasures` | length `<= mandatoryMissing` | backend may cap the array length; the bar still trusts `mandatoryMissing` for counts |
| `outOfRangeMeasures` | length `>= 0` | OUT_OF_RANGE measures contribute to blockers only if the backend's policy says so (currently they do not block `EN_COURS → EN_REVUE`, but the panel still surfaces them so users can fix-then-submit) |
| `canTransition` | boolean | **the only field the Submit button reads**; never recomputed client-side |
| `blockingReasons` | array of strings | shown verbatim in the toast on a 422; not parsed |

### Relationships

```
Validation (ticket)
  └── readiness (computed) 1..1
       ├── missingMeasures 0..N  (PosteMeasureCatalog templates not yet instantiated as ValidationMeasure)
       └── outOfRangeMeasures 0..N (ValidationMeasure rows with status=OUT_OF_RANGE)
```

### State mapping for the bar

| Inputs | Visual state |
|---|---|
| `null` (not yet loaded) | Skeleton placeholder; Submit disabled, label "Loading…" |
| `mandatoryTotal === 0` | Neutral gray bar, text "No mandatory measures defined for this zone"; Submit disabled (per backend `canTransition`) |
| `canTransition === true` and `mandatoryTotal > 0` | Green band; bar at 100%; Submit enabled with standard label |
| `canTransition === false` and `pct >= 50` | Amber band; Submit disabled with label `Submit for review (filled/total)` |
| `canTransition === false` and `pct < 50` | Red band; Submit disabled with label `Submit for review (filled/total)` |

`pct = (mandatoryFilled / mandatoryTotal) * 100` rounded to nearest integer for display, exact ratio for CSS fill (R6).

### WS-paused indicator (independent of the WorkflowReadiness payload)

`WorkflowReadinessBar` accepts `@Input() wsConnected: boolean` and renders a `live updates paused` chip when the connection has been `false` continuously for **≥ 5 seconds** (R4). The chip is independent of the readiness payload; the bar continues to render the last-known readiness during a pause.

---

## 2. `WorkflowReadinessBlockedError` (typed error)

File: `src/app/services/ticket.service.ts` (colocated; not a standalone file)

```typescript
export class WorkflowReadinessBlockedError extends Error {
  readonly name = 'WorkflowReadinessBlockedError';
  constructor(readonly readiness: WorkflowReadiness) {
    super(readiness.blockingReasons?.[0] ?? 'Workflow transition blocked');
  }
}
```

### Transform rule

`TicketService.submitReview(ticketId).pipe(catchError(...))` MUST:

1. If `err instanceof HttpErrorResponse && err.status === 422 && err.error?.canTransition === false`,
   `throwError(() => new WorkflowReadinessBlockedError(err.error as WorkflowReadiness))`.
2. Otherwise rethrow the original error unchanged.

Consumers discriminate with `instanceof WorkflowReadinessBlockedError`; they never inspect `HttpErrorResponse.status` for this path (R5).

---

## 3. `TicketService` extension

File: `src/app/services/ticket.service.ts` (modify in place)

```typescript
// added method
getReadiness(
  ticketId: number,
  targetStatus?: TicketStatus,
): Observable<WorkflowReadiness> {
  let params = new HttpParams();
  if (targetStatus) {
    params = params.set('targetStatus', targetStatus);
  }
  return this.http.get<WorkflowReadiness>(
    `${environment.apiUrl}/validations/${ticketId}/readiness`,
    { params },
  );
}
```

The existing `submitReview(ticketId)` is wrapped with the `catchError` from §2. No other public methods change.

---

## 4. WebSocket payload (`/topic/validation/{id}/readiness`)

**Shape**: identical to `WorkflowReadiness` above. The frontend does NOT decode a distinct message envelope — `WebSocketService.subscribe('/topic/validation/{id}/readiness', payload => ...)` already hands us the parsed JSON body.

**Subscription lifecycle**:
- Subscribe on `TicketDetailComponent.ngOnInit` after route params resolve.
- `WebSocketService` deduplicates topic subscriptions internally (existing behavior); a navigation that returns to the same ticket re-uses the live subscription.
- Unsubscribe on `ngOnDestroy`.
- Bursts are absorbed via `auditTime(200)` on the receiving Subject (R3).

---

## 5. Component-internal state shapes (not persisted)

```typescript
// TicketDetailComponent (additions)
interface ReadinessUiState {
  readiness: WorkflowReadiness | null;   // null until first response
  wsConnected: boolean;
  lastBlockedToastAt: number;             // epoch ms; R11
  sidePanelOpen: boolean;
}

// WorkflowReadinessBar inputs / outputs
interface WorkflowReadinessBarInputs {
  readiness: WorkflowReadiness | null;
  wsConnected: boolean;
}
interface WorkflowReadinessBarOutputs {
  panelToggleRequested: void;             // user clicked the bar
  refreshRequested: void;                 // user clicked the "Refresh readiness" tooltip link
}

// WorkflowReadinessPanel inputs / outputs
interface WorkflowReadinessPanelInputs {
  visible: boolean;
  readiness: WorkflowReadiness | null;
}
interface WorkflowReadinessPanelOutputs {
  visibleChange: boolean;                                  // two-way binding for the PrimeNG Sidebar
  missingMeasureClicked: WorkflowReadinessMissingMeasure;
  outOfRangeMeasureClicked: WorkflowReadinessOutOfRangeMeasure;
}
```

---

## 6. Enum re-use (no new enums in this phase)

| Enum | Source | Used here for |
|---|---|---|
| `TicketStatus` | `shared/enums/ticket-status.enum.ts` (existing) | `currentStatus` / `targetStatus` typing on the model; readonly here |
| `MeasureStatus` | `shared/enums/measure-status.enum.ts` (Phase 001) | indirectly via Phase 002's `MeasureStatusBadge` when the side panel shows OUT_OF_RANGE rows |
| `Role` | `shared/enums/role.ts` (existing) | not used in this phase's new components; Submit-button role gating remains in the existing route data |

No new enums introduced.

---

## 7. Refresh contract

Readiness state is updated by exactly four paths:

1. **Initial load** — `ngOnInit` calls `ticketService.getReadiness(ticketId)`.
2. **WebSocket push** — subscription on `/topic/validation/{id}/readiness` replaces the state. Bursts debounced at 200 ms.
3. **Measure mutation fallback** — `MeasurePanel.measuresChanged` → `getReadiness(...)` (R10).
4. **Manual refresh** — `WorkflowReadinessBar.refreshRequested` → `getReadiness(...)` (FR-021).

The bar never polls on a timer (FR-021a).
