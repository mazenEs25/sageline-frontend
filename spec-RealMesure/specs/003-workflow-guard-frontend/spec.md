# Feature Specification: Workflow Guard — Frontend

**Feature Branch**: `003-workflow-guard-frontend`
**Created**: 2026-05-14
**Status**: Draft
**Input**: User description: "Phase 003 — Workflow Guard from plan.md (only the frontend deliverables; backend is handled in the companion backend project)"

## Clarifications

### Session 2026-05-14

- Q: Which roles may see the readiness bar and the missing/out-of-range side panel? → A: All roles that can already open the ticket detail page (`ADMIN_IT`, `CHEF_SECTEUR`, `EXPERT`, `TECH_VAL`, `TECH_PREP`, `RESPONSABLE`). The bar is informational, not mutating, so no role is hidden from it.
- Q: Which roles see the "Submit for review" button at all? → A: Only roles authorized to perform the `EN_COURS → EN_REVUE` transition under the existing routing/role rules: `ADMIN_IT`, `CHEF_SECTEUR`, `TECH_VAL`. Other roles never see the button, so the disabled/enabled state of the button is irrelevant to them.
- Q: What does the bar show before any measure exists on the ticket (mandatoryTotal = 0)? → A: A neutral "No mandatory measures defined for this zone" state in gray; the Submit button stays disabled until at least one mandatory measure is filled or the catalog is non-empty, matching the backend's `canTransition` flag verbatim. The frontend never second-guesses `canTransition`.
- Q: How should the live update path behave if the WebSocket subscription is unavailable (disconnected, server reboot)? → A: Fall back to a one-time refresh after every successful measure mutation in `MeasurePanel`, plus a manual "Refresh readiness" link in the bar's tooltip. The bar continues to render the last-known readiness with a small "live updates paused" indicator.

### Session 2026-05-15

- Q: How long should the bar wait after a WebSocket drop before showing the "live updates paused" indicator? → A: 5 seconds — balanced grace period that covers brief reconnect attempts without misleading the user.
- Q: What should the readiness bar and Submit-for-Review button render during initial page load, before the first `getReadiness` response returns? → A: A skeleton bar (PrimeNG `Skeleton` pattern) plus the Submit button disabled with the label "Loading…". Fail-safe; never optimistic.
- Q: When the WebSocket is paused, should the bar also poll periodically as a safety net? → A: No — strictly event-driven. Mutation refresh (FR-020) + manual "Refresh readiness" link (FR-021) are the only fallback paths; no timer-based polling.
- Q: How many missing-measure entries should the bar's hover tooltip list before truncating with a "+ X more" indicator? → A: 5 entries; remaining entries are surfaced via the side panel.
- Q: Should readiness changes be announced to assistive tech via an `aria-live` region? → A: Yes — `aria-live="polite"` on the bar's text label so each update is announced without interrupting current speech. Submit-button disabled state is already conveyed by the native `[disabled]` attribute.

## Overview

Phase 003 enforces the user's core requirement: **a validation ticket cannot leave `EN_COURS` for `EN_REVUE` until every mandatory measure from its zone's catalog has been filled in (status other than `NOT_EXECUTED`)**. The backend (parallel project) ships the guard logic, the readiness endpoint, the HTTP 422 contract on blocked transitions, and the WebSocket readiness topic. This specification covers **only the frontend deliverables** of Phase 003 as described in `Plan.md §8`.

The frontend surfaces backend-computed readiness as a live progress bar on the ticket detail page, gates the existing "Submit for Review" action against the backend's `canTransition` flag, exposes the list of missing and out-of-range measures in a side panel with one-click navigation to the corresponding row in `MeasurePanel`, and degrades gracefully when the live update channel is unavailable.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See live progress toward review-readiness (Priority: P1)

A technician working through a ticket's measures sees a progress bar at the top of the ticket detail page that updates in real time as they enter or correct measures. The bar tells them, at a glance, how many mandatory measures are filled vs. total, color-coded by completion level.

**Why this priority**: This is the foundational visible-progress slice. Without it, the user has no idea how close they are to being able to submit for review. It motivates every other behavior in the phase.

