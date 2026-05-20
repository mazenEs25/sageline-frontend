# Feature Specification: Sagemcom Log Importer (Frontend)

**Feature Branch**: `004-sagemcom-log-importer`
**Created**: 2026-05-15
**Status**: Draft
**Input**: User description: "Phase 004 — Sagemcom Log Importer from plan.md (frontend deliverables only; backend is handled in the backend project)"

## Overview

This specification covers **only the Angular frontend** deliverables for Phase 004 — Sagemcom Log Importer. The backend (parser strategies, endpoints, persistence, fixtures) is implemented separately in the backend project. The frontend consumes the contracts defined in the backend phase plan:

- `POST /api/validations/{id}/preview-log` (multipart) → returns `LogImportReportDTO` (dry-run, no persistence).
- `POST /api/validations/{id}/import-log` (multipart) → persists matched measures.
- `GET /api/validations/{id}/measures/{measureId}/source-snippet` → returns the parsed snippet for a measure.

This feature is the **demo highlight** of the PFE defense: a technician (or jury member) drag-drops a real Sagemcom log file into a ticket, sees a parsed preview of matched / unmatched / warning entries, confirms, and watches the measure panel and workflow-readiness bar populate live.

## Clarifications

### Session 2026-05-15

- Q: When a log is imported into a ticket that already has measures, how should overlapping `measureCode` rows be handled? → A: Skip on conflict — incoming measures whose code already exists on the ticket are surfaced in a dedicated "Skipped (already present)" preview section and are NOT persisted; existing values are never overwritten.
- Q: Should ZIP archives be supported as uploadable log files in this iteration? → A: No — accept only `.log` and `.txt`; ZIP is dropped from scope.
- Q: What does the "Add to catalog" action on an unmatched row do? → A: Opens the Phase 001 catalog create form in a new browser tab, pre-filled with `measureCode` and the ticket's `posteType` as query params; the import dialog stays open and exposes a "Re-preview" action so the user can re-run preview after saving the catalog entry.
- Q: How does the dialog refresh `MeasurePanel` and `WorkflowReadinessBar` after a successful import? → A: The dialog emits an `(importSucceeded)` Angular `Output` event; the ticket-detail page handles it by calling `reload()` on its `MeasurePanel` and `WorkflowReadinessBar` child references — same parent-driven reload pattern already used by other panels in the app.
- Q: What is the maximum log-file size accepted by the dialog? → A: 10 MB enforced client-side; files larger than this are rejected with an inline message before any HTTP call.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Import a Sagemcom log to auto-populate a ticket's measures (Priority: P1)

A `TECH_VAL`, `TECH_PREP`, or `ADMIN_IT` user opens a ticket that currently has zero (or few) measures. They click the prominent "Import Sagemcom log" button next to the measure panel, drag-drop a `.log` or `.txt` file, see a preview report broken into Matched / Unmatched / Warnings, then confirm the import. The measure panel and workflow-readiness bar refresh automatically with the imported measures.

**Why this priority**: This is the headline demo. Without it, the entire phase has no user-visible payoff and the supervisor's request for a defense-grade demo cannot be fulfilled.

**Independent Test**: With the backend running and a real fixture log on disk, open any ticket in `EN_COURS`, drop the log file into the import dialog, confirm, and verify the measure panel updates with the parsed measures and the readiness bar advances toward 100%.

**Acceptance Scenarios**:

1. **Given** a ticket of `posteType = WIFI_CONDUIT` with zero measures, **When** the user drops `bwc-gateway-safran-wifi5g.log` into the import dialog and clicks "Confirm import", **Then** ≥16 measures appear in the measure panel, all with status `OK`, the readiness bar updates without a manual refresh, and a success toast is shown.
2. **Given** a ticket where the user has just dropped a log file, **When** the preview is rendered, **Then** a header chip labelled "Detected format: BWC" (or BNFT / BTF) is visible.
3. **Given** the preview is showing matched, unmatched, and warning entries, **When** the user clicks the dialog's close icon without confirming, **Then** no measures are persisted on the backend.
4. **Given** the current user has role `EXPERT` or `RESPONSABLE` only, **When** the ticket detail page is loaded, **Then** the "Import Sagemcom log" button is hidden.

---

### User Story 2 - Review unmatched measures and warnings before committing (Priority: P1)

