# Feature Specification: ValidationMeasure Refactor — Frontend

**Feature Branch**: `002-validation-measure-frontend`
**Created**: 2026-05-14
**Status**: Draft
**Input**: User description: "Phase 002 — ValidationMeasure Refactor from plan.md (only the frontend side/deliverables; backend is handled in the companion backend project)"

## Clarifications

### Session 2026-05-14

- Q: Which roles may mutate measures (Add / Bulk edit / Instantiate all / Delete / Add ad-hoc) vs. read-only? → A: Mutate: `TECH_VAL`, `TECH_PREP`, `CHEF_SECTEUR`, `ADMIN_IT`. Read-only: `EXPERT`, `RESPONSABLE`.
- Q: How does bulk-edit handle per-row server validation failures? → A: Partial success — successful rows persist; failed rows stay in edit mode with inline error; toast reports `X saved, Y failed`.
- Q: Who may create ad-hoc (non-catalog) measures? → A: Restricted to `CHEF_SECTEUR` and `ADMIN_IT`; technicians see only the catalog-backed dialog.
- Q: How are concurrent edits on the same measure resolved? → A: Last-write-wins; after the user's save succeeds, the UI shows a non-blocking warning if the row was modified by someone else since it was loaded. No version field required from the backend in this phase.

## Overview

Phase 002 replaces the legacy generic "validation result" representation in the ticket UI with an industrial-grade bounded-tolerance measure schema. The frontend exposes per-measure status (OK / OUT_OF_RANGE / NOT_EXECUTED), tolerance bounds `[lowerBound, upperBound]`, deviation percentage, unit, and optional context (antenna, frequency, modulation), aligned with the backend `ValidationMeasure` contract being delivered by the parallel backend project.

This specification covers **only** the frontend deliverables of Phase 002 as described in `Plan.md §7`. Backend endpoints, migrations, and data-migration logic are out of scope here and consumed as contracts.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Inspect a ticket's measures with industrial context (Priority: P1)

A technician or expert opens any validation ticket and immediately sees, for every measure attached to the ticket, the normalized measure code, the value entered, the unit, the allowed tolerance range, a color-coded status badge, and a visual indicator of how far the value sits from the center of the tolerance window.

**Why this priority**: This is the foundational read-only experience. Without it, none of the other workflows (entry, bulk-edit, template instantiation, log import in later phases) have a place to surface their results. It is the minimum viable slice for the phase.

**Independent Test**: Open a ticket that already has measures persisted by the backend; verify each row shows code, value+unit, `[lower, upper]`, status badge (green / red / gray), and deviation progress bar (green 0–50%, amber 50–100%, red >100%). No mutation required.

**Acceptance Scenarios**:

1. **Given** a ticket with a measure where `measured = 15.5`, `lowerBound = 13.5`, `upperBound = 16.5`, **When** the user opens the ticket detail page, **Then** the row renders status `OK` with a green badge and a deviation progress bar at approximately 33% (green band).
2. **Given** a ticket with a measure where `measured = 20.0`, same bounds as above, **When** the user opens the ticket detail page, **Then** the row renders status `OUT_OF_RANGE` with a red badge and a deviation progress bar in the red band (>100%).
3. **Given** a ticket with a measure where `measured` is null (not yet entered), **When** the user opens the ticket detail page, **Then** the row renders status `NOT_EXECUTED` with a gray badge and no deviation bar.
4. **Given** a measure that carries antenna and frequency context (e.g., `ANT1 / 5500 MHz`), **When** the row is rendered, **Then** the measure-badge chip displays the antenna/frequency suffix next to the measure code.
5. **Given** the legacy "Results" panel previously existed on the ticket detail page, **When** the user navigates to that page after the refactor, **Then** the legacy panel is no longer present anywhere in the UI and is fully replaced by the new measure panel.

---

### User Story 2 - Add a measure from the zone's catalog (Priority: P1)

A technician adds a measure to a ticket by picking a template from the catalog of the ticket's zone PosteType. The dialog pre-fills the bounds, unit, category, and context fields; the user only types the measured value. The status and deviation are computed by the backend and reflected immediately in the table.

**Why this priority**: Manual entry from the catalog is the primary data-entry path for measures until Phase 004's log importer arrives. Without it, no human can produce industrial-grade measures.

**Independent Test**: From a ticket whose zone has a catalog of ≥1 template, open the "Add measure" dialog, select a template, enter a value, submit, and observe the new row appear in the measure panel with the correct status and deviation.

