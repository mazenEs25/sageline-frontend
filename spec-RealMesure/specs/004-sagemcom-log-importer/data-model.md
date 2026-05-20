# Phase 1 — Data Model: Sagemcom Log Importer (Frontend)

**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Contract**: [contracts/log-importer-api.md](./contracts/log-importer-api.md) | **Date**: 2026-05-15

All frontend models below mirror the backend DTOs **one-to-one** (Constitution VI). Field names, types, and nullability match the contract document character-for-character. Any deviation observed during implementation is a contract drift bug — fix the backend DTO, not the frontend model.

---

## 1. `LogImportReport`

**File**: `src/app/models/log-import-report.model.ts`
**Mirrors**: backend `LogImportReportDTO` (see contract §1, §2).

| Field | Type | Nullable | Notes |
|---|---|---|---|
| `detectedFormat` | `LogFormat` (string union `'BNFT' \| 'BWC' \| 'BTF'`) | no | Header-sniffed by the parser strategy. |
| `totalParsed` | `number` | no | Total measure entries the parser extracted (sum of matched + skipped + unmatched). |
| `matched` | `MatchedMeasure[]` | no, may be empty | Rows that will be persisted on `importLog`. |
| `skipped` | `SkippedMeasure[]` | no, may be empty | Rows discarded because the ticket already has a measure with the same `measureCode` (Q1 of clarifications, 2026-05-15). |
| `unmatched` | `UnmatchedMeasure[]` | no, may be empty | Rows where no `PosteMeasureCatalog` template was found (after alias-table fallback). |
| `warnings` | `string[]` | no, may be empty | Non-fatal parser notes (unit fallback, missing-unit in catalog, etc.). |

**Invariant**: `totalParsed === matched.length + skipped.length + unmatched.length`. The dialog asserts this and surfaces a `console.warn` if violated (defensive — should never happen if the backend honors the contract).

---

## 2. `MatchedMeasure`

**File**: `src/app/models/matched-measure.model.ts`
**Mirrors**: backend `MatchedMeasureDTO`.

| Field | Type | Nullable | Notes |
|---|---|---|---|
| `measureCode` | `string` | no | E.g. `POWER_RMS_AVG_VSA1_ANT3_5670`. |
| `label` | `string` | no | Catalog label (human-readable). |
| `value` | `number` | no | Parsed measured value. |
| `unit` | `string` | no | Unit string from the catalog (overrides log unit when both differ — a warning is added in that case). |
| `status` | `MeasureStatus` (existing enum) | no | Computed by the backend from `[lower, upper]`. Frontend renders via the existing `MeasureStatusBadge`. |
| `lower` | `number` | no | Catalog lower bound. |
| `upper` | `number` | no | Catalog upper bound. |
| `templateId` | `number` | no | FK to the matched `PosteMeasureCatalog` template. |

**Notes on rendering**:
- Reuses `MeasureStatus` from `src/app/shared/enums/measure-status.enum.ts` — no new enum.
- Bounds display: `[{{ lower }}, {{ upper }}] {{ unit }}` in a monospace cell using `JetBrains Mono`.

---

## 3. `UnmatchedMeasure`

**File**: `src/app/models/unmatched-measure.model.ts`
**Mirrors**: backend `UnmatchedMeasureDTO`.

| Field | Type | Nullable | Notes |
|---|---|---|---|
| `measureCode` | `string` | no | The raw code parsed from the log. |
| `reason` | `string` | no | Human-readable explanation. Backend canonical reasons: `"No matching template in {posteType} catalog"`, `"Alias matched but template missing"`, `"Catalog entry exists but for a different posteType"`. |

---

## 4. `SkippedMeasure`

**File**: `src/app/models/skipped-measure.model.ts`
**Mirrors**: backend `SkippedMeasureDTO`.

| Field | Type | Nullable | Notes |
|---|---|---|---|
| `measureCode` | `string` | no | The code that already exists on the ticket. |
| `existingValue` | `number \| null` | yes | The measure's current `measuredValue` (may be null if `status === NOT_EXECUTED`). |
| `existingStatus` | `MeasureStatus` | no | Current status on the ticket. |
| `incomingValue` | `number` | no | The value the log proposed (informational only — not persisted). |

