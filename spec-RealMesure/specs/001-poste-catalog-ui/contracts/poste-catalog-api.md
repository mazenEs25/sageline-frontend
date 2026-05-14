# Contract: Poste Catalog API (consumed by the frontend)

**Feature**: 001-poste-catalog-ui
**Direction**: Frontend → Backend (Spring Boot at `http://localhost:8089/api`)
**Status**: Frozen for Phase 001 — any change here is a backend amendment, not a frontend
workaround.

All endpoints require a Keycloak JWT (auto-attached by `keycloak-angular`'s bearer interceptor).
Roles enforced server-side as specified per endpoint; the frontend additionally hides/disables
unauthorized actions per constitution XII.

Base path: `/api/poste-catalog`.

---

## GET `/api/poste-catalog`

List every catalog entry across all poste types.

**Query params**

| Name | Type | Default | Notes |
|---|---|---|---|
| `includeInactive` | boolean | `false` | When `true`, soft-deleted rows are included. |

**Response 200** — `PosteMeasureCatalog[]` (see `data-model.md`).

**Errors**: `401` (no token), `403` (unauthorized realm role).

**Allowed realm roles**: any authenticated user with any of
`ADMIN_IT | CHEF_SECTEUR | EXPERT | RESPONSABLE | TECH_VAL | TECH_PREP` — read is broad so
downstream phases (Phase 002, 004) can also call it.

---

## GET `/api/poste-catalog/{posteType}`

Full catalog of one poste type. `{posteType}` is a `PosteType` enum value.

**Response 200** — `PosteMeasureCatalog[]` (filtered to the given `posteType`).

**Response 200 with empty array** — valid; the poste type has no templates yet.

**Errors**: `400` if `{posteType}` is not a recognized enum value; `401`/`403`.

Note: the frontend treats this endpoint as the per-page data source after the user picks a poste
type in the filter dropdown.

---

## GET `/api/poste-catalog/{posteType}/measures`

Alias / projection returning only the measures for the given poste type. Functionally equivalent
to the previous endpoint for this phase; reserved by Plan.md for future projection differences
(e.g., joining category metadata).

**Query params**: `includeInactive` (same semantics).

**Response 200** — `PosteMeasureCatalog[]`.

**Frontend usage**: This is the actual endpoint the catalog page calls when a poste type is
selected. (`GET /api/poste-catalog` is used only on initial load to know which poste types have
data, and is optional — the frontend can also lazy-load via this endpoint per selection.)

---

## POST `/api/poste-catalog/measures`

Create a new measure template.

**Allowed realm roles**: `ADMIN_IT`, `CHEF_SECTEUR`.

**Request body** — `CreatePosteMeasureCatalogRequest`:

```json
{
  "posteType": "WIFI_CONDUIT",
  "measureCode": "POWER_RMS_AVG_VSA1_ANT3_5670",
  "measureLabel": "Power RMS Average – Antenna 3 – 5670 MHz",
  "category": "POWER",
  "defaultUnit": "dBm",
  "defaultLowerBound": 13.5,
  "defaultUpperBound": 16.5,
  "mandatory": true,
  "displayOrder": 12,
  "antenna": "ANT3",
  "frequencyMhz": 5670,
  "modulationScheme": null
}
```

**Response 201** — `PosteMeasureCatalog` (the created row with assigned `id`, `active: true`).

**Errors**:
- `400` — validation failure (missing fields, `lowerBound >= upperBound`, etc.).
- `403` — caller lacks the required role.
- `409` — duplicate `(posteType, measureCode)`. Body should include a machine-readable hint:
  ```json
  { "error": "DUPLICATE_MEASURE_CODE", "field": "measureCode", "message": "..." }
  ```
  Frontend surfaces this as a `measureCode` field error.

---

## PUT `/api/poste-catalog/measures/{id}`

Update an existing template. `posteType` and `measureCode` are NOT in the body and cannot be
changed; the row stays identifiable by its unique key.

**Allowed realm roles**: `ADMIN_IT`, `CHEF_SECTEUR`.

**Request body** — `UpdatePosteMeasureCatalogRequest` (see `data-model.md`).

**Response 200** — `PosteMeasureCatalog` (the updated row).

**Errors**: `400` (validation), `403`, `404` (id not found).

---

## DELETE `/api/poste-catalog/measures/{id}`

Soft-delete (sets `active = false`).

**Allowed realm roles**: `ADMIN_IT`, `CHEF_SECTEUR` (clarification A2).

**Response 204** — empty body.

**Errors**: `403`, `404`.

Idempotency: deleting an already-inactive row returns `204` (no-op). The frontend refreshes the
table regardless.

---

## Error envelope (all endpoints)

The Spring Boot side returns errors via the project's existing `ApiErrorResponse` shape (already
in use by `UserService`, `TicketService`, etc.). The frontend's existing toast helper accepts
this shape unchanged; no new handler is introduced.

```json
{
  "timestamp": "2026-05-13T10:15:30Z",
  "status": 409,
  "error": "DUPLICATE_MEASURE_CODE",
  "message": "A measure with code ... already exists for posteType WIFI_CONDUIT",
  "path": "/api/poste-catalog/measures",
  "field": "measureCode"
}
```

---

## Service signature (frontend wrapper)

`src/app/services/poste-catalog.service.ts` — shape:

```ts
@Injectable({ providedIn: 'root' })
export class PosteCatalogService {
  private apiUrl = `${environment.apiUrl}/poste-catalog`;
  constructor(private http: HttpClient) {}

  listAll(includeInactive = false): Observable<PosteMeasureCatalog[]>;
  getByPosteType(posteType: PosteType, includeInactive = false): Observable<PosteMeasureCatalog[]>;
  getMeasuresByPosteType(posteType: PosteType, includeInactive = false): Observable<PosteMeasureCatalog[]>;
  create(dto: CreatePosteMeasureCatalogRequest): Observable<PosteMeasureCatalog>;
  update(id: number, dto: UpdatePosteMeasureCatalogRequest): Observable<PosteMeasureCatalog>;
  delete(id: number): Observable<void>;
}
```

Implementation pattern matches `PhaseService` (HttpClient, `environment.apiUrl`, typed
`Observable<...>`). `HttpParams` used for `includeInactive` to keep URL hygiene.