**Acceptance Scenarios**:

1. **Given** a ticket whose zone PosteType has a catalog of templates, **When** the user opens the "Add measure" dialog, **Then** the template dropdown lists only templates of that PosteType and is searchable by `measureCode` / label.
2. **Given** the user selects a template, **When** the dialog re-renders, **Then** the bounds, unit, category, antenna and frequency fields are pre-filled and read-only, and only `measuredValue` is editable.
3. **Given** the user submits a valid `measuredValue` within bounds, **When** the request succeeds, **Then** the dialog closes, a success toast appears, and the new measure row appears in the table with status `OK`.
4. **Given** the user submits a `measuredValue` outside bounds, **When** the request succeeds, **Then** the new row appears with status `OUT_OF_RANGE` and a red badge.
5. **Given** the backend returns a validation error (e.g., value not numeric), **When** the response is received, **Then** the dialog stays open and an inline error message is shown next to the offending field.

---

### User Story 3 - Seed the ticket with all template measures as NOT_EXECUTED (Priority: P2)

When a ticket is created or opened for the first time, the user can populate it in one click with the full set of catalog templates for its zone PosteType, each instantiated with status `NOT_EXECUTED`. This gives technicians a checklist of every measure they are expected to fill in.

**Why this priority**: Bulk-seeding is a productivity multiplier and a precondition for the workflow guard in Phase 003 to display a meaningful "filled X of Y" progress. Without it, the UI relies on the user manually adding each row.

**Independent Test**: From an empty ticket, click "Instantiate all template measures"; verify all catalog templates appear as `NOT_EXECUTED` rows. From a non-empty ticket, the action either merges or is disabled with an explanatory tooltip (see edge cases).

**Acceptance Scenarios**:

1. **Given** a ticket with zero measures, **When** the user clicks "Instantiate all template measures", **Then** every catalog template for the ticket's zone PosteType is created with status `NOT_EXECUTED` and rendered in the table.
2. **Given** a ticket that was just created via the ticket-create flow, **When** the creation completes, **Then** the frontend automatically calls the seeding endpoint so the user lands on a detail page that is already populated.
3. **Given** the seeding action is invoked twice in a row by mistake, **When** the second invocation runs, **Then** the user is informed that templates already exist on the ticket and no duplicate rows are created (the action is idempotent at the UI level by hiding/disabling itself when measures already exist).

---

### User Story 4 - Bulk-edit several measure values (Priority: P2)

A technician switches the measure panel into bulk-edit mode and updates several `measuredValue` cells in one session, then submits all changes at once. Each row's status and deviation update accordingly.

**Why this priority**: Industrial validation sessions frequently update many measures together. Submitting them one by one is slow and error-prone. Bulk edit shortens the demo loop and matches real plant workflows.

**Independent Test**: Enable bulk-edit mode on a ticket with ≥2 `NOT_EXECUTED` measures; edit values inline; submit; verify all affected rows update in a single round trip.

**Acceptance Scenarios**:

1. **Given** the measure panel is in read mode, **When** the user toggles "Bulk edit", **Then** the `measuredValue` cell of every editable row becomes an inline input and a "Save all" / "Cancel" pair appears.
2. **Given** the user edits N rows and clicks "Save all", **When** the request succeeds, **Then** all N rows refresh with the new value, status, and deviation, and a single success toast announces the count.
3. **Given** one of the N rows fails validation on the server, **When** the batch response is received, **Then** the failing row is visually marked and the user is told how many succeeded and how many failed; succeeded rows remain persisted.
4. **Given** the user clicks "Cancel" while in bulk-edit mode, **When** confirmed, **Then** all unsaved edits are discarded and the panel returns to read mode without making any request.

---

### User Story 5 - Add an ad-hoc measure outside the catalog (Priority: P3)

In rare cases (e.g., temporary tests, supervisor request), a user with the right role creates a measure that is not backed by a catalog template, manually entering code, label, category, unit, bounds, and value.

**Why this priority**: A safety valve for industrial reality. Most real workflows go through templates; this path is exceptional but must exist to avoid blocking the user when the catalog lags behind reality. Lower priority because Phase 001's catalog covers the common cases.

**Independent Test**: Open the "Add ad-hoc measure" advanced dialog, fill in code/label/category/unit/bounds/value, submit; verify the new row appears in the table with `catalogTemplate` empty and an explicit "ad-hoc" indicator.