**Behavior**: rows in this section are read-only. The "Confirm import" action does NOT touch them. They exist purely to make the skip-on-conflict policy auditable in the UI.

---

## 5. `LogSourceSnippet`

**File**: `src/app/models/log-source-snippet.model.ts`
**Mirrors**: backend `LogSourceSnippetDTO` (see contract §4).

| Field | Type | Nullable | Notes |
|---|---|---|---|
| `filename` | `string` | no | Original uploaded filename (e.g. `bwc-gateway-safran-wifi5g.log`). |
| `snippet` | `string` | no | Multi-line raw log text covering the parsed measure. Newlines preserved. |
| `lineRange` | `string` | yes | Optional, e.g. `"42-58"`. When present, dialog renders subtitle `"lines 42–58"`. |

---

## 6. Service contract on `ValidationMeasureService`

Three new methods on the existing service (no new service file):

```ts
previewLog(validationId: number, file: File): Observable<LogImportReport>;
importLog(validationId: number, file: File): Observable<LogImportReport>;
getSourceSnippet(validationId: number, measureId: number): Observable<LogSourceSnippet>;
```

**Multipart body shape** (both `previewLog` and `importLog`):

```ts
const body = new FormData();
body.append('file', file, file.name);
return this.http.post<LogImportReport>(`${this.apiUrl}/${validationId}/preview-log`, body);
```

Do NOT set `Content-Type` — let the browser supply the boundary header (research §R-004).

**Error propagation**: services pass `HttpErrorResponse` through (no `catchError` in the service); the dialog component handles UI mapping via `MessageService`.

---

## 7. `LogImportDialog` component state

**File**: `src/app/pages/Ticket/log-import-dialog/log-import-dialog.component.ts`

```ts
@Input() ticketId!: number;
@Input() posteType!: string;          // forwarded to "Add to catalog" deep-link
@Input() visible = false;
@Output() visibleChange = new EventEmitter<boolean>();
@Output() importSucceeded = new EventEmitter<number[]>(); // persisted measure IDs

private droppedFile: File | null = null;
report: LogImportReport | null = null;
loading = false;
submitting = false;
fileError: string | null = null;
```

State transitions:

- **idle** → user drops file → if invalid set `fileError`, stay idle. If valid, set `droppedFile`, transition to **previewing**.
- **previewing** (`loading = true`) → backend responds → set `report`, clear `loading`, transition to **previewed**.
- **previewed** → user clicks "Re-preview after fixes" → re-enter **previewing** with same `droppedFile`.
- **previewed** → user clicks "Confirm import" (`submitting = true`) → backend responds → emit `(importSucceeded)` with `matched[].id` array → set `visible = false`, reset all state.
- Any transition can be aborted by closing the dialog; state resets.

---

## 8. `LogSourceDialog` component state

**File**: `src/app/pages/Ticket/log-source-dialog/log-source-dialog.component.ts`

```ts
@Input() ticketId!: number;
@Input() measureId!: number | null;   // null when closed
@Input() visible = false;
@Output() visibleChange = new EventEmitter<boolean>();

snippet: LogSourceSnippet | null = null;
loading = false;
error: string | null = null;
```

`ngOnChanges` triggers `getSourceSnippet(ticketId, measureId)` when `measureId` becomes non-null and `visible` is true.

---

## 9. Relationships to existing models

- `ValidationMeasure.sourceLogFile` (existing field, already present in `src/app/models/validation-measure.model.ts:23`) is the **trigger** for the paperclip column in `MeasurePanel`. No new field on `ValidationMeasure`.
- `MeasureStatus` enum (existing) is reused in `MatchedMeasure.status` and `SkippedMeasure.existingStatus`. No new enum.
- `Role` enum (existing `src/app/shared/enums/role.ts`) is read by the ticket-detail page to gate import-button visibility and by `LogImportDialog` to gate the "Add to catalog" action.

No DB-side or backend-side changes are required by the frontend. All entity mutations happen on the backend in response to `importLog`.

---

**Status**: data model frozen. Cross-reference with `contracts/log-importer-api.md` before implementing.
