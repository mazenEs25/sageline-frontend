# Contract: ValidationMeasure REST API (Phase 002)

**Consumed by**: Angular frontend at `src/app/services/validation-measure.service.ts`
**Provided by**: Spring Boot backend (sibling project), branch `002-validation-measure-refactor`
**Base URL**: `${environment.apiUrl}` → `http://localhost:8089/api`
**Auth**: Bearer JWT auto-attached by `keycloak-angular` interceptor (existing).

This document is the **frozen contract** the frontend Phase 002 deliverables consume. Backend tasks live in the sibling backend project; this file is the integration boundary.

---

## 1. List measures for a ticket

```
GET /api/validations/{validationId}/measures
```

**Roles**: any authenticated user with ticket-read access (`ADMIN_IT`, `CHEF_SECTEUR`, `EXPERT`, `TECH_VAL`, `TECH_PREP`, `RESPONSABLE`).

**Response 200**:
```json
[
  {
    "id": 4201,
    "validationId": 142,
    "catalogTemplateId": 87,
    "measureCode": "POWER_RMS_AVG_VSA1",
    "measureLabel": "RMS average power (VSA1)",
    "category": "POWER",
    "measuredValue": 15.52,
    "unit": "dBm",
    "lowerBound": 13.5,
    "upperBound": 16.5,
    "status": "OK",
    "antenna": "ANT1",
    "frequencyMhz": 5500,
    "modulationScheme": null,
    "deviationPct": 33.33,
    "measuredAt": "2026-05-14T09:21:00Z",
    "enteredById": 12,
    "enteredByUsername": "tval.dupont",
    "sourceLogFile": null
  }
]
```

**Errors**: 404 if ticket id unknown.

---

## 2. Create a single measure

```
POST /api/validations/{validationId}/measures
Content-Type: application/json
```

**Roles**: `TECH_VAL`, `TECH_PREP`, `CHEF_SECTEUR`, `ADMIN_IT`.
For ad-hoc requests (no `catalogTemplateId`): restricted to `CHEF_SECTEUR`, `ADMIN_IT`. The server enforces both rules; 403 otherwise.

**Request — catalog-backed**:
```json
{ "catalogTemplateId": 87, "measuredValue": 15.52 }
```

**Request — ad-hoc**:
```json
{
  "measureCode": "AD_HOC_SCRATCH_42",
  "measureLabel": "One-off scratch test",
  "category": "OTHER",
  "unit": "V",
  "lowerBound": 1.0,
  "upperBound": 2.0,
  "measuredValue": 1.5
}
```

**Response 201**: full `ValidationMeasure` object (same shape as the list-element above).

**Errors**:
- 400 — payload validation (e.g., `lowerBound >= upperBound` on ad-hoc).
- 403 — caller lacks the role.
- 404 — ticket or template id unknown.
- 409 — `(validationId, measureCode)` collision when ad-hoc duplicates an existing row.

---

## 3. Update a single measure

```
PUT /api/validations/{validationId}/measures/{measureId}
Content-Type: application/json
```

**Roles**: `TECH_VAL`, `TECH_PREP`, `CHEF_SECTEUR`, `ADMIN_IT`.

**Request**:
```json
{ "measuredValue": 15.7 }
```

`measuredValue = null` resets the row to `NOT_EXECUTED`.

**Response 200**: full `ValidationMeasure` (server recomputes `status` and `deviationPct`).

**Errors**: 400 / 403 / 404 as above.

---

## 4. Delete a single measure

```
DELETE /api/validations/{validationId}/measures/{measureId}
```

**Roles**: `TECH_VAL`, `TECH_PREP`, `CHEF_SECTEUR`, `ADMIN_IT`.
**Response**: 204 No Content.
**Errors**: 403, 404.

---

## 5. Batch create

```
POST /api/validations/{validationId}/measures/batch
Content-Type: application/json
```

**Roles**: `TECH_VAL`, `TECH_PREP`, `CHEF_SECTEUR`, `ADMIN_IT`. Any item without `catalogTemplateId` requires `CHEF_SECTEUR` or `ADMIN_IT`.