**Acceptance Scenarios**:

1. **Given** the user is a `CHEF_SECTEUR` or `ADMIN_IT` and opens the advanced ad-hoc dialog, **When** it renders, **Then** every field (code, label, category, unit, lower, upper, value, optional antenna/frequency/modulation) is editable and the catalog template is not selectable.
1a. **Given** the user is `TECH_VAL` or `TECH_PREP`, **When** the measure panel renders, **Then** the "Add ad-hoc measure" entry point is not present anywhere in the UI (the catalog-backed "Add measure" remains available).
2. **Given** the user submits an ad-hoc measure with valid fields, **When** the request succeeds, **Then** the row appears in the table flagged as "ad-hoc" (visual marker) so it is distinguishable from catalog-backed rows.
3. **Given** the user tries to submit with `lowerBound >= upperBound`, **When** they click submit, **Then** an inline validation error appears and submission is blocked client-side.

---

### Edge Cases

- **No catalog for the ticket's zone PosteType**: The "Add measure" dialog's template dropdown shows an empty state ("No templates defined for this poste type") and points the user to the catalog admin page (when their role allows it). The "Instantiate all" button is hidden in that case.
- **Catalog template deleted after measures were instantiated**: Rows whose `catalogTemplate` no longer exists still render correctly using the snapshotted code/bounds/unit stored on the measure itself; a small "template removed" tooltip is shown.
- **Value with very high deviation (e.g., 500%)**: The deviation progress bar caps visually at 100% width but the numeric label shows the true percentage (e.g., "500%") in the red band.
- **Network failure during single insert / batch / delete**: The dialog stays open or the bulk-edit mode is preserved; an error toast explains the failure; no optimistic UI is committed beyond what the server confirmed.
- **Concurrent updates by another user**: Last-write-wins is the policy for Phase 002. After the user's save succeeds, if the row's `measuredAt` or `enteredBy` returned by the server indicates a change since the row was last loaded into the panel, a non-blocking warning toast informs the user that their write overwrote a more recent change. No optimistic-concurrency `version` field is required from the backend in this phase; this may be revisited in a later phase if real conflicts are observed.
- **Legacy validation-result records existing on a ticket**: The detail page reads only from the new measures endpoint; if the new endpoint returns empty but legacy data exists, the legacy data is displayed read-only with a "legacy data — please migrate" banner. The legacy service is kept as a thin shim that warns in the console on every call.
- **Permissions**: Read-only roles see the measure panel but neither the "Add measure" nor the "Bulk edit" nor "Instantiate all" actions (these are hidden, not just disabled).
- **Catalog dropdown with hundreds of templates**: The dropdown supports text search and shows the antenna/frequency suffix next to each code so the user can disambiguate quickly.

## Requirements *(mandatory)*

### Functional Requirements

#### Models, DTOs, and services

- **FR-001**: The frontend MUST define a `ValidationMeasure` model in `src/app/models/validation-measure.model.ts` that mirrors the backend response DTO one-to-one (including `id`, `validation` reference, optional `catalogTemplate` reference, `measureCode`, `measureLabel`, `category`, `measuredValue`, `unit`, `lowerBound`, `upperBound`, `status`, optional `antenna`, optional `frequencyMhz`, optional `modulationScheme`, `deviationPct`, `measuredAt`, `enteredBy`, optional `sourceLogFile`).
- **FR-002**: The frontend MUST define request DTOs `create-validation-measure.dto.ts` and `update-validation-measure.dto.ts` matching the backend request contracts for single and update operations.
- **FR-003**: The frontend MUST provide a `ValidationMeasureService` at `src/app/services/validation-measure.service.ts` that exposes typed methods for: list by ticket, create single, batch create, update by id, delete by id, and instantiate from a single catalog template (one-shot). The full bulk-instantiate-from-catalog action is a UI workflow on top of these primitives.
- **FR-004**: The frontend MUST keep the existing `ValidationResultService` as a thin compatibility shim that emits a `console.warn` on every call and continues to function until Phase 005 closes (per Constitution principle 8).
- **FR-005**: The frontend MUST call the new measures endpoints first and fall back to legacy endpoints only on HTTP 404, matching the backward-compat shim mandated by the constitution.

#### Ticket detail page refactor

