# Research: ValidationMeasure Refactor — Frontend (Phase 002)

**Date**: 2026-05-14
**Spec**: [spec.md](./spec.md)

All open questions raised by `/speckit-specify` and `/speckit-clarify` are resolved below. Zero `NEEDS CLARIFICATION` markers remain.

---

## R1 — Role authorization matrix for measure mutation

**Decision**: Mutate (Add catalog-backed, Bulk edit, Delete row, Instantiate all): `TECH_VAL`, `TECH_PREP`, `CHEF_SECTEUR`, `ADMIN_IT`. Read-only: `EXPERT`, `RESPONSABLE`. Add ad-hoc (non-catalog) measure is further restricted to `CHEF_SECTEUR`, `ADMIN_IT`.

**Rationale**: Matches the role taxonomy in the root `CLAUDE.md` (Ticket workflow domain). `EXPERT` is a verdict authority (arrives in Phase 005), not a measurement entrant — keeping them read-only on measures preserves separation of duty. Ad-hoc bypasses catalog normalization, which carries audit risk; restricting it to supervisors mirrors the Phase 001 catalog admin role set and prevents unnormalized codes from leaking into Phase 006 KPI aggregations.

**Alternatives considered**:
- Letting `EXPERT` enter measures: rejected — conflates measurement and verdict authority and is unsupported by the current ticket-detail role gating.
- Splitting create/edit/delete across roles (technician creates, supervisor edits/deletes): rejected — adds three role-gate branches without observable UX benefit at this phase.
- Forbidding ad-hoc entirely: rejected — keeps a safety valve when the catalog lags behind reality, and the cost of supporting it is low because the underlying create endpoint is shared.

---

## R2 — Bulk-edit failure semantics

**Decision**: Partial success. Successful rows are persisted and exit edit mode; failed rows stay in edit mode with an inline error per cell; the closing toast reports `X saved, Y failed`. The user can correct only the failed cells and re-submit.

**Rationale**: Industrial measure batches often contain one transient validation error (typo, comma vs. dot) out of many rows. Forcing the user to re-type 9 correct rows because of 1 wrong row is hostile UX. PrimeNG bulk-edit patterns already support per-cell error markers natively. Matches spec US4 #3.

**Alternatives considered**:
- All-or-nothing transactional batch: rejected — see above.
- Client-side validate-all-first: rejected — does not help with server-only validation (e.g., catalog template referential integrity) and duplicates server logic.

**Contract implication**: The backend batch endpoint MUST return a per-row result array (`{ index, status: "ok"|"error", error?: "..." }`) so the UI can mark each row. Recorded in `contracts/validation-measure-api.md`.

---

## R3 — Ad-hoc measure role gating

**Decision**: `CHEF_SECTEUR`, `ADMIN_IT` only. Technicians see only the catalog-backed "Add measure" dialog.

**Rationale**: See R1 — ad-hoc bypasses Phase 001 normalization. Aligns ad-hoc creation authority with catalog-admin authority. The KPI phase (006) groups by `measureCode`; non-normalized codes from ad-hoc creation are a long-tail aggregation risk best contained by reducing the set of authors.

**Alternatives considered**:
- Same role set as catalog-backed entry: rejected — see above.
- Forbid in this phase: rejected — would block legitimate one-off supervisor measurements.

---

## R4 — Concurrent edit conflict resolution

**Decision**: Last-write-wins for Phase 002. After the user's save succeeds, the UI compares the row's pre-save `measuredAt` snapshot with the post-save value; if they differ by more than a few seconds, a non-blocking toast warns "Your save overwrote a change by <user> at <time>." No version/ETag field is required from the backend.

**Rationale**: The data model does not include an optimistic-concurrency `version` column at this phase. Adding one would force a coordinated backend change that is out of scope. Concurrent edits on the same measure row are extremely rare in practice (a single technician owns a station at a time). Telemetry from a later phase can revisit this choice.

**Alternatives considered**:
- Optimistic concurrency with `version` field: deferred — defensible upgrade if real conflicts are observed.
- Pessimistic UI lock via WebSocket presence: rejected — too heavy for an unobserved problem, and Phase 003's WebSocket infrastructure is not yet wired for measure-level events.

---

## R5 — Filter and sort persistence across navigation

**Decision**: Filter (status) and sort (column + direction) are component-local state, lost on navigation away and reset on each ticket open. No URL-param or `localStorage` persistence in this phase.

**Rationale**: Low-impact preference; not raised by the user, no spec requirement. Adding URL params would tangle with the upcoming Phase 003 readiness-bar drill-down (which will append its own params). Deferring this avoids early coupling.

**Alternatives considered**:
- URL query-params (`?status=OUT_OF_RANGE&sortBy=deviation`): rejected for this phase — see above. Easy to add later if asked.
- `localStorage` (per-user remembered preference): rejected — adds key-namespace concerns and storage cleanup duties.

---

## R6 — Frontend deviation recomputation

**Decision**: The frontend does **not** recompute `status` or `deviationPct`. Both are populated by the backend and rendered as-is.

**Rationale**: Centralizing the deviation formula on the backend eliminates drift between frontend and backend logic. The deviation formula in Plan.md §7 is explicit and lives in the backend `MeasureDeviationCalculator` service. Constitution VI (mirroring) — the response DTO carries both fields.

**Alternatives considered**:
- Frontend recompute as a hedge against stale data: rejected — would mask backend bugs and create two sources of truth.

---

## R7 — Legacy `ValidationResultService` shim shape