The same operator (or an `ADMIN_IT` / `CHEF_SECTEUR`) needs to inspect what *did not* match the catalog before persisting. They expand the "Unmatched" accordion to see each unmatched measure code with the reason ("No matching template in <PosteType> catalog"), and the "Warnings" accordion to see non-fatal notes (e.g. unit fallback). For `ADMIN_IT` / `CHEF_SECTEUR`, each unmatched row offers a one-click "Add to catalog" action that links to the catalog UI from Phase 001.

**Why this priority**: Without a clear preview, an operator may either skip the import (loss of demo value) or persist incorrect data. Visibility of unmatched / warnings is what makes the importer trustworthy and defendable in front of a jury.

**Independent Test**: Import a log file containing at least one measure code not present in the catalog. Verify the unmatched count is non-zero, the reason text is human-readable, and the "Add to catalog" link only appears for `ADMIN_IT` and `CHEF_SECTEUR`.

**Acceptance Scenarios**:

1. **Given** a parsed log contains a measure code absent from the `PosteMeasureCatalog` for the ticket's posteType, **When** the preview is displayed, **Then** the row appears in the Unmatched accordion with its code and reason.
2. **Given** the current user has role `ADMIN_IT`, **When** they look at an unmatched row, **Then** an "Add to catalog" action is visible and navigates them to the catalog creation form pre-filled with the measure code and the ticket's posteType.
3. **Given** the current user has role `TECH_VAL`, **When** they look at the same unmatched row, **Then** no "Add to catalog" action is visible.
4. **Given** the parsed log produced no warnings, **When** the preview is rendered, **Then** the Warnings accordion shows a zero count and is collapsed by default.

---

### User Story 3 - Trace any measure back to its source log file (Priority: P2)

After import, a reviewer (`EXPERT`, `CHEF_SECTEUR`) needs to audit a specific measured value. They see a paperclip icon next to each measure row that came from a log import. Hovering reveals the original log filename; clicking opens a `LogSourceDialog` showing the raw snippet of the log lines that produced this measure.

**Why this priority**: Required by the supervisor for defensibility — every imported value must be auditable back to its source. Without this, the parser is an opaque black box, which is unacceptable for a jury demo.

**Independent Test**: Import a log into a ticket, click the paperclip icon on any imported measure row, verify the dialog opens with the original filename in the header and the relevant log snippet shown in a monospace block.

**Acceptance Scenarios**:

1. **Given** a measure was created by a log import, **When** the user views the measure panel, **Then** a paperclip icon is shown on that row.
2. **Given** the user hovers the paperclip, **When** the tooltip renders, **Then** it shows the original log filename (e.g. `bwc-gateway-safran-wifi5g.log`).
3. **Given** the user clicks the paperclip, **When** the dialog opens, **Then** it shows the filename and the parsed snippet returned by the source-snippet endpoint in a monospace block.
4. **Given** a measure was entered manually (not via log import), **When** viewed in the measure panel, **Then** no paperclip icon is shown.

---

### User Story 4 - Visual cue to discover the importer on empty tickets (Priority: P3)

A first-time user (or a jury member) lands on a ticket that has zero measures. The "Import Sagemcom log" button shows a subtle pulse animation, drawing attention so the demo flow is self-evident without verbal guidance.

**Why this priority**: Purely UX polish for the demo. Important for first impression, but the feature works without it.

**Independent Test**: Open a freshly created ticket with zero measures and verify the import button pulses; open a ticket already containing measures and verify the pulse is absent.

**Acceptance Scenarios**:

1. **Given** a ticket has zero measures, **When** the ticket detail page is loaded, **Then** the "Import Sagemcom log" button shows a pulsing animation.
2. **Given** a ticket has at least one measure, **When** the ticket detail page is loaded, **Then** the import button is static.

---

### Edge Cases

- The dropped file is not a `.log` or `.txt` (including `.zip` and any other extension) → the dialog rejects the file with a clear inline message and does not call the backend.
- The dropped file is empty or corrupted → the backend returns a parse error; the dialog displays the error message and offers "Try another file" without crashing.
- The dropped file's detected format does not match any expected catalog (zero matched, only unmatched) → the preview is still displayed; the "Confirm import" button is disabled with a tooltip "No measures to import".
- The user confirms the import but the network call fails mid-flight → an error toast appears, the dialog stays open, the ticket state on the backend is unchanged.
- The user uploads a log close to the 10 MB cap → an upload progress indicator is shown; the dialog stays responsive. Files >10 MB are rejected client-side before any HTTP call.
- The user opens the dialog on a ticket whose status forbids edits (`CONFORME`, `NON_CONFORME`, `ANNULE`) → the import button is disabled with a tooltip explaining why.
- Two simultaneous imports on the same ticket from two browser tabs → second import is accepted by the backend; the frontend simply refreshes the measure panel after each call (no client-side locking).
- The user is offline or the backend is down → the import button still appears, but submission shows a clear network error.