**Request**:
```json
{
  "items": [
    { "catalogTemplateId": 87, "measuredValue": 15.52 },
    { "catalogTemplateId": 88, "measuredValue": 14.10 }
  ]
}
```

**Response 200** (partial success — see R2):
```json
{
  "results": [
    { "index": 0, "status": "ok",
      "measure": { "id": 4201, "...": "..." } },
    { "index": 1, "status": "error",
      "error": { "code": "OUT_OF_BOUNDS_INPUT",
                 "message": "measuredValue must be finite" } }
  ],
  "summary": { "succeeded": 1, "failed": 1 }
}
```

The endpoint MUST return 200 even when some rows fail. The frontend marks failed rows by `index`.

---

## 6. Batch update

```
PUT /api/validations/{validationId}/measures/batch
Content-Type: application/json
```

**Roles**: `TECH_VAL`, `TECH_PREP`, `CHEF_SECTEUR`, `ADMIN_IT`.

**Request**:
```json
{
  "items": [
    { "id": 4201, "measuredValue": 15.7 },
    { "id": 4202, "measuredValue": null }
  ]
}
```

**Response**: same shape as §5, partial-success semantics identical.

---

## 7. Instantiate one measure from a catalog template

```
POST /api/validations/{validationId}/measures/from-template/{templateId}
```

**Roles**: `TECH_VAL`, `TECH_PREP`, `CHEF_SECTEUR`, `ADMIN_IT`.

**Body**: empty.

**Response 201**: full `ValidationMeasure` with `measuredValue=null` and `status=NOT_EXECUTED`. `catalogTemplateId` and the snapshot fields are populated from the template.

**Errors**:
- 404 — template id unknown.
- 409 — template already instantiated on this ticket.

---

## 8. Bulk-seed the ticket from its zone catalog

```
POST /api/validations/{validationId}/measures/from-catalog
```

**Roles**: `TECH_VAL`, `TECH_PREP`, `CHEF_SECTEUR`, `ADMIN_IT`.
**Body**: empty.

**Response 201**:
```json
{
  "created": 16,
  "skipped": 0,
  "measures": [ /* full ValidationMeasure[] */ ]
}
```

Idempotent: rows already present (matched by `catalogTemplateId`) are skipped, not duplicated. Called automatically by the frontend after a successful ticket-create (R8).

**Errors**: 404 — ticket unknown or its zone has no catalog templates.

---

## 9. Legacy deprecated endpoint

```
GET  /api/validation-results?validationId=…
POST /api/validation-results
PUT  /api/validation-results/{id}
DEL  /api/validation-results/{id}
```

**Status**: deprecated by this phase, kept alive per Constitution VIII.
**Required response header on every response**: `Deprecation: true`.

The frontend `validation-result.service.ts` shim:
1. emits `console.warn` on every call;
2. attempts the equivalent new endpoint first;
3. falls back to the legacy URL on HTTP 404 only;
4. maps legacy `{ parameter, measuredValue, expectedValue, conform }` shape to `ValidationMeasure` for any remaining caller.

Removal of the shim and the legacy endpoint is scheduled in Phase 005's plan, not in this phase.

---

## 10. Error envelope

All non-2xx responses follow the existing global envelope shape (consistent with the rest of the API):

```json
{
  "timestamp": "2026-05-14T09:25:00Z",
  "status": 400,
  "error": "Bad Request",
  "code": "MEASURE_BOUNDS_INVALID",
  "message": "lowerBound must be strictly less than upperBound",
  "path": "/api/validations/142/measures"
}
```

The frontend surfaces `message` in the dialog inline error area; `code` is preserved for telemetry.

---

## 11. Notes on contract stability

- Field names, nullability, and types in §1 are **frozen** for this phase. Any divergence is a backend contract break and blocks the frontend.
- Adding optional response fields (e.g., a future `version` for optimistic concurrency in a later phase) is backward compatible and allowed.
- Removing or renaming fields requires bumping this contract's section and updating the frontend models in lockstep.
