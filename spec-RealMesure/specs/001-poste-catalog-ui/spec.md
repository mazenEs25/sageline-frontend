# Feature Specification: PosteType Catalog — Frontend

**Feature Branch**: `001-poste-catalog-ui`
**Created**: 2026-05-13
**Status**: Draft
**Input**: User description: "phase 001 (PosteType Catalog) from plan.md — just the frontend side / deliverable"
**Scope**: Frontend track of Phase 001 only. The backend track (entities, migrations, endpoints, controllers) is delivered separately and is treated here as a **stable contract dependency**.

## Clarifications

### Session 2026-05-13

- Q: How should the poste-type filter dropdown be populated on the catalog page? → A: All `PosteType` enum values (static frontend constant, mirroring the backend enum). Admin can pick an empty poste type and seed its first measure.
- Q: Who can soft-delete (deactivate) a measure template? → A: `ADMIN_IT` + `CHEF_SECTEUR` — same role set as Create/Edit.
- Q: How is the "Include inactive" toggle implemented on the list endpoint? → A: Backend `?includeInactive=true` query parameter on `GET /api/poste-catalog` and `GET /api/poste-catalog/{posteType}/measures`; frontend re-fetches when toggled.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Browse the catalog grouped by PosteType (Priority: P1)

An admin or sector chief opens the new "Poste Catalog" admin page and immediately sees every test
station (poste type) for which a measure catalog has been seeded. For a chosen station, they see
the full list of expected measures with their codes, categories, units, tolerance bounds, and
whether each measure is mandatory.

**Why this priority**: This is the foundational read-only view. Without it, downstream phases
(measure refactor, workflow guard, log importer) cannot demonstrate that the catalog exists or is
correct. It also lets supervisors verify seeded data matches the real Sagemcom logs.

**Independent Test**: Log in as `ADMIN_IT` or `CHEF_SECTEUR`, navigate to `/admin/poste-catalog`,
pick `WIFI_CONDUIT` from the poste-type filter, and confirm the table lists ≥16 measures matching
the supervisor-provided log content.

**Acceptance Scenarios**:

1. **Given** the catalog is seeded for `TEST_FONCTIONNEL`, `WIFI_CONDUIT`, and `ACC`, **when** an
   `ADMIN_IT` user opens `/admin/poste-catalog`, **then** all three poste types appear in the
   filter and the default landing view lists the catalog entries for the first one (alphabetical).
2. **Given** the user filters by `WIFI_CONDUIT`, **when** the table renders, **then** rows show
   columns `measureCode`, `category`, `unit`, `lowerBound`, `upperBound`, `mandatory`, `antenna`,
   `frequencyMhz`, `displayOrder`, sorted ascending by `displayOrder`.
3. **Given** a `TECH_VAL` user pastes the URL `/admin/poste-catalog` into their browser, **when** the
   route resolves, **then** they are redirected to `/access-denied` and the catalog page never
   renders.

---

### User Story 2 — Create a new measure template for a poste type (Priority: P1)

An `ADMIN_IT` user adds a new measure template to an existing poste type via a dialog, filling in
code, label, category, unit, bounds, mandatory flag, display order, and optional RF context
(antenna, frequency, modulation). The new template appears in the table immediately on success.

**Why this priority**: Without create, the catalog is a static seed; the page provides no business
value to administrators and downstream phases cannot extend coverage when supervisors discover
missing measures.

**Independent Test**: As `ADMIN_IT`, open the "Add measure" dialog from the catalog page, submit a
valid new template for `TEST_FONCTIONNEL`, and verify the row appears in the table without a page
reload.

**Acceptance Scenarios**:

1. **Given** an `ADMIN_IT` user on the catalog page, **when** they click "Add measure", fill in a
   valid form, and submit, **then** the dialog closes, a success toast appears, and the new row is
   visible in the table sorted into its `displayOrder` position.
2. **Given** a measure with code `PWR0_2G` already exists for `TEST_FONCTIONNEL`, **when** the user
   submits another measure with the same `(posteType, measureCode)` pair, **then** the dialog
   stays open and a field-level error message explains the duplicate.
3. **Given** the user leaves `measureCode`, `category`, `unit`, `lowerBound`, or `upperBound`
   blank, **when** they attempt to submit, **then** the form blocks submission and highlights the
   missing fields.
4. **Given** the user enters `lowerBound = 10` and `upperBound = 5`, **when** they attempt to
   submit, **then** the form blocks submission with a "lower bound must be less than upper bound"
   error.

