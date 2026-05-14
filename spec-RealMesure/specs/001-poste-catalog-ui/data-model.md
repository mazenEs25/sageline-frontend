# Phase 1 — Data Model (Frontend)

**Feature**: 001-poste-catalog-ui
**Date**: 2026-05-13
**Scope**: TypeScript models, DTOs, and enums introduced on the frontend. Field names and
nullability mirror the backend response DTOs 1:1 (constitution VI).

---

## Enum: `PosteType` (existing — reused)

**File**: `src/app/shared/enums/ticket.enum.ts` (already declared)

```ts
export type PosteType =
  | 'ACC' | 'TEST_FONCTIONNEL' | 'WIFI_CONDUIT' | 'WIFI_RY'
  | 'BANC_RX_TX' | 'BANC_SENSI' | 'BANC_TT' | 'BANC_TX'
  | 'AQ_LIGNE' | 'TELECHARGEMENT' | 'BANC_NFT' | 'BANC_NFT_BOUTON'
  | 'TEST_BOUTON' | 'TEST_VISION' | 'TEST_DOCSIS' | 'TEST_SYNCHRO_GPON'
  | 'BANC_AUDIO_VIDEO' | 'BANC_WIFI_CONDUIT' | 'BPO' | 'FSOS'
  | 'BANC_ETANCHEITE' | 'BANC_ACOUSTIQUE';
```

**New** export added in the same file (or a dedicated helper if preferred):

```ts
export const POSTE_TYPE_VALUES: PosteType[] = [
  'ACC','TEST_FONCTIONNEL','WIFI_CONDUIT','WIFI_RY',
  'BANC_RX_TX','BANC_SENSI','BANC_TT','BANC_TX',
  'AQ_LIGNE','TELECHARGEMENT','BANC_NFT','BANC_NFT_BOUTON',
  'TEST_BOUTON','TEST_VISION','TEST_DOCSIS','TEST_SYNCHRO_GPON',
  'BANC_AUDIO_VIDEO','BANC_WIFI_CONDUIT','BPO','FSOS',
  'BANC_ETANCHEITE','BANC_ACOUSTIQUE',
];
```

Used by the filter dropdown (FR-008).

---

## Enum: `MeasureCategory` (new)

**File**: `src/app/shared/enums/measure-category.enum.ts`

```ts
export type MeasureCategory =
  | 'POWER' | 'VOLTAGE' | 'CURRENT' | 'FREQUENCY' | 'TIME'
  | 'TEMPERATURE' | 'PER' | 'RSSI' | 'EVM' | 'OTHER';

export const MEASURE_CATEGORY_LABELS: Record<MeasureCategory, string> = {
  POWER: 'Puissance', VOLTAGE: 'Tension', CURRENT: 'Courant',
  FREQUENCY: 'Fréquence', TIME: 'Temps', TEMPERATURE: 'Température',
  PER: 'PER', RSSI: 'RSSI', EVM: 'EVM', OTHER: 'Autre',
};

export const MEASURE_CATEGORY_COLORS: Record<MeasureCategory, string> = {
  POWER: 'warning', VOLTAGE: 'info', CURRENT: 'info',
  FREQUENCY: 'help', TIME: 'secondary', TEMPERATURE: 'danger',
  PER: 'warning', RSSI: 'help', EVM: 'warning', OTHER: 'secondary',
};

export const MEASURE_CATEGORY_ICONS: Record<MeasureCategory, string> = {
  POWER: 'pi pi-bolt', VOLTAGE: 'pi pi-chart-line', CURRENT: 'pi pi-sliders-h',
  FREQUENCY: 'pi pi-wave-pulse', TIME: 'pi pi-clock',
  TEMPERATURE: 'pi pi-sun', PER: 'pi pi-percentage',
  RSSI: 'pi pi-wifi', EVM: 'pi pi-chart-bar', OTHER: 'pi pi-tag',
};
```

---

## Enum: `MeasureStatus` (new — declared here, consumed by Phase 002)

**File**: `src/app/shared/enums/measure-status.enum.ts`

```ts
export type MeasureStatus = 'OK' | 'OUT_OF_RANGE' | 'NOT_EXECUTED';

export const MEASURE_STATUS_LABELS: Record<MeasureStatus, string> = {
  OK: 'Conforme', OUT_OF_RANGE: 'Hors tolérance', NOT_EXECUTED: 'Non exécuté',
};

export const MEASURE_STATUS_COLORS: Record<MeasureStatus, string> = {
  OK: 'success', OUT_OF_RANGE: 'danger', NOT_EXECUTED: 'secondary',
};

export const MEASURE_STATUS_ICONS: Record<MeasureStatus, string> = {
  OK: 'pi pi-check-circle',
  OUT_OF_RANGE: 'pi pi-times-circle',
  NOT_EXECUTED: 'pi pi-minus-circle',
};
```