**Independent Test**: Open a ticket in status `EN_COURS` with at least one mandatory measure in `NOT_EXECUTED` state. Observe the readiness bar rendered at the top of the page showing `mandatoryFilled / mandatoryTotal` and a percentage. Add a measure via `MeasurePanel` (Phase 002) → observe the bar increase without a full page reload.

**Acceptance Scenarios**:

1. **Given** a ticket with 14 of 16 mandatory measures filled, **When** the user opens the ticket detail page, **Then** the readiness bar reads "14 / 16 (87%)" and renders in the amber band.
2. **Given** the same ticket, **When** another user (or the same user) inserts a missing mandatory measure, **Then** the bar updates to "15 / 16 (94%)" without a manual refresh, via the WebSocket readiness topic.
3. **Given** all 16 mandatory measures are now filled, **When** the readiness update is received, **Then** the bar reaches 100% and renders in the green band.
4. **Given** a ticket whose zone catalog defines zero mandatory measures, **When** the user opens the page, **Then** the bar renders a neutral gray state with the message "No mandatory measures defined for this zone".
5. **Given** the user is `EXPERT` or `RESPONSABLE` (read-only roles), **When** the page loads, **Then** the readiness bar is still visible and live-updating; only the Submit button is absent (per Story 2 role gating).

---

### User Story 2 - Be prevented from submitting an incomplete ticket for review (Priority: P1)

When a ticket still has mandatory measures missing, the "Submit for Review" button is disabled and its label tells the user how many more measures are required. If the user somehow triggers the submission anyway (e.g., stale UI, race condition), the backend returns HTTP 422 with the readiness payload; the frontend catches it, shows an explanatory toast, and opens the side panel listing exactly what is missing.

**Why this priority**: This is the entire business rule of the phase. The visible block is what makes the workflow trustworthy and what differentiates the new product from the legacy free-form one.

**Independent Test**: As a user with the transition role on an `EN_COURS` ticket with 14/16 mandatory measures filled, observe the Submit button disabled with a label like "Submit for review (14/16)". If a force-submit path is taken (e.g., via stale state), the 422 response is caught and a toast + side panel appear listing the 2 missing measures.

**Acceptance Scenarios**:

1. **Given** a ticket with `canTransition = false` and `mandatoryFilled = 14`, `mandatoryTotal = 16`, **When** the user views the page, **Then** the Submit-for-Review button is rendered with `[disabled]` and the label `Submit for review (14/16)`.
2. **Given** the readiness bar updates to `canTransition = true` via the WebSocket, **When** the update is applied, **Then** the Submit button transitions to enabled and its label becomes the standard `Submit for review` (no counter suffix).
3. **Given** the user is a role not authorized to perform the `EN_COURS → EN_REVUE` transition (e.g., `EXPERT`, `RESPONSABLE`, `TECH_PREP`), **When** the page renders, **Then** the Submit button is not rendered at all (consistent with existing routing role gating).
4. **Given** a `Submit for review` request returns HTTP 422 with a `WorkflowReadinessDTO` body, **When** the response is received, **Then** the frontend shows a PrimeNG toast naming the count of blocking reasons and automatically opens the missing/out-of-range side panel.
5. **Given** the ticket is not in `EN_COURS` (e.g., already `EN_REVUE`, `CONFORME`, `ANNULE`), **When** the page renders, **Then** the readiness bar reflects whatever the backend reports for the current state, but the Submit-for-Review action is hidden by the existing status-driven UI rules (this phase does not change those rules).

---

### User Story 3 - See which measures are blocking the transition (Priority: P2)