---

### User Story 3 — Update or soft-delete an existing measure template (Priority: P2)

An admin edits the bounds, mandatory flag, display order, or RF context of an existing measure
template, or soft-deletes (deactivates) a template that is no longer applicable. Soft-deleted rows
disappear from the default view but can optionally be shown via an "Include inactive" toggle.

**Why this priority**: Catalog edits happen less often than initial seeding, but are necessary as
tolerance specs evolve. Soft-delete (vs hard delete) preserves traceability for tickets that
already reference the template.

**Independent Test**: As `CHEF_SECTEUR`, click "Edit" on a `WIFI_CONDUIT` row, change the upper
bound, save, and verify the new value appears. Then click "Delete", confirm, and verify the row is
hidden by default but reappears when "Include inactive" is enabled.

**Acceptance Scenarios**:

1. **Given** a measure template exists, **when** the user opens "Edit", changes `upperBound` to a
   value greater than `lowerBound`, and saves, **then** the updated value is reflected in the table.
2. **Given** the user clicks "Delete" on a row, **when** they confirm in the confirmation prompt,
   **then** the row is removed from the visible table; toggling "Include inactive" reveals it with
   an "Inactive" visual marker.
3. **Given** an `EXPERT` user, **when** they view the catalog table, **then** the Edit and Delete
   action buttons are **not rendered** (hidden, not just disabled).

---

### User Story 4 — Bulk-import a JSON array of templates for one poste type (Priority: P3)

To seed a newly defined poste type without a code-side migration, an `ADMIN_IT` user opens a
bulk-import dialog, selects a target poste type, pastes a JSON array conforming to the catalog
template schema, and confirms. Each row is created via the standard create endpoint; the dialog
reports success/failure per entry.

**Why this priority**: Convenience for ops; not blocking for the demo, but materially reduces
friction when the supervisor adds a new bench.

**Independent Test**: As `ADMIN_IT`, paste a JSON array of 3 valid template objects for a poste type
with an empty catalog, submit, and verify 3 rows are created and the report shows `3 created /
0 failed`.

**Acceptance Scenarios**:

1. **Given** valid JSON for 3 templates, **when** the user submits the bulk import, **then** the
   dialog shows a per-row report (`✓ created` or `✗ failed: <reason>`) and the catalog table
   refreshes once on close.
2. **Given** JSON with one duplicate `(posteType, measureCode)`, **when** submitted, **then** that
   entry is reported as failed with the duplicate reason while the other entries are created.
3. **Given** malformed JSON, **when** the user submits, **then** the dialog blocks the request and
   shows a parse-error message; no network call is made.

---

### Edge Cases

- **Empty catalog for a poste type**: The table shows an empty-state message: "No measures
  configured for this poste type yet. Use Add measure to start."
- **Poste type with no seed data and no measures yet**: Still appears in the filter — every enum
  value is listed unconditionally per FR-008 — and renders the empty-state above. Admins can seed
  the first measure directly from this state via "Add measure".
- **Backend 5xx on load**: The page shows a centered error card with a "Retry" button; the rest of
  the layout (sidebar, header) remains usable.
- **Backend 409 (duplicate) on create/edit**: Surfaced as an inline field-level error on
  `measureCode`, not a global toast.
- **Backend 403 on a mutating action**: Surfaced as an error toast; the user is not signed out (the
  guard should have hidden the button — a 403 means a stale token or a backend role mismatch and
  is rare).
- **`mandatory = true` but `defaultLowerBound` and `defaultUpperBound` are absent**: Form refuses
  submission; mandatory measures must have bounds.
- **Antenna / frequency / modulation**: All three are optional; if any are populated, they render
  as a suffix on the measure code (e.g., `POWER_RMS_AVG_VSA1 · ANT3 · 5670 MHz`).
- **Long catalogs (>200 rows)**: Table paginates (PrimeNG default page size 25, configurable to 50
  / 100).

## Requirements *(mandatory)*

### Functional Requirements

**Routing & access control**

- **FR-001**: A new route `admin/poste-catalog` MUST be declared in `app-routing.module.ts` under
  the existing `LayoutComponent` parent, with `data: { roles: ['ADMIN_IT', 'CHEF_SECTEUR'] }` and
  the existing `AuthGuard`.
