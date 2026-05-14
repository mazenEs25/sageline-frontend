# Data Model: ValidationMeasure Refactor — Frontend (Phase 002)

**Date**: 2026-05-14
**Spec**: [spec.md](./spec.md)
**Contract**: [contracts/validation-measure-api.md](./contracts/validation-measure-api.md)

Frontend TypeScript models that mirror, one-to-one, the backend response and request DTOs delivered by the parallel Spring Boot project (Constitution VI). No field renames, no derived fields, no client-side recomputation (R6).

---

## 1. `ValidationMeasure` (response model)

File: `src/app/models/validation-measure.model.ts`

```typescript
import { MeasureCategory } from '../shared/enums/measure-category.enum';
import { MeasureStatus } from '../shared/enums/measure-status.enum';

export interface ValidationMeasure {
  id: number;
  validationId: number;                 // FK reference to the ticket; backend returns id only
  catalogTemplateId: number | null;     // null for ad-hoc measures
  measureCode: string;                  // e.g. "POWER_RMS_AVG_VSA1"
  measureLabel: string;                 // human-readable
  category: MeasureCategory;            // POWER / VOLTAGE / CURRENT / FREQUENCY / TIME / TEMPERATURE / PER / RSSI / EVM / OTHER
  measuredValue: number | null;         // null ⇒ status=NOT_EXECUTED
  unit: string;                         // "dBm", "mA", "V", ...
  lowerBound: number;
  upperBound: number;
  status: MeasureStatus;                // OK / OUT_OF_RANGE / NOT_EXECUTED
  antenna: string | null;               // optional industrial context
  frequencyMhz: number | null;
  modulationScheme: string | null;
  deviationPct: number;                 // server-computed; 0..N (can exceed 100)
  measuredAt: string;                   // ISO-8601 UTC
  enteredById: number;                  // FK to user
  enteredByUsername: string;            // denormalized for table render
  sourceLogFile: string | null;         // populated by Phase 004; null at this phase
}
```

### Field rules

| Field | Constraint | Notes |
|---|---|---|
| `id` | unique, immutable | server-assigned |
| `validationId` | FK to ticket | immutable after create |
| `catalogTemplateId` | nullable | non-null ⇒ catalog-backed; null ⇒ ad-hoc |
| `measureCode` | non-empty string | snapshotted from template at create time so deletes of templates do not orphan rows |
| `measuredValue` | nullable | null implies status MUST be `NOT_EXECUTED` |
| `lowerBound` | numeric | MUST be < `upperBound`; both stored on the row even when catalog-backed (snapshot) |
| `upperBound` | numeric | see above |
| `status` | enum | server-computed from `measuredValue` and bounds; client never recomputes (R6) |
| `deviationPct` | numeric ≥ 0 | server-computed; visual progress bar caps at 100% but numeric label shows true value |
| `antenna` / `frequencyMhz` / `modulationScheme` | nullable | populated for RF measures, null otherwise |
| `measuredAt` | ISO-8601 | server-set on each update |
| `enteredById` / `enteredByUsername` | non-null | server-set from JWT |
| `sourceLogFile` | nullable | reserved for Phase 004 importer; UI checks `!= null` to show the paperclip icon |

### Relationships

```
Validation (ticket, FK validationId)
  └── ValidationMeasure 1..N
       └── (optional) PosteMeasureCatalog template (FK catalogTemplateId)
```

### State / status mapping

| `measuredValue` | within `[lowerBound, upperBound]` | `status` |
|---|---|---|
| null | n/a | `NOT_EXECUTED` |
| number | true | `OK` |
| number | false | `OUT_OF_RANGE` |

The frontend renders status via `MeasureStatusBadge` consuming `MEASURE_STATUS_COLORS` / `MEASURE_STATUS_ICONS` from `shared/enums/measure-status.enum.ts` (delivered in Phase 001). No inline color tables.

---

## 2. `CreateValidationMeasureRequest`

File: `src/app/models/create-validation-measure.dto.ts`

