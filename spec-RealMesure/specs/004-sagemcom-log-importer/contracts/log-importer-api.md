# Contract: Sagemcom Log Importer REST API (Phase 004)

**Consumed by**: Angular frontend at `src/app/services/validation-measure.service.ts`.
**Provided by**: Spring Boot backend (sibling project), branch `004-log-importer`.
**HTTP base URL**: `${environment.apiUrl}` → `http://localhost:8089/api`
**Auth**: Bearer JWT auto-attached by `keycloak-angular` interceptor.

This document is the **frozen contract** that the frontend Phase 004 deliverables consume. Backend implementation lives in the sibling backend project; this file is the integration boundary the frontend is allowed to assume.

---

## 1. Preview a log file (dry-run)

```
POST /api/validations/{validationId}/preview-log
Content-Type: multipart/form-data; boundary=...
Part: file=<binary .log or .txt>
```

**Roles**: `ADMIN_IT`, `TECH_VAL`, `TECH_PREP` (same as `import-log`). The backend enforces; the frontend hides the entry button for other roles (Constitution XII).

**Request**: multipart with a **single** part named `file`. Filename is preserved by the backend for source-snippet retrieval.

**Response 200** (`LogImportReportDTO`):

```json
{
  "detectedFormat": "BWC",
  "totalParsed": 18,
  "matched": [
    {
      "measureCode": "POWER_RMS_AVG_VSA1",
      "label": "RMS power, VSA1, avg",
      "value": 15.52,
      "unit": "dBm",
      "status": "OK",
      "lower": 14.0,
      "upper": 17.0,
      "templateId": 142
    }
  ],
  "skipped": [
    {
      "measureCode": "POWER_PEAK_AVG_VSA1",
      "existingValue": 16.4,
      "existingStatus": "OK",
      "incomingValue": 16.2
    }
  ],
  "unmatched": [
    {
      "measureCode": "SCRATCH_TEST",
      "reason": "No matching template in WIFI_CONDUIT catalog"
    }
  ],
  "warnings": [
    "Measure RX_GAIN_2G has no unit in catalog; using log unit dB"
  ]
}
```

**Side effects**: NONE. The endpoint does not persist measures, does not store the uploaded file, does not modify any ticket. A second `preview-log` call against the same file MUST return an identical body (modulo wall-clock fields, of which this DTO has none).

**Errors**:

| Status | Body shape | Frontend behavior |
|---|---|---|
| 400 | `{ "error": "INVALID_FILE", "message": "..." }` | Toast: severity `error`, summary "Parse failed", detail = `message`. Dialog stays open with `report = null`. |
| 400 | `{ "error": "UNSUPPORTED_FORMAT", "message": "..." }` | Same as INVALID_FILE — dialog surfaces the message and offers "Try another file". |
| 403 | empty / Spring default | Toast: "Access denied". Dialog closes. (Should not happen because UI hides the button — defensive.) |
| 404 | empty / Spring default | Toast: "Ticket not found". Dialog closes. |
| 413 | Spring multipart-size body | Toast: "File too large on the server". (Frontend already enforces 10 MB but server may be tighter.) |
| 5xx | any | Toast: "Importer service error". Dialog stays open. |

---

## 2. Import a log file (persist)

```
POST /api/validations/{validationId}/import-log
Content-Type: multipart/form-data; boundary=...
Part: file=<binary .log or .txt>
```

**Roles**: `ADMIN_IT`, `TECH_VAL`, `TECH_PREP`.

**Behavior**: Same parsing logic as `preview-log`. **Persists** every entry in `matched[]` as a new `ValidationMeasure` with:
- `validationId` ← path variable
- `measureCode`, `measureLabel`, `unit`, `lowerBound`, `upperBound`, `measuredValue`, `status` ← from the matched DTO + catalog template
- `catalogTemplateId` ← `templateId`
- `sourceLogFile` ← server-side persisted filename (e.g. `storage/logs/{validationId}/{originalName}`)
- `enteredById` ← caller's user ID (from JWT → `users/me` → DB ID)
- `enteredByUsername` ← caller's username
- `measuredAt` ← server now (ISO-8601 UTC)