## Requirements *(mandatory)*

### Functional Requirements

#### Models & Service Layer

- **FR-001**: The frontend MUST define a `LogImportReport` model matching the backend `LogImportReportDTO` (fields: `detectedFormat`, `totalParsed`, `matched[]`, `unmatched[]`, `warnings[]`) plus the nested `MatchedMeasure` and `UnmatchedMeasure` shapes documented in the plan.
- **FR-002**: The existing `ValidationMeasureService` MUST expose two new methods: `previewLog(ticketId, file)` and `importLog(ticketId, file)`, both sending the file as `multipart/form-data` against the corresponding backend endpoints.
- **FR-003**: The frontend MUST expose a method to fetch a measure's source-log snippet (`getSourceSnippet(ticketId, measureId)`) used by the `LogSourceDialog`.

#### Log Import Dialog

- **FR-004**: A new `LogImportDialog` component MUST be created under `src/app/pages/Ticket/log-import-dialog/`.
- **FR-005**: The dialog MUST use the PrimeNG `FileUpload` component in drag-drop mode, accepting only `.log` and `.txt` files. ZIP archives are out of scope for this iteration; if a `.zip` is dropped the uploader MUST reject it with an inline message "ZIP not supported — drop a .log or .txt file".
- **FR-005a**: The dialog MUST enforce a client-side maximum file size of **10 MB**. Files exceeding this size MUST be rejected before any HTTP call with the inline message "File too large (max 10 MB)".
- **FR-006**: Step 1 — On file drop, the dialog MUST call `previewLog`, display a spinner during the call, and render the returned report.
- **FR-007**: Step 2 — The dialog MUST render four accordion sections in this order: **Matched** (green count badge), **Skipped (already present)** (grey count badge), **Unmatched** (amber count badge), **Warnings** (yellow count badge). Matched is expanded by default; Skipped is collapsed by default and hidden entirely when its count is zero.
- **FR-007a**: The **Skipped** section MUST list every parsed measure whose `measureCode` already exists on the ticket; rows display the code, the existing value/status (read-only), and the incoming value that was discarded. These rows MUST NOT be persisted by `importLog`.
- **FR-008**: The Matched accordion MUST show a table with at least these columns: measure code, label, value, unit, computed status (`OK` / `OUT_OF_RANGE`), and `[lower, upper]` bounds.
- **FR-009**: The Unmatched accordion MUST show a table with: measure code, reason. For users with role `ADMIN_IT` or `CHEF_SECTEUR`, an inline "Add to catalog" action MUST appear on each row. Clicking it MUST open the Phase 001 catalog create form in a **new browser tab** (`target="_blank"`), passing `measureCode` and the ticket's `posteType` as query parameters; the import dialog itself MUST remain open in the original tab.
- **FR-009a**: When at least one Unmatched row exists, a secondary "Re-preview" button MUST be visible inside the dialog. Clicking it re-runs `previewLog` against the same file (re-using the file already held in dialog memory) so the user can refresh the report after creating missing catalog entries, without re-dropping the file.
- **FR-010**: The Warnings accordion MUST show a plain bullet list of warning strings.
- **FR-011**: The dialog MUST display a header chip showing the detected format (e.g. "Detected format: BWC").
- **FR-012**: Step 3 — A "Confirm import" primary button MUST call `importLog`; on success the dialog MUST close, show a success toast, and emit an Angular `Output` event `(importSucceeded)` carrying the persisted measure IDs. The ticket-detail page MUST handle this event by invoking `reload()` on its `MeasurePanel` and `WorkflowReadinessBar` child component references; no new global state, RxJS subject, or full-page reload is introduced.
- **FR-013**: The "Confirm import" button MUST be disabled when there are zero matched measures, with a tooltip explaining why.

#### Ticket Detail Integration

- **FR-014**: The ticket detail page MUST display a prominent "Import Sagemcom log" button adjacent to the measure panel.
- **FR-015**: The import button MUST be visible only to users with role `TECH_VAL`, `TECH_PREP`, or `ADMIN_IT`.
- **FR-016**: The import button MUST be disabled (with explanatory tooltip) when the ticket status is one of `CONFORME`, `NON_CONFORME`, or `ANNULE`.
- **FR-017**: When the ticket has zero measures, the import button MUST display a subtle pulse animation to invite interaction.