- **FR-002**: A sidebar menu entry under the "Administration" group MUST link to the new route and
  MUST be visible only to users holding `ADMIN_IT` or `CHEF_SECTEUR` (hidden — not disabled — for
  other roles).
- **FR-003**: Action buttons that mutate state (Add measure, Edit, Delete, Bulk-import) MUST be
  hidden for users who do not hold `ADMIN_IT` or `CHEF_SECTEUR`. (Per constitution Principle XII.)

**Data layer (frontend)**

- **FR-004**: New typed models MUST be introduced under `src/app/models/`:
  `poste-measure-catalog.model.ts`, `measure-category.enum.ts`, `measure-status.enum.ts`. Field
  names and nullability MUST mirror the backend response DTOs one-to-one (constitution VI).
- **FR-005**: Each new enum MUST ship companion `*_LABELS`, `*_COLORS`, and `*_ICONS` maps under
  `src/app/shared/enums/` (matching the existing convention used by `TicketStatus`, `Priority`,
  etc.).
- **FR-006**: A new `PosteCatalogService` (`src/app/services/poste-catalog.service.ts`) MUST wrap
  the six backend endpoints with typed methods returning `Observable<...>`, using the standard
  pattern (single `HttpClient`, `environment.apiUrl` base).

**Catalog list page**

- **FR-007**: The catalog page MUST render a PrimeNG table with columns `measureCode`, `category`
  (icon + label via shared enum map), `unit`, `lowerBound`, `upperBound`, `mandatory` (badge),
  `antenna`, `frequencyMhz`, `displayOrder`, and an actions column (Edit / Delete) for permitted
  roles.
- **FR-008**: A filter selector at the top MUST list **every** `PosteType` enum value (sourced from
  a static frontend constant mirroring the backend enum), regardless of whether the backend has
  catalog data for it. Selecting a poste type with no entries renders the empty-state (see
  FR-011). Rationale: admins must be able to seed the first measure of a brand-new poste type
  without resorting to bulk-import.
- **FR-009**: Rows MUST sort ascending by `displayOrder` by default and MUST be re-sortable by any
  column header.
- **FR-010**: A toggle "Include inactive" (default OFF) MUST control whether soft-deleted rows
  appear. Toggling MUST trigger a re-fetch using the backend `?includeInactive=true` query
  parameter on `GET /api/poste-catalog` and `GET /api/poste-catalog/{posteType}/measures` (not
  client-side filtering). Inactive rows MUST display a visible "Inactive" marker.
- **FR-011**: An empty-state MUST be rendered when the selected poste type has zero active
  templates.

**Create / Edit dialog**

- **FR-012**: A single reactive-form dialog MUST handle both create and edit. Fields:
  `posteType` (locked on edit), `measureCode`, `measureLabel`, `category`, `defaultUnit`,
  `defaultLowerBound`, `defaultUpperBound`, `mandatory`, `displayOrder`, `antenna` (optional),
  `frequencyMhz` (optional), `modulationScheme` (optional).
- **FR-013**: The form MUST enforce: required fields populated; numeric bounds; `lowerBound <
  upperBound`; `displayOrder ≥ 0`; `frequencyMhz ≥ 0`.
- **FR-014**: On submit, the dialog MUST disable the submit button and show a spinner; on success it
  MUST close, refresh the table, and emit a success toast; on validation/conflict failure it MUST
  stay open and surface a field-level error message.

**Delete (soft-delete)**

- **FR-015**: The Delete action MUST be available to `ADMIN_IT` **and** `CHEF_SECTEUR` (same role
  set as Create/Edit per FR-003) and hidden for all other roles. It MUST open a PrimeNG
  confirmation dialog naming the measure code and warning that existing tickets retain their
  reference. On confirm, it MUST call the soft-delete endpoint; on success the row disappears from
  the default view (or remains visible with an "Inactive" marker if FR-010's toggle is ON).

**Bulk-import dialog**

- **FR-016**: A "Bulk import" button MUST open a dialog with a target-poste-type selector and a
  monospaced textarea for JSON input.
- **FR-017**: On submit, the dialog MUST parse the JSON client-side, dispatch one create call per
  entry, and present a per-row outcome list (`✓ created` / `✗ failed: <reason>`). The catalog
  table MUST refresh once on dialog close.

**Shared component**

- **FR-018**: A new shared component `MeasureBadge`
  (`src/app/shared/components/measure-badge/`) MUST render a chip composed of the category icon,
  the measure code, and an optional RF suffix (`· ANT{n} · {freq} MHz`). This component MUST be
  declared in `app.module.ts` (NgModule-based, `standalone: false`).
- **FR-019**: The catalog table's `measureCode` cell MUST use `MeasureBadge`.

**UX & error handling**

- **FR-020**: All HTTP errors MUST surface via PrimeNG toasts using the project's existing message
  service pattern; the user MUST never see a raw stack trace or untranslated backend payload.
- **FR-021**: Loading states MUST use the project's existing skeleton/spinner pattern, not custom
  CSS.
- **FR-022**: All text strings MUST follow the project's existing language convention (the rest of
  the app uses French for end-user copy; the catalog page MUST match).