> Not consumed by the catalog UI itself except for the icon set; reserved for the Phase 002
> `MeasurePanel`. Declared here per Plan.md phase split.

---

## Response model: `PosteMeasureCatalog`

**File**: `src/app/models/poste-measure-catalog.model.ts`

```ts
import { PosteType } from '../shared/enums/ticket.enum';
import { MeasureCategory } from '../shared/enums/measure-category.enum';

export interface PosteMeasureCatalog {
  id: number;
  posteType: PosteType;
  measureCode: string;            // unique per posteType
  measureLabel: string;
  category: MeasureCategory;
  defaultUnit: string;            // 'dBm' | 'mA' | 'V' | 'VRms' | 'dB' | 'W' | '°C' | '%' | 'MHz' | 's' | ...
  defaultLowerBound: number;
  defaultUpperBound: number;
  mandatory: boolean;
  displayOrder: number;
  antenna: string | null;         // e.g. 'ANT3' or null
  frequencyMhz: number | null;
  modulationScheme: string | null;
  active: boolean;
}
```

### Validation rules (frontend, FR-013)

| Field | Rule |
|---|---|
| `measureCode` | Required; trimmed; non-empty after trim; pattern `^[A-Z0-9_]+$` (industrial code convention). |
| `measureLabel` | Required; trimmed; non-empty. |
| `category` | Required; one of `MeasureCategory`. |
| `defaultUnit` | Required; trimmed; non-empty. |
| `defaultLowerBound` | Required; finite number. |
| `defaultUpperBound` | Required; finite number; **must be `> defaultLowerBound`**. |
| `mandatory` | Required; boolean. |
| `displayOrder` | Required; integer `≥ 0`. |
| `antenna` | Optional; if present, non-empty trimmed string. |
| `frequencyMhz` | Optional; if present, finite number `≥ 0`. |
| `modulationScheme` | Optional; non-empty trimmed string if present. |

### Uniqueness

`(posteType, measureCode)` — enforced server-side (HTTP `409` on violation). Frontend surfaces
this as a field-level error on `measureCode`.

### Lifecycle

`active = true` on create. `DELETE` flips it to `false` (soft-delete). No hard-delete in this
phase. Updates preserve `active`.

---

## Request DTOs

```ts
// src/app/models/poste-measure-catalog.model.ts (same file)

export interface CreatePosteMeasureCatalogRequest {
  posteType: PosteType;
  measureCode: string;
  measureLabel: string;
  category: MeasureCategory;
  defaultUnit: string;
  defaultLowerBound: number;
  defaultUpperBound: number;
  mandatory: boolean;
  displayOrder: number;
  antenna?: string | null;
  frequencyMhz?: number | null;
  modulationScheme?: string | null;
}

export interface UpdatePosteMeasureCatalogRequest {
  // posteType NOT editable on update (locked per spec FR-012)
  measureLabel: string;
  category: MeasureCategory;
  defaultUnit: string;
  defaultLowerBound: number;
  defaultUpperBound: number;
  mandatory: boolean;
  displayOrder: number;
  antenna?: string | null;
  frequencyMhz?: number | null;
  modulationScheme?: string | null;
}
```

> `measureCode` is **not** in the update DTO either: it is part of the uniqueness key and is
> immutable once created. UX: the edit dialog renders `measureCode` as a read-only field.

---

## Entity-level relationships (downstream — informational)

- `Validation` (Phase 002) `1 ─ N` `ValidationMeasure` `N ─ 1` `PosteMeasureCatalog` (nullable FK
  for ad-hoc measures). Not modeled on the frontend in this phase.
- `ValidationZone` (existing) carries a `posteType` field; ticket-create (Phase 002) will look up
  the catalog for that poste type to seed `NOT_EXECUTED` measures. Out of scope here.

---

## State diagram

```text
       create (POST)
            │
            ▼
       ┌─────────┐   update (PUT, code locked)
       │ active  │ ◀──────────────────────────────┐
       └────┬────┘                                │
            │ delete (DELETE → soft-delete)       │
            ▼                                     │
       ┌──────────┐    (no restore endpoint       │
       │ inactive │     in this phase — surfaced  │
       └──────────┘     via includeInactive=true) │
```

No restore endpoint is part of Phase 001. If it becomes required, it is a Phase 001 backend
amendment with a corresponding plan revision.