Entries in `skipped[]` are **NOT** persisted (Q1 of clarifications, 2026-05-15). Entries in `unmatched[]` are **NOT** persisted. The uploaded file is stored on the backend regardless (so later `source-snippet` calls can find it).

**Response 200**: identical shape to `LogImportReportDTO` (§1). The frontend reads `matched[].id` if backend includes IDs on the matched DTOs in this endpoint **only** (preview endpoint omits IDs because nothing was persisted).

> **Contract note**: backend MUST populate `matched[].id` in the import response so the frontend can emit `(importSucceeded)` with the array of persisted measure IDs (used by `MeasurePanel.reload()` consumers for optimistic highlighting). The preview response MUST omit `matched[].id` to make accidental conflation impossible.

**Errors**: same matrix as §1, plus:

| Status | Body shape | Frontend behavior |
|---|---|---|
| 409 | `{ "error": "TICKET_STATUS_LOCKED", "message": "..." }` | Toast: "Ticket is closed — no edits allowed". Dialog closes. (Defensive — UI already disables the button for closed tickets.) |
| 422 | `{ "error": "CATALOG_MISMATCH", "message": "..." }` | Toast: "Catalog mismatch — import refused". Dialog stays open. |

---

## 3. Get source snippet for a measure

```
GET /api/validations/{validationId}/measures/{measureId}/source-snippet
```

**Roles**: any authenticated user with ticket-read access (same as `GET /api/validations/{id}/measures`).

**Response 200** (`LogSourceSnippetDTO`):

```json
{
  "filename": "bwc-gateway-safran-wifi5g.log",
  "snippet": "Mesure <POWER_RMS_AVG_VSA1> : RMS power, VSA1, avg - Status 0\n   14.0 dBm  <  ...  <  17.0   15.52 dBm\n",
  "lineRange": "142-143"
}
```

**Errors**:

| Status | Frontend behavior |
|---|---|
| 404 | Render dialog with error message: "Source snippet not available for this measure". |
| 410 | Same: "Source log no longer available on the server". |
| 5xx | Toast: "Could not load source snippet". Dialog closes. |

---

## 4. Field reference for `LogImportReportDTO`

Authoritative field list — frontend models in `src/app/models/` MUST match field-for-field (Constitution VI).

```text
LogImportReportDTO {
  detectedFormat : string  // one of "BNFT" | "BWC" | "BTF"
  totalParsed    : int
  matched        : MatchedMeasureDTO[]
  skipped        : SkippedMeasureDTO[]
  unmatched      : UnmatchedMeasureDTO[]
  warnings       : string[]
}

MatchedMeasureDTO {
  id          : long?      // present only in import-log response, omitted in preview-log
  measureCode : string
  label       : string
  value       : double
  unit        : string
  status      : string     // one of "OK" | "OUT_OF_RANGE" | "NOT_EXECUTED"
  lower       : double
  upper       : double
  templateId  : long
}

SkippedMeasureDTO {
  measureCode    : string
  existingValue  : double?
  existingStatus : string  // one of "OK" | "OUT_OF_RANGE" | "NOT_EXECUTED"
  incomingValue  : double
}

UnmatchedMeasureDTO {
  measureCode : string
  reason      : string
}

LogSourceSnippetDTO {
  filename  : string
  snippet   : string
  lineRange : string?      // optional, "<startLine>-<endLine>"
}
```

---

## 5. Backend invariants the frontend depends on

1. `totalParsed === matched.length + skipped.length + unmatched.length`.
2. Header sniffing is deterministic: same log file → same `detectedFormat` every call.
3. `preview-log` is idempotent and side-effect-free.
4. `import-log` is **NOT** idempotent — calling it twice persists the matched set twice (but the second call's matched entries will all flow into `skipped[]` because they now conflict). The dialog disables "Confirm import" after the first successful submit to make this UX-safe.
5. The uploaded filename is preserved on `import-log` and used as the value of `ValidationMeasure.sourceLogFile`.
6. `source-snippet` for a measure created via `import-log` always returns a non-empty `snippet` (it is generated at import time and persisted alongside the measure, not regenerated on read).

---

**Status**: contract frozen for the frontend track of Phase 004. Drift detected during implementation MUST be resolved by amending the backend DTOs or this document — not by silently divergent frontend models.