**Decision**: Keep the file `validation-result.service.ts` with its public method signatures intact. Each public method:
1. Emits `console.warn('[deprecated] ValidationResultService.<name> — migrate to ValidationMeasureService')`.
2. Calls the new endpoint via `ValidationMeasureService` first.
3. On HTTP 404, falls back to the legacy `/api/validation-results` URL via `HttpClient`.
4. Maps legacy response shape to the new model so existing callers compile without source edits.

The shim is **not** deleted in this phase. Removal is recorded as a dated task in Phase 005's plan per Constitution VIII.

**Rationale**: The constitution requires the deprecated path to keep responding for at least one phase. The shim plus the `Deprecation: true` header are the joint enforcement mechanism. Console warning is the developer-facing signal; the optional UI banner is shown only when the panel falls back to legacy data (which should never happen in normal operation).

**Alternatives considered**:
- Delete `ValidationResultService` immediately: rejected — violates Constitution VIII.
- Keep the old service untouched and let new code use both: rejected — creates two sources of truth, defeats the "encourages migration" purpose.

---

## R8 — Auto-seeding on ticket creation

**Decision**: After a successful ticket-create, the `TicketCreateComponent` fires one call to a backend bulk-seed endpoint (`POST /api/validations/{id}/measures/from-catalog`) that, given a ticket id, instantiates the entire `PosteMeasureCatalog` for its zone PosteType as `NOT_EXECUTED` measures. If the backend exposes only the single-template endpoint, the frontend falls back to forking N parallel `from-template/{id}` requests using `forkJoin`, but this fallback is reported as a TODO on the Phase 002 backend track.

**Rationale**: One round trip is observably faster (SC-003: under 2 seconds for 30 templates), and matches the spec's "in one click" wording. The single bulk endpoint is the preferred contract.

**Alternatives considered**:
- Frontend loops `POST` per template synchronously: rejected — N round trips for 30 measures violate SC-003 over typical LAN latencies.
- Seed lazily on first user interaction with the measure panel: rejected — surprises users and complicates the Phase 003 readiness bar (which needs the full catalog to compute `mandatoryTotal`).

---

## R9 — `MeasureUnitPipe` formatting rules

**Decision**: The pipe accepts `(value: number | null, unit: string | null)` and outputs:
- `null` value → empty string (not "N/A" — keep cells visually empty for `NOT_EXECUTED`).
- Otherwise → `${value.toFixed(2)} ${unit ?? ''}`, trimmed. `2` decimal places by default.
- Optional second arg `digits` overrides decimals: `value | measureUnit:unit:3`.

**Rationale**: Two decimals match the precision in supervisor logs (`15.52 dBm`, `35.53 mA`). Numeric values are stored as `number` in TypeScript; rounding for display only. Empty rendering on null avoids visual noise on `NOT_EXECUTED` rows where the bounds and status already convey the state.

**Alternatives considered**:
- `Intl.NumberFormat` with locale: rejected — industrial logs use `.` decimal separator regardless of locale; adding locale-awareness here invites mismatches with the source.
- Showing `—` placeholder for null: rejected — adds a glyph that competes with the `NOT_EXECUTED` badge.

---

## R10 — Refresh strategy after mutations

**Decision**: After every successful single-create, batch-create, single-update, bulk-update, single-delete, instantiate-all, the panel re-fetches the full measure list for the ticket via `ValidationMeasureService.list(ticketId)`. No optimistic UI; no partial in-place patching beyond what the server confirmed.

**Rationale**: Re-fetch is one request, ≤ 30 rows, server is local — under 200 ms in typical conditions. Eliminates an entire class of "stale field after partial update" bugs. Phase 003's WebSocket readiness push will later replace the explicit refresh path for cross-user events; the explicit refresh remains valid as the per-user-action contract.

**Alternatives considered**:
- Optimistic in-place patch from request body + computed status: rejected — frontend cannot compute `status`/`deviationPct` reliably (see R6); would diverge from backend on edge cases.
- Server-Sent Events / WebSocket push for measure events: deferred to Phase 003 readiness pattern; out of scope here.

---

## R11 — Toast and error UX library

**Decision**: Reuse the existing PrimeNG `MessageService` + `<p-toast>` already wired in `LayoutComponent`. No new toast pipeline. Errors from `HttpClient` propagate via the existing global interceptor; this phase adds no new interceptor.

**Rationale**: Constitution XI — no new UI library, no parallel design system. The existing toast handles success/error consistently across the app.

---

## R12 — Unit-test scope and conventions

**Decision**: Karma + Jasmine. Specs colocated with sources. Coverage targets for this phase:
- `ValidationMeasureService`: every public method, `Deprecation` header detection, fallback-to-legacy 404 path.
- `MeasurePanel`: rendering for each of the three statuses, deviation band coloring at boundary values (33%, 75%, 150%), role-gated action visibility for two roles (TECH_VAL allowed, RESPONSABLE hidden).
- `MeasureStatusBadge`: snapshot for each of the three statuses.
- `DeviationProgress`: snapshot for each of the three color bands and the overflow case (>100%).
- `MeasureUnitPipe`: null, zero, integer, decimal, missing unit, custom digits.

**Rationale**: This is the first phase where verdict-relevant rendering ships (Constitution III). The bar is intentionally higher than Phase 001's "deliberately minimal" stance.

**Alternatives considered**:
- Skipping `MeasurePanel` component spec to save time: rejected — verdict rendering is on the critical-path constitution surface.
- Adding e2e (Playwright/Cypress): rejected — no e2e harness exists in the repo today; introducing one is out of scope.