- **FR-006**: The ticket detail page MUST replace its existing "Results" panel with a new `MeasurePanel` component that lists all measures attached to the ticket.
- **FR-007**: `MeasurePanel` MUST display, per row: a measure-badge chip showing category icon + measure code + optional antenna/frequency suffix; the measured value formatted with its unit; the tolerance interval `[lowerBound, upperBound]` with the unit; a color-coded status badge (green `OK`, red `OUT_OF_RANGE`, gray `NOT_EXECUTED`); and a deviation progress bar colored green (0–50%), amber (50–100%), or red (>100%).
- **FR-008**: `MeasurePanel` MUST be sortable by measure code, category, status, and deviation percentage, and filterable by status (all / OK / OUT_OF_RANGE / NOT_EXECUTED).
- **FR-009**: `MeasurePanel` MUST hide all mutating actions (Add measure, Bulk edit, Add ad-hoc, Instantiate all, Delete row) from users who do not hold a role authorized to enter or edit measures. Authorized roles: `TECH_VAL`, `TECH_PREP`, `CHEF_SECTEUR`, `ADMIN_IT`. Read-only roles: `EXPERT`, `RESPONSABLE`.

#### Dialogs and bulk operations

- **FR-010**: The "Add measure" dialog MUST present a searchable dropdown listing only catalog templates of the ticket's zone PosteType, pre-fill bounds and unit on selection, and let the user enter only `measuredValue` (plus optional notes if the contract supports them).
- **FR-011**: The "Add ad-hoc measure" advanced dialog MUST allow manual entry of `measureCode`, `measureLabel`, `category`, `unit`, `lowerBound`, `upperBound`, `measuredValue`, and optional context fields, with client-side validation `lowerBound < upperBound` and numeric `measuredValue`. The "Add ad-hoc measure" entry point MUST be visible only to `CHEF_SECTEUR` and `ADMIN_IT`; for `TECH_VAL` and `TECH_PREP` only the catalog-backed "Add measure" dialog is exposed.
- **FR-012**: Bulk-edit mode MUST allow inline editing of `measuredValue` on every editable row, submit all edits via the batch endpoint in a single round trip, and handle per-row failures with **partial success semantics**: successful rows are persisted and exit edit mode; failed rows stay in edit mode with an inline error message; the closing toast reports `X saved, Y failed`. The user can correct failed rows and re-submit without re-typing the successful ones.
- **FR-013**: The "Instantiate all template measures as NOT_EXECUTED" action MUST populate the ticket with the full catalog for its zone PosteType in one operation, MUST be hidden once the ticket already has measures, and MUST be available to roles authorized to manage measures.
- **FR-014**: After a successful ticket creation, the ticket-create flow MUST automatically seed the new ticket with `NOT_EXECUTED` measures from its zone catalog so the user lands on a populated detail page.

#### Shared components and pipes

- **FR-015**: The frontend MUST provide a shared `MeasureStatusBadge` component under `src/app/shared/components/measure-status-badge/` that renders a chip with the color and label appropriate for `OK` / `OUT_OF_RANGE` / `NOT_EXECUTED`.
- **FR-016**: The frontend MUST provide a shared `DeviationProgress` component under `src/app/shared/components/deviation-progress/` that renders a progress bar with green/amber/red bands by deviation percentage and shows the numeric percentage as a label.
- **FR-017**: The frontend MUST provide a `MeasureUnitPipe` that formats numeric values with their unit consistently (e.g., `15.52 dBm`, `35.53 mA`), using a reasonable number of significant digits.
- **FR-018**: The `MeasureBadge` shared component delivered in Phase 001 MUST be reused without modification by `MeasurePanel` rows; this phase does not redesign it.

#### Stack and conventions

- **FR-019**: All new components, pipes, and directives MUST be NgModule-based (`standalone: false`), declared in `app.module.ts`, use the centralized PrimeNG module, the `lara-dark-blue` theme, the `--sage-*` CSS variables, DM Sans / JetBrains Mono fonts, and the `app` component prefix (Constitution principle 11).
- **FR-020**: Every new action that mutates measures MUST be hidden (not merely disabled) for users without the required role (Constitution principle 12).
- **FR-021**: The frontend MUST display a `Deprecation` warning (console + visible banner when only legacy data is present) when the legacy `validation-results` endpoint is hit through the shim.

#### Tests