```typescript
import { MeasureCategory } from '../shared/enums/measure-category.enum';

export interface CreateValidationMeasureRequest {
  /** Required when creating from a catalog template; omit for ad-hoc measures. */
  catalogTemplateId?: number;

  /** Required for ad-hoc measures, ignored when catalogTemplateId is provided
   *  (server snapshots from the template). */
  measureCode?: string;
  measureLabel?: string;
  category?: MeasureCategory;
  unit?: string;
  lowerBound?: number;
  upperBound?: number;
  antenna?: string;
  frequencyMhz?: number;
  modulationScheme?: string;

  /** The measured value. May be null/omitted at create time
   *  (the row will be created as NOT_EXECUTED). */
  measuredValue?: number | null;
}
```

### Validation rules (client-side, before submit)

- If `catalogTemplateId` is set, all other catalog-snapshot fields MUST be omitted.
- If `catalogTemplateId` is NOT set (ad-hoc), then `measureCode`, `measureLabel`, `category`, `unit`, `lowerBound`, `upperBound` are required, and `lowerBound < upperBound`.
- `measuredValue` if provided MUST be a finite number.

---

## 3. `UpdateValidationMeasureRequest`

File: `src/app/models/update-validation-measure.dto.ts`

```typescript
export interface UpdateValidationMeasureRequest {
  /** New measured value. `null` resets the row to NOT_EXECUTED. */
  measuredValue: number | null;
}
```

Only `measuredValue` is editable post-create. Bounds / unit / category / context are snapshots and immutable; editing them requires deleting and re-creating the row (intentional — preserves audit trail integrity).

---

## 4. `BatchValidationMeasureRequest` & `BatchValidationMeasureResponse`

For the bulk-create and bulk-update endpoints. Shape captured here for the service layer; reflected in `contracts/validation-measure-api.md`.

```typescript
export interface BatchCreateValidationMeasureRequest {
  items: CreateValidationMeasureRequest[];
}

export interface BatchUpdateValidationMeasureRequest {
  /** Sparse array keyed by measure id. */
  items: { id: number; measuredValue: number | null }[];
}

export interface BatchValidationMeasureResponseItem {
  index: number;                         // position in the request array
  status: 'ok' | 'error';
  measure?: ValidationMeasure;           // present when status='ok'
  error?: { code: string; message: string }; // present when status='error'
}

export interface BatchValidationMeasureResponse {
  results: BatchValidationMeasureResponseItem[];
  summary: { succeeded: number; failed: number };
}
```

### Partial-success contract (R2)

The endpoint MUST return HTTP 200 even when some rows fail. The per-row `status` discriminates. `BulkEditMeasureDialog` walks `results[]`, marks failed rows by `index`, and surfaces `summary` in the closing toast.

---

## 5. Enum re-use (no new enums in this phase)

| Enum | Source | Used here for |
|---|---|---|
| `MeasureCategory` | `shared/enums/measure-category.enum.ts` (Phase 001) | row icon, ad-hoc dialog dropdown |
| `MeasureStatus` | `shared/enums/measure-status.enum.ts` (Phase 001) | `MeasureStatusBadge`, panel filter |
| `Role` | `shared/enums/role.ts` (existing) | every role gate in this phase |

No new enums are introduced. The companion `*_LABELS` / `*_COLORS` / `*_ICONS` maps from Phase 001 are reused as-is.

---

## 6. Component-internal state shapes (not persisted)

These are local view-models — not part of the contract, listed for clarity.

```typescript
// MeasurePanel
interface MeasurePanelState {
  measures: ValidationMeasure[];
  statusFilter: 'ALL' | MeasureStatus;
  sortBy: 'measureCode' | 'category' | 'status' | 'deviationPct';
  sortDirection: 'asc' | 'desc';
  bulkEditMode: boolean;
  loading: boolean;
}

// BulkEditMeasureDialog
interface BulkEditRow {
  measure: ValidationMeasure;
  draftValue: number | null;
  saving: boolean;
  errorMessage: string | null;
}
```

---

## 7. Refresh contract

After every successful mutation (R10), the consumer calls `ValidationMeasureService.list(validationId)` and replaces the panel's `measures` array. No in-place patching. No optimistic UI.

---

## 8. Removed / deprecated shapes

| Removed from UI | Replaced by | Notes |
|---|---|---|
| `ValidationResult` model | `ValidationMeasure` | Old model is no longer imported by any new component. The shim service maps legacy responses into `ValidationMeasure` for any caller still using `ValidationResultService`. |
| `expectedValue: number` | `lowerBound: number` + `upperBound: number` | Constitution II. |
| `conform: boolean` | `status: MeasureStatus` | Constitution III. |