### Key Entities

- **PosteMeasureCatalog (frontend model)**: One catalog entry for a poste type. Attributes:
  `id`, `posteType`, `measureCode`, `measureLabel`, `category`, `defaultUnit`, `defaultLowerBound`,
  `defaultUpperBound`, `mandatory`, `displayOrder`, `antenna?`, `frequencyMhz?`,
  `modulationScheme?`, `active`. Uniqueness: `(posteType, measureCode)`.
- **MeasureCategory (enum)**: `POWER`, `VOLTAGE`, `CURRENT`, `FREQUENCY`, `TIME`, `TEMPERATURE`,
  `PER`, `RSSI`, `EVM`, `OTHER`. Used for grouping, icon selection, and KPI filtering downstream.
- **MeasureStatus (enum)**: `OK`, `OUT_OF_RANGE`, `NOT_EXECUTED`. Declared in this phase for reuse
  in Phase 002; not used by the catalog UI itself except in label/color/icon maps.
- **PosteType (enum)**: Existing backend-defined enum; the frontend consumes its string values via
  the catalog responses and the poste-type filter selector. No frontend changes to the enum
  definition.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An `ADMIN_IT` user can locate the new page from the sidebar and view a seeded
  poste-type catalog within 10 seconds of login.
- **SC-002**: For the three seeded poste types (`TEST_FONCTIONNEL`, `WIFI_CONDUIT`, `ACC`), the
  page lists row counts matching the backend seed data (≥6, ≥16, ≥14 respectively).
- **SC-003**: An admin can create a new measure template — open dialog, fill form, submit, see row
  appear — in under 30 seconds without leaving the page.
- **SC-004**: Users without the `ADMIN_IT` or `CHEF_SECTEUR` role cannot reach the page (either via
  sidebar — entry hidden — or via direct URL — redirected to access-denied) in 100 % of attempts.
- **SC-005**: Duplicate-code attempts (same `posteType, measureCode`) are blocked with a clear,
  field-level message in 100 % of cases, with no need to refresh the page.
- **SC-006**: After a successful create / edit / delete, the table reflects the change without a
  full page reload.

## Assumptions

- **Backend contract is frozen for this phase**. Endpoint paths, request/response DTO field names,
  and error semantics (`409` on duplicate, `403` on role mismatch) are agreed before frontend work
  starts. Any deviation forces a backend DTO change (constitution VI), not a frontend workaround.
- **PosteType enum string values** returned by the backend match the codes already used in the
  existing Angular code (the backend is the source of truth; frontend treats them as opaque
  strings everywhere except the filter label).
- **No backend pagination on the list endpoints** for Phase 001 — the seeded catalogs are small
  (< a few hundred rows per poste type); the frontend handles pagination client-side via
  PrimeNG's built-in paginator.
- **Locale**: New copy is written in French to match existing pages (`Tickets`, `Lignes`,
  `Secteurs`). The English placeholder labels in this spec are working titles.
- **Tests**: Per user instruction for this phase, automated UI test coverage is kept minimal. A
  smoke-level Karma test exists for `PosteCatalogService` HTTP wiring; the catalog page itself is
  validated by manual walkthrough of the four acceptance scenarios. Heavier component-level tests
  are deferred to Phase 002 (`MeasurePanel`) where they protect business-critical rendering.
- **Reuse**: The new page reuses the existing layout shell, sidebar, PrimeNG theme
  (`lara-dark-blue`), `--sage-*` CSS tokens, fonts, and confirmation/toast services. No new UI
  library, no new theme, no standalone components (constitution XI).
- **Out of scope for this phase**: editing the `PosteType` enum itself; any view of
  `ValidationMeasure` data (Phase 002); workflow readiness UI (Phase 003); log import (Phase 004).