- **FR-022**: Karma/Jasmine tests MUST cover `ValidationMeasureService` HTTP methods (list, single create, batch create, update, delete, from-template) using `HttpClientTestingModule` with mocked responses.
- **FR-023**: Karma/Jasmine tests MUST cover `MeasurePanel` rendering for the three statuses, the deviation-band coloring at 33%, 75%, and 150% boundaries, and the role-gated visibility of mutating actions.

### Key Entities

- **ValidationMeasure**: A single measurement attached to a ticket. Carries the normalized code, the snapshotted bounds and unit, the entered value, the computed status (`OK` / `OUT_OF_RANGE` / `NOT_EXECUTED`), the computed deviation percentage, optional industrial context (antenna, frequency, modulation), an optional reference to the catalog template it was instantiated from, an optional source log file path (used by Phase 004), and audit fields (`measuredAt`, `enteredBy`).
- **MeasureStatus**: The three-valued status enum (`OK`, `OUT_OF_RANGE`, `NOT_EXECUTED`) introduced in Phase 001, used here for badge coloring and panel filtering.
- **PosteMeasureCatalog template**: Referenced read-only via the `PosteCatalogService` introduced in Phase 001 to feed the template dropdown in the "Add measure" dialog and to drive the "Instantiate all" action.
- **CreateValidationMeasureRequest / UpdateValidationMeasureRequest**: Frontend DTOs mirroring backend request contracts.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user opening any ticket sees its measures rendered in the new `MeasurePanel` with the correct color-coded status and deviation visual, replacing the legacy "Results" panel in 100% of ticket detail pages.
- **SC-002**: A technician can add a single catalog-backed measure (template selection + value entry + submit) end-to-end in under 20 seconds on a ticket whose catalog has fewer than 50 templates.
- **SC-003**: A technician can seed a brand-new ticket with the full catalog as `NOT_EXECUTED` rows in a single click and observe the panel populated within 2 seconds for catalogs of up to 30 templates.
- **SC-004**: A technician can update at least 10 measure values in bulk-edit mode and submit them in a single request that completes in under 3 seconds end-to-end (excluding network latency above 200 ms).
- **SC-005**: 100% of measures with `measured ∈ [lowerBound, upperBound]` render with the green `OK` badge; 100% with a value outside the interval render `OUT_OF_RANGE`; 100% with no value render `NOT_EXECUTED`. The mapping is independently verifiable via the rendered DOM.
- **SC-006**: 0 ticket detail pages still expose the legacy "Results" panel after the refactor lands.
- **SC-007**: All measure-mutating actions are invisible (not just disabled) to users without the required roles, verified by walking through the UI as a read-only role.
- **SC-008**: Karma/Jasmine test suite for the phase passes locally with `npm test`, with `ValidationMeasureService` and `MeasurePanel` covered.

## Assumptions

- The backend deliverables of Phase 002 (entity, endpoints, DTOs, migrations, deprecation header on legacy endpoints) are produced in the parallel backend project and are contract-stable before frontend integration testing. The frontend can mock responses against the contract until the backend is merged.
- The Phase 001 deliverables (`PosteCatalogService`, `MeasureBadge`, `MeasureCategory` enum, `MeasureStatus` enum, admin catalog page) are already merged and usable as-is. This spec does not redesign them.
- The role taxonomy and routing guards described in the project `CLAUDE.md` (Keycloak roles `ADMIN_IT`, `CHEF_SECTEUR`, `EXPERT`, `TECH_VAL`, `TECH_PREP`, `RESPONSABLE`) remain unchanged. Measure mutation is authorized for `TECH_VAL`, `TECH_PREP`, `CHEF_SECTEUR`, `ADMIN_IT` (confirmed in Clarifications); read-only roles `EXPERT`, `RESPONSABLE` see the panel without mutating actions.
- WebSocket-driven real-time refresh of measures is out of scope for Phase 002; the live readiness bar (Phase 003) will introduce that pattern. This phase relies on explicit refresh after each mutation.
- The `Deprecation: true` header from the legacy backend endpoint is observable by the shim service so it can emit the console warning without UI noise on every call.
- The deviation calculation is performed server-side; the frontend only renders the value returned by the backend. No client-side recomputation is required.
- The new ticket-create automatic seeding call uses the backend's `from-template` endpoint per catalog template, or a single bulk variant if available; the exact form depends on the final backend contract and does not change the user-facing requirement.
- The Karma/Jasmine framework already configured in the project is the unit-testing target; no new test framework is introduced.