The user clicks the readiness bar (or the toast's "Show blockers" action) and a side panel opens listing every missing mandatory measure and every out-of-range measure that contributes to the block. Each row is clickable and scrolls the page to the corresponding row in `MeasurePanel`, where the user can edit or insert the value.

**Why this priority**: Knowing the count alone is half the value. Naming the exact measures and letting the user jump to them turns the bar into a productivity tool rather than just a warning sign.

**Independent Test**: Click the readiness bar on a ticket with `canTransition = false`. A panel opens listing each `missingMeasures[]` row by `measureCode` and label, and each `outOfRangeMeasures[]` row with its current value and bounds. Click one row → the page scrolls to the matching row in `MeasurePanel` and that row is briefly highlighted.

**Acceptance Scenarios**:

1. **Given** the readiness side panel is closed, **When** the user clicks the readiness bar, **Then** the panel opens showing two sections: "Missing mandatory measures" (one row per `missingMeasures[]` entry) and "Out-of-range measures" (one row per `outOfRangeMeasures[]` entry).
2. **Given** the side panel is open, **When** the user clicks a "missing measure" row, **Then** the page scrolls to the corresponding `MeasurePanel` row (matched by `measureCode`); if no row exists yet (because no measure has been instantiated), the panel triggers the catalog-backed "Add measure" dialog from Phase 002 pre-filled to that template.
3. **Given** the side panel is open and the user clicks an "out-of-range measure" row, **When** the click is handled, **Then** the page scrolls to the matching `MeasurePanel` row and that row is visually highlighted (brief pulse) so the user can correct the value.
4. **Given** the side panel is open and a WebSocket update arrives that empties `missingMeasures[]` and `outOfRangeMeasures[]`, **When** the update is applied, **Then** the panel shows a "All mandatory measures complete" empty state and the user can close it.
5. **Given** the toast triggered by an HTTP 422 response from `submit-review`, **When** the toast appears, **Then** clicking its "Show blockers" action opens the same side panel as a direct bar click.

---

### User Story 4 - Continue working when live updates are unavailable (Priority: P2)

If the WebSocket connection drops (server reboot, network blip, proxy timeout), the readiness bar does not lie or freeze: it shows a discreet "live updates paused" indicator, keeps rendering the last-known readiness, and refreshes itself once after every successful measure mutation done via `MeasurePanel`. A manual refresh link inside the bar's tooltip lets the user re-fetch on demand.

**Why this priority**: The defense demo and any plant-floor deployment must survive a transient WS drop. Without graceful degradation, a momentary disconnect would visibly break the headline feature.

**Independent Test**: Open the ticket detail page; verify live updates work. Stop the backend / block the WS port; observe the "live updates paused" indicator appear within the configured grace period. Add a measure via `MeasurePanel`; observe the bar refresh once via the readiness HTTP endpoint. Click the "Refresh readiness" link in the tooltip; observe a one-shot HTTP refresh.

**Acceptance Scenarios**:

1. **Given** the WebSocket subscription is active, **When** the connection drops, **Then** within a short, observable grace period the readiness bar shows a "live updates paused" indicator (small badge next to the percentage).
2. **Given** the WebSocket is paused, **When** the user mutates a measure (insert, update, delete) via `MeasurePanel`, **Then** the readiness bar performs a one-time HTTP GET on the readiness endpoint and updates itself.
3. **Given** the WebSocket is paused, **When** the user clicks the "Refresh readiness" link in the bar's tooltip, **Then** a single HTTP GET is issued and the bar updates with the new readiness.
4. **Given** the WebSocket reconnects, **When** the reconnection is observed, **Then** the indicator disappears and live updates resume.

---

### Edge Cases

- **Ticket not in `EN_COURS`**: The bar reads readiness for the ticket's current status. The Submit-for-Review button is hidden by existing status rules; the bar's role in this case is informational only.
- **Initial page load, readiness response not yet returned**: The bar renders a skeleton placeholder (PrimeNG `Skeleton` pattern) and the Submit-for-Review button is disabled with the label "Loading…". The button is never optimistically enabled before the first successful response.
- **Readiness endpoint returns 404 or 5xx on initial load**: The bar renders an error state ("Readiness unavailable") with a retry link; the Submit-for-Review button stays disabled (fail-safe) until a successful readiness response is received.
- **WebSocket message arrives for a ticket not currently open**: Ignored by the frontend (the subscription is scoped per-ticket and tied to the ticket detail component's lifecycle; unsubscribe on `ngOnDestroy`).
- **WebSocket message arrives for a ticket open in another browser tab**: Each tab subscribes independently; the bar updates independently in both tabs.
- **Backend `canTransition` and frontend client-side filled-count disagree**: The frontend always defers to `canTransition` from the backend. No client-side override.
- **Side panel click on a missing measure whose template was just deleted from the catalog**: Fall back to the "Add ad-hoc measure" dialog (if the user has the role) or show a tooltip explaining the template is no longer available; do not crash.
- **HTTP 422 on submit-review with a malformed body**: Show a generic "Submission blocked — please refresh" toast; the bar refreshes from the readiness endpoint.
- **Very large `missingMeasures` list (e.g., 200+ measures)**: The side panel renders with virtual scrolling or simple paging; the bar still shows the total/filled accurately.
- **Toast spam suppression**: If the user clicks Submit-for-Review repeatedly while blocked, the 422 toast is deduplicated (at most one visible at a time).
- **Concurrent measure deletes by another user**: The WebSocket readiness update arrives and the bar may decrease; the Submit-for-Review button re-disables if it had been enabled. No UI crash.

## Requirements *(mandatory)*

### Functional Requirements

#### Models and services

- **FR-001**: The frontend MUST define a `WorkflowReadiness` model in `src/app/models/workflow-readiness.model.ts` that mirrors the backend `WorkflowReadinessDTO` one-to-one, including: `ticketId`, `currentStatus`, `targetStatus`, `mandatoryTotal`, `mandatoryFilled`, `mandatoryMissing`, `missingMeasures[]` (each: `measureCode`, `label`, `required`, and any context fields the backend ships), `outOfRangeMeasures[]`, `canTransition`, `blockingReasons[]`.
- **FR-002**: `TicketService` MUST be extended with `getReadiness(ticketId: number, targetStatus?: TicketStatus): Observable<WorkflowReadiness>` that calls `GET /api/validations/{id}/readiness` (and forwards `?targetStatus=` when provided).
- **FR-003**: `TicketService.submitReview(ticketId)` MUST translate an HTTP 422 response carrying a `WorkflowReadinessDTO` body into a typed error that the ticket detail page can pattern-match and surface to the user via toast + side panel — without losing the payload.
- **FR-004**: The frontend MUST subscribe to the STOMP topic `/topic/validation/{id}/readiness` via the existing `WebSocketService` when the ticket detail page activates, and MUST unsubscribe on `ngOnDestroy`. Duplicate subscriptions for the same topic MUST be deduplicated by the existing service.

#### Component: WorkflowReadinessBar

- **FR-005**: A new shared component `WorkflowReadinessBar` MUST live under `src/app/shared/components/workflow-readiness-bar/`, NgModule-based (`standalone: false`), declared in `app.module.ts`.
- **FR-006**: `WorkflowReadinessBar` MUST accept the `WorkflowReadiness` model as input and render: a PrimeNG progress bar with `mandatoryFilled / mandatoryTotal` as the fill ratio; a percentage label; a textual count `(filled/total)`; the `targetStatus` label.
- **FR-007**: Bar coloring MUST follow these thresholds: red band when percentage `< 50%`, amber band when `>= 50%` and `< 100%`, green band when `= 100%`, neutral gray when `mandatoryTotal = 0`.
- **FR-008**: Hovering over the bar MUST display a tooltip listing the first **5** `missingMeasures[]` entries (their `measureCode` and label), with an overflow indicator (`+ X more`) when more than 5 entries are present, and a "Refresh readiness" link that triggers a one-shot HTTP refresh. Entries beyond the first 5 are surfaced via the side panel (FR-009 / FR-011).
- **FR-009**: Clicking the bar MUST toggle a `WorkflowReadinessPanel` side panel that lists every missing and every out-of-range measure, each row clickable.
- **FR-010**: When the WebSocket subscription is not in a connected state for **at least 5 seconds**, the bar MUST show a "live updates paused" indicator (small chip next to the percentage). When the connection recovers, the indicator MUST disappear automatically within 1 second. The 5-second grace period MUST suppress transient flicker during brief reconnect attempts.

#### Component: WorkflowReadinessPanel (side panel)

- **FR-011**: A `WorkflowReadinessPanel` component (or sibling under the same folder) MUST render two sections — "Missing mandatory measures" and "Out-of-range measures" — sourced from the latest `WorkflowReadiness` payload.
- **FR-012**: Clicking a missing-measure row MUST scroll the page to the matching row in `MeasurePanel` (matched by `measureCode`). When no `MeasurePanel` row exists for that code, the panel MUST open the Phase 002 catalog-backed "Add measure" dialog pre-filled to that template (and the ad-hoc dialog only if the catalog template is no longer available **and** the user has the `CHEF_SECTEUR` or `ADMIN_IT` role).
- **FR-013**: Clicking an out-of-range-measure row MUST scroll to the matching `MeasurePanel` row and apply a brief visual highlight (pulse) so the user can immediately spot it.
- **FR-014**: When `missingMeasures[]` and `outOfRangeMeasures[]` are both empty, the panel MUST render an "All mandatory measures complete" empty state.

#### Ticket detail page wire-up

- **FR-015**: `TicketDetailComponent` MUST embed `WorkflowReadinessBar` at the top of the ticket header section (above `MeasurePanel`).
- **FR-016**: The existing "Submit for Review" button on `TicketDetailComponent` MUST be `[disabled]` when `WorkflowReadiness.canTransition === false`, and its label MUST become `Submit for review (mandatoryFilled / mandatoryTotal)` when blocked. The label MUST revert to the standard label when unblocked. During initial page load, before the first `getReadiness` response is received, the button MUST be `[disabled]` with the label "Loading…" and the bar MUST render a PrimeNG `Skeleton` placeholder.
- **FR-017**: When `TicketService.submitReview(...)` rejects with the typed 422 error from FR-003, the page MUST show a PrimeNG toast naming the count of `blockingReasons` and MUST open the `WorkflowReadinessPanel` automatically.
- **FR-018**: The Submit-for-Review button's visibility (vs. its enabled state) MUST continue to be governed by the existing role rules and the ticket's current status; this phase does not change those rules.

#### Live updates and degradation

- **FR-019**: The page MUST refresh readiness state from the WebSocket payload as it arrives, without any full page reload, and MUST debounce rapid bursts of updates to at most one render per ~200 ms.
- **FR-020**: When the WebSocket connection is not available, every successful measure mutation performed via `MeasurePanel` (insert, update, delete, batch) MUST trigger a one-time `TicketService.getReadiness(...)` call that refreshes the bar. This requirement MUST be satisfied without modifying `MeasurePanel`'s public API — it MUST be wired through an existing event/output channel or through the ticket detail page's own coordination.
- **FR-021**: The "Refresh readiness" link in the bar's tooltip MUST issue a single `TicketService.getReadiness(...)` call when clicked, regardless of WebSocket state.
- **FR-021a**: When the WebSocket is paused, the bar MUST NOT poll the readiness endpoint on a timer. The only fallback refresh paths are the mutation-driven refresh (FR-020) and the manual "Refresh readiness" link (FR-021).

#### Stack and conventions

- **FR-021b**: `WorkflowReadinessBar` MUST render its textual count and status inside an `aria-live="polite"` region so that screen readers announce readiness updates (e.g., "14 of 16 mandatory measures complete") without interrupting active speech. The Submit-for-Review button's disabled state is conveyed by the native `[disabled]` attribute and does not require additional ARIA.
- **FR-022**: All new components and the new model MUST be NgModule-based (`standalone: false`), declared in `app.module.ts`, use the centralized PrimeNG module, the `lara-dark-blue` theme, the `--sage-*` CSS variables, DM Sans / JetBrains Mono fonts, and the `app` component prefix (Constitution principle 11).
- **FR-023**: No new dependencies MUST be added. The bar uses the PrimeNG `ProgressBar`, `Sidebar` (or `OverlayPanel` — design decision in plan.md), `Toast`, and existing icons. The WebSocket layer reuses the existing `WebSocketService`.
- **FR-024**: Role-gating rules for the Submit-for-Review button are governed by the existing routing/role rules; the readiness bar and side panel are visible to every role that can already open the ticket detail page.

#### Tests

- **FR-025**: Karma/Jasmine tests MUST cover `WorkflowReadinessBar` rendering under each of these states: `canTransition = true` (green, no counter), `canTransition = false` with 50–99% filled (amber, counter), `canTransition = false` with <50% filled (red), `mandatoryTotal = 0` (gray neutral), and WebSocket-paused (indicator visible).
- **FR-026**: Karma/Jasmine tests MUST cover `TicketDetailComponent`'s behavior on a 422 response from `submitReview`: the typed error is thrown, the toast is shown, and the side panel opens with the right `missingMeasures[]` content.
- **FR-027**: Karma/Jasmine tests MUST cover `TicketService.getReadiness(...)` using `HttpClientTestingModule`, including the `?targetStatus=` query string and the 422-with-DTO error path.

### Key Entities

- **WorkflowReadiness**: A non-mutating snapshot of a ticket's readiness for a specific status transition. Carries the ticket id, the current and target statuses, counts of mandatory measures total and filled, the lists of missing and out-of-range measures, the `canTransition` flag (the only field the UI uses to enable/disable the submit action), and human-readable blocking reasons.
- **WorkflowReadiness update message**: The WebSocket payload pushed on `/topic/validation/{id}/readiness` whenever a measure is inserted, updated, or deleted on that ticket. Same shape as `WorkflowReadiness`.
- **TicketStatus**: Reused from the existing `src/app/shared/enums/ticket-status.ts`. This phase reads `EN_COURS` and `EN_REVUE` for filtering and labeling but does not introduce new statuses.
- **MissingMeasure / OutOfRangeMeasure rows**: Read-only display rows inside the side panel, each tied to a `measureCode` so navigation back to `MeasurePanel` is a code-equality match.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user opening any `EN_COURS` ticket sees a readiness bar within 1 second of the page rendering, correctly displaying `mandatoryFilled / mandatoryTotal` for that ticket.
- **SC-002**: When a measure is added or updated via `MeasurePanel`, the readiness bar reflects the new state within 1 second over the WebSocket channel under normal network conditions; under a degraded (WS-paused) channel, the bar refreshes within 1 second of the mutation's HTTP response.
- **SC-003**: 100% of `EN_COURS` tickets with at least one mandatory measure in `NOT_EXECUTED` state render the "Submit for Review" button disabled with the `(filled/total)` counter label. 0% can be submitted by a normal user-driven click while blocked.
- **SC-004**: When a force-submission produces HTTP 422 (e.g., via a stale UI), the toast + side panel are shown within 1 second and the side panel lists exactly the measures the backend named as blockers.
- **SC-005**: Clicking a missing-measure row in the side panel scrolls the page to the matching `MeasurePanel` row (or opens the Phase 002 catalog dialog pre-filled to that template) in under 1 second.
- **SC-006**: When the WebSocket is unavailable, the user never sees a stale "filled" count after a successful measure mutation — the bar always reflects post-mutation state within 1 second of the mutation's HTTP response.
- **SC-007**: 100% of measure-readiness color thresholds match the spec: <50% red, 50–99% amber, 100% green, 0-total gray. Independently verifiable via the rendered DOM.
- **SC-008**: Karma/Jasmine test suite for the phase passes locally with `npm test`, with `WorkflowReadinessBar`, `TicketService.getReadiness`, and the 422-handling path on `TicketDetailComponent` covered.

## Assumptions

- The backend deliverables of Phase 003 (the `WorkflowReadinessDTO`, the `GET /api/validations/{id}/readiness` endpoint, the HTTP 422 contract on `submit-review`, and the WebSocket topic `/topic/validation/{id}/readiness`) are produced in the parallel backend project and are contract-stable before frontend integration testing. The frontend can mock responses against the contract until the backend is merged.
- Phase 002's `MeasurePanel`, `ValidationMeasureService`, `MeasureStatusBadge`, and the new `ValidationMeasure` model are already merged and stable. This phase reuses them without modification.
- The existing `WebSocketService` (STOMP over SockJS at `http://localhost:8089/ws`) already supports per-topic subscribe/unsubscribe with deduplication, and is the channel used by this phase.
- The existing `TicketService.submitReview(...)` method exists and is called by the ticket detail page; this phase enriches its error-handling but does not invent the method.
- The role taxonomy and routing guards described in the project `CLAUDE.md` remain unchanged. The Submit-for-Review button's visibility rules (already enforced by routing/role guards) are not modified by this phase.
- Conformity verdict and verdict-override UI are out of scope (Phase 005). This phase only enforces the `EN_COURS → EN_REVUE` transition guard.
- The Sagemcom log importer (Phase 004) is out of scope; this phase does not depend on log-driven measure inserts but will naturally benefit from them when Phase 004 lands.
- The Karma/Jasmine framework already configured in the project is the unit-testing target; no new test framework is introduced.