#### Source Traceability

- **FR-018**: In the `MeasurePanel`, each measure row whose `sourceLogFile` is set MUST display a paperclip icon.
- **FR-019**: Hovering the paperclip MUST reveal a tooltip showing the original log filename.
- **FR-020**: Clicking the paperclip MUST open a new `LogSourceDialog` displaying the original filename in the header and the source snippet returned by the backend in a monospace text block.

#### UX, Errors, and Testing

- **FR-021**: All backend errors (validation, network, parse failures) MUST surface as user-readable toasts or inline messages; raw stack traces MUST NOT leak into the UI.
- **FR-022**: A Karma + Jasmine test suite MUST cover `LogImportDialog` for the three fixture formats (BNFT, BWC, BTF) using mocked HTTP responses, asserting matched/unmatched/warning counts and the confirm flow.
- **FR-023**: A Karma test MUST cover `ValidationMeasureService.previewLog` and `importLog` (correct URL, multipart body, error propagation).

### Key Entities

- **LogImportReport**: Frontend model mirroring the backend DTO. Fields: `detectedFormat` (string, one of `BNFT` / `BWC` / `BTF`), `totalParsed` (number), `matched` (array of `MatchedMeasure`), `unmatched` (array of `UnmatchedMeasure`), `warnings` (array of string).
- **MatchedMeasure**: `measureCode`, `label`, `value`, `unit`, `status`, `lower`, `upper`, `templateId`.
- **UnmatchedMeasure**: `measureCode`, `reason`.
- **SkippedMeasure**: `measureCode`, `existingValue`, `existingStatus`, `incomingValue` — represents an incoming parsed measure that was discarded because the ticket already has a measure with the same code.
- **LogSourceSnippet**: Returned by the source-snippet endpoint. Fields: `filename`, `snippet` (multi-line raw log text), optional `lineRange`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A jury member can complete the full demo flow — drag-drop `bwc-gateway-safran-wifi5g.log` into a `WIFI_CONDUIT` ticket, see the preview, confirm import, observe the measure panel and readiness bar update — in **under 30 seconds** end-to-end.
- **SC-002**: Importing the reference BWC fixture into a matching ticket populates **≥16 measures, all with status `OK`**, with **zero unmatched** entries on the supervisor-provided log.
- **SC-003**: Importing the BNFT fixture into a `TEST_FONCTIONNEL` ticket populates **exactly the 6 power measures** described in the backend acceptance criteria.
- **SC-004**: Every imported measure displays a paperclip icon and resolves the source snippet within **1 second** of clicking the icon (assuming local backend).
- **SC-005**: At least **100% of `LogImportDialog` Karma tests pass** in CI, covering the three fixture formats and the empty / error paths.
- **SC-006**: Users in roles outside the allowed set (`TECH_VAL`, `TECH_PREP`, `ADMIN_IT`) **never see** the import button — verified by a role-gating test.
- **SC-007**: The dialog handles a corrupted log file gracefully — error toast appears within **2 seconds** and the dialog stays open, with no console errors and no measures persisted.

## Assumptions

- Backend endpoints `POST /api/validations/{id}/preview-log`, `POST /api/validations/{id}/import-log`, and `GET /api/validations/{id}/measures/{measureId}/source-snippet` exist with the contracts described in `Plan.md` §9 and are reachable from the frontend.
- The `PosteMeasureCatalog` (Phase 001) is already populated for the posteTypes used during the defense demo; otherwise unmatched counts will dominate but the UI still functions.
- The `WorkflowReadinessBar` (Phase 003) is already integrated into the ticket detail page and exposes a refresh mechanism the dialog can trigger after import.
- Existing `MeasurePanel` already renders each measure row in a way that can be extended with a paperclip icon column.
- `ValidationMeasure.sourceLogFile` is provided by the backend payload on each measure that came from a log import; the frontend does not need to compute it.
- The Keycloak roles (`TECH_VAL`, `TECH_PREP`, `ADMIN_IT`, `CHEF_SECTEUR`) already used elsewhere in the app are the authoritative source for role gating in this feature.
- ZIP support is **out of scope** for this iteration (see clarification 2026-05-15); only `.log` and `.txt` are accepted.
- The demo is performed against a local backend on `http://localhost:8089`; the importer is not expected to be tuned for production-grade large-file streaming.
