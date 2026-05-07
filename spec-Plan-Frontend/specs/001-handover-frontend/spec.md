# Feature Specification: Handover System — Angular Frontend

**Feature Branch**: `001-handover-frontend`
**Created**: 2026-05-06
**Status**: Draft
**Scope**: Frontend only — backend (Spring Boot) is fully implemented and tested.
**Input**: Phase 4 of Plan.md — Angular Components & UX for the Shift-End Ticket Handover System

---

## Clarifications

### Session 2026-05-06

- Q: How is the zone ID available for the CHEF_SECTEUR WebSocket subscription to `/topic/handover.zone.{zoneId}`? → A: Not exposed yet — extend `syncCurrentUser()` to also store zone ID from `/api/users/me` response in localStorage (same pattern as `sageline_user_id`).
- Q: How should the frontend fetch the list of assignable TECH_VAL users for the assignment dropdown? → A: Use existing `UserService` with a role filter parameter (e.g., `getUsers({ role: 'TECH_VAL' })`).
- Q: How does ticket-detail stay current with live ticket status changes (for HandoverBanner auto-show/hide)? → A: ticket-detail subscribes to `/user/{userId}/queue/tickets` WebSocket topic and reloads the ticket on any incoming message — no polling.
- Q: How is the sidebar navigation managed (for adding the "Passations" entry)? → A: Nav items are a TypeScript array in the layout/sidebar component class — add a new object to the array.
- Q: What should HandoverQueuePanel and HandoverAcceptPanel show during loading and when empty? → A: `p-skeleton` rows while loading; `p-message` severity `info` (e.g., "Aucune passation en attente") when the result set is empty.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — TECH_VAL Initiates a Handover (Priority: P1)

A validation technician (`TECH_VAL`) who is actively working on a ticket in `EN_COURS` status
needs to voluntarily transfer ownership before their shift ends. They open the ticket detail
page, click "Initier la passation", fill in a progress summary and a handover note, and
submit. The ticket immediately reflects the new `EN_ATTENTE_HANDOVER` status and the
technician sees a confirmation banner.

**Why this priority**: This is the primary user-facing flow for the handover feature. Without
it, technicians cannot initiate the transfer that the rest of the system depends on.

**Independent Test**: Navigate to a ticket in `EN_COURS` as `TECH_VAL`, click the initiate
button, fill the form, submit — verify the ticket status changes to `EN_ATTENTE_HANDOVER` and
the amber handover banner appears on the page.

**Acceptance Scenarios**:

1. **Given** a ticket in `EN_COURS` is open in ticket-detail as `TECH_VAL`,
   **When** the technician clicks "Initier la passation" and submits a filled form,
   **Then** the dialog closes, the ticket status refreshes to `EN_ATTENTE_HANDOVER`,
   and a warning banner appears on the detail page.

2. **Given** the handover dialog is open,
   **When** the technician submits without filling the handover note,
   **Then** the form shows a validation error and does not call the API.

3. **Given** the API call to initiate the handover fails,
   **When** the error is returned,
   **Then** a PrimeNG error toast is displayed and the dialog remains open.

---

### User Story 2 — TECH_VAL Accepts a Pending Handover (Priority: P1)

An available `TECH_VAL` sees a pending handover in their personal notification queue or
navigates directly to `/validations/:id/handover`. They review the previous technician's
progress summary and handover note, then click "Accepter la passation". The ticket resumes
under their ownership and they are redirected to the ticket detail page with status `EN_COURS`.

**Why this priority**: Accepting is the completion step that unblocks the ticket. Without it,
the handover system cannot complete its lifecycle.

**Independent Test**: As a `TECH_VAL`, navigate to `/validations/:id/handover` for a
`PENDING` handover — verify the accept panel shows the previous tech's notes, click accept,
and verify redirection to ticket detail with `EN_COURS` status.

**Acceptance Scenarios**:

1. **Given** a handover is `PENDING` for ticket VAL-2026-0042,
   **When** a `TECH_VAL` visits `/validations/42/handover` and clicks "Accepter la passation",
   **Then** the handover status becomes `COMPLETED`, the ticket status becomes `EN_COURS`,
   and the user is redirected to `/validations/42`.

2. **Given** the accept panel is loaded,
   **When** the page renders,
   **Then** the previous technician's name, progress summary, handover note, and creation
   timestamp are all visible.

3. **Given** a user without `TECH_VAL`, `CHEF_SECTEUR`, or `ADMIN_IT` role,
   **When** they try to access `/validations/:id/handover`,
   **Then** the route guard redirects them to `/access-denied`.

---

### User Story 3 — CHEF_SECTEUR Manages the Handover Queue (Priority: P2)

A `CHEF_SECTEUR` has a dedicated queue page `/handovers/queue` showing all pending handovers
across their zones in a live table. They can assign a specific `TECH_VAL` to a pending
handover using a dropdown picker, or cancel a handover. The table updates in real time when
new handovers arrive via WebSocket without requiring a page refresh.

**Why this priority**: Supervisor tooling is the key operational value of the system — it
allows the `CHEF_SECTEUR` to intervene when no technician self-assigns.

**Independent Test**: As `CHEF_SECTEUR`, navigate to `/handovers/queue` — verify the pending
handovers table loads, assign a technician from the dropdown, verify the row updates, and
trigger a new handover from another browser tab to verify the live WebSocket update.

**Acceptance Scenarios**:

1. **Given** there are pending handovers in the zone,
   **When** the `CHEF_SECTEUR` loads `/handovers/queue`,
   **Then** a table displays all pending handovers with columns: ticket code, zone,
   outgoing technician, created-at, and action buttons.

2. **Given** a pending handover row is displayed,
   **When** the supervisor selects a technician from the "Assigner" dropdown and confirms,
   **Then** the API is called with the selected tech's ID and a success toast is shown.

3. **Given** the queue page is open,
   **When** a new handover is triggered for the zone via WebSocket,
   **Then** the new row appears in the table without a page refresh.

4. **Given** a pending handover row,
   **When** the supervisor clicks "Annuler",
   **Then** a confirmation dialog appears; on confirmation, the handover is cancelled
   and the row is removed from the table.

5. **Given** a user with only `TECH_VAL` role,
   **When** they navigate to `/handovers/queue`,
   **Then** the route guard redirects them to `/access-denied`.

---

### User Story 4 — Ticket Detail Shows Handover Context (Priority: P2)

On the existing `ticket-detail` page, two new sections appear when relevant: a `HandoverBanner`
shown when the ticket is in `EN_ATTENTE_HANDOVER`, and a `HandoverTimeline` showing the full
history of handovers for the ticket. The banner is role-aware — it shows an "Accept" button
for `TECH_VAL` and an assignment dropdown for `CHEF_SECTEUR`/`ADMIN_IT`.

**Why this priority**: These components integrate the handover system into the existing
ticket workflow without requiring navigation away from the main detail page.

**Independent Test**: Open a ticket in `EN_ATTENTE_HANDOVER` as different roles — verify
the banner content differs per role. Open a ticket with past handovers — verify the timeline
renders below the existing ticket timeline.

**Acceptance Scenarios**:

1. **Given** a ticket is in `EN_ATTENTE_HANDOVER` and the user is `TECH_VAL`,
   **When** the ticket-detail page loads,
   **Then** an amber warning banner appears with "Ce ticket est en attente de passation."
   and an "Accepter" button linking to the accept panel.

2. **Given** a ticket is in `EN_ATTENTE_HANDOVER` and the user is `CHEF_SECTEUR`,
   **When** the ticket-detail page loads,
   **Then** the banner shows "Passation en attente — assigner un technicien" with a
   `TECH_VAL` dropdown and an assign action.

3. **Given** a ticket has one or more past handover records,
   **When** the ticket-detail page loads,
   **Then** the handover timeline renders below the existing ticket timeline, showing
   each entry with: from/to technician names, trigger type badge, handover note, and datetime.

4. **Given** a ticket has no handover history,
   **When** the ticket-detail page loads,
   **Then** the handover timeline section is not rendered.

---

### User Story 5 — Real-Time Personal Notifications (Priority: P3)

All users receive personal WebSocket notifications on `/user/{userId}/queue/handover` for
handover events affecting them (handover triggered, assigned, completed). `CHEF_SECTEUR` also
subscribes to their zone's topic `/topic/handover.zone.{zoneId}` to refresh the queue panel.
Notifications are displayed as PrimeNG toast messages.

**Why this priority**: Real-time alerts ensure users act promptly, but the core UI functions
correctly without them (users can poll manually or navigate to the queue).

**Independent Test**: Log in as `TECH_VAL` with an active ticket, trigger the shift-end
scheduler (or manually call the API), and verify a toast notification appears without any
user action.

**Acceptance Scenarios**:

1. **Given** a `TECH_VAL` has an active `EN_COURS` ticket and is logged in,
   **When** a handover is triggered for that ticket (auto or manual),
   **Then** a PrimeNG toast notification appears within 2 seconds with the handover message.

2. **Given** a `CHEF_SECTEUR` is logged in with the queue page open,
   **When** a new handover is triggered for their zone,
   **Then** the queue table updates automatically (no manual refresh required).

3. **Given** a `TECH_VAL` is assigned to a handover by a supervisor,
   **When** the assignment is made,
   **Then** the technician receives a personal toast notification indicating they have
   been assigned a ticket handover.

---

### Edge Cases

- What happens when a `TECH_VAL` tries to accept a handover that was already accepted by
  another technician? The API returns an error; the accept panel shows a user-friendly
  message and disables the accept button.
- What happens when the WebSocket connection drops while the queue page is open?
  The existing reconnection logic in `WebSocketService` handles reconnection; the queue
  data should be refreshed via HTTP on reconnect.
- What happens when a ticket exits `EN_ATTENTE_HANDOVER` while the banner is displayed?
  The banner disappears automatically when the WebSocket ticket update arrives on
  `/user/{userId}/queue/tickets` and the component reloads the ticket data.
- What if the `TECH_VAL` list is empty when a `CHEF_SECTEUR` tries to assign?
  The dropdown shows a "Aucun technicien disponible" message and the assign button is
  disabled.
- What do `HandoverQueuePanel` and `HandoverAcceptPanel` show during data loading or when
  results are empty? Loading: `p-skeleton` placeholder rows. Empty: a `p-message` with
  severity `info` (e.g., "Aucune passation en attente" / "Aucune donnée de passation").

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a dialog for `TECH_VAL` to initiate a handover with a
  progress summary and handover note for any ticket in `EN_COURS`.
- **FR-002**: System MUST display a role-aware amber banner on ticket-detail when ticket
  status is `EN_ATTENTE_HANDOVER`.
- **FR-003**: `TECH_VAL` MUST be able to accept a pending handover via a dedicated page
  at `/validations/:id/handover`, seeing the full progress context before accepting.
- **FR-004**: `CHEF_SECTEUR` and `ADMIN_IT` MUST be able to assign a specific `TECH_VAL`
  to a pending handover from both the queue page and the ticket-detail banner.
- **FR-005**: System MUST provide a live-updating queue page at `/handovers/queue` for
  `CHEF_SECTEUR` and `ADMIN_IT` listing all `PENDING` handovers.
- **FR-006**: System MUST allow `CHEF_SECTEUR` and `ADMIN_IT` to cancel a pending handover
  from the queue page.
- **FR-007**: System MUST display a handover timeline on ticket-detail showing the full
  handover history for the ticket, rendered only when history exists.
- **FR-008**: System MUST subscribe to personal WebSocket topic `/user/{userId}/queue/handover`
  for all authenticated users and display toast notifications for handover events.
- **FR-009**: `CHEF_SECTEUR` MUST also subscribe to `/topic/handover.zone.{zoneId}` to
  receive real-time queue updates.
- **FR-010**: Routes `/validations/:id/handover` and `/handovers/queue` MUST be protected
  by `AuthGuard` with the role sets defined in `Plan.md`.
- **FR-011**: The sidebar MUST show a "Passations" navigation entry with `pi pi-arrows-h`
  icon and a pending-count badge, visible only to `CHEF_SECTEUR` and `ADMIN_IT`.
- **FR-012**: The `ticket-status.enum.ts` MUST be extended with `EN_ATTENTE_HANDOVER`,
  its display label, and its color mapping.
- **FR-015**: `HandoverQueuePanel` and `HandoverAcceptPanel` MUST display `p-skeleton`
  placeholder rows while data is loading and a `p-message` with severity `info` when the
  result set is empty. No blank or broken layout may be shown during these states.
- **FR-014**: `ticket-detail` MUST subscribe to `/user/{userId}/queue/tickets` via
  `WebSocketService` and reload the ticket data on any incoming message, so that
  `HandoverBannerComponent` appears and disappears automatically without a page refresh.
- **FR-013**: `AuthService.syncCurrentUser()` MUST be extended to store the authenticated
  user's zone ID in localStorage under key `sageline_zone_id`, sourced from the `/api/users/me`
  response, so that `AppComponent` can wire the CHEF_SECTEUR zone WebSocket subscription
  without an additional HTTP call.

### Key Entities

- **HandoverResponse**: Represents a single handover record as returned by the backend API.
  Fields: `id`, `validationId`, `ticketCode`, `fromTechUsername`, `toTechUsername` (nullable),
  `handoverNote`, `progressSummary`, `status` (HandoverStatus), `triggeredBy` (TriggerType),
  `scheduledAt`, `acceptedAt` (nullable).
- **HandoverInitiateRequest**: Payload to initiate a handover. Fields: `handoverNote`,
  `progressSummary`.
- **HandoverStatus**: Enum — `PENDING`, `ACCEPTED`, `COMPLETED`, `CANCELLED` with display
  labels and PrimeNG severity mappings.
- **TriggerType**: Enum — `MANUAL`, `SHIFT_END_AUTO`, `ADMIN_FORCE` with display labels.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A `TECH_VAL` can initiate a handover in under 60 seconds — from clicking the
  button to seeing the confirmation banner.
- **SC-002**: A `TECH_VAL` can accept a handover and resume work in under 30 seconds —
  from landing on the accept panel to being on the ticket detail page.
- **SC-003**: `CHEF_SECTEUR` can assign a technician to a pending handover in under 45
  seconds from the queue page.
- **SC-004**: Real-time WebSocket notifications appear within 3 seconds of the server event
  with no manual user action.
- **SC-005**: The handover queue page reflects a new pending handover without page reload
  within 3 seconds of it being created.
- **SC-006**: All 5 handover-related UI components render without console errors in the
  Angular dev server.
- **SC-007**: All role-restricted routes correctly redirect unauthorized users — 0 access
  leaks across 6 defined roles.
- **SC-008**: The feature introduces 0 regressions to existing ticket-list, ticket-detail,
  and messaging pages as verified by manual testing of the golden paths.

---

## Assumptions

- The backend `/api/handovers` endpoints are fully implemented, tested, and available at
  `http://localhost:8089/api`. No backend changes are required as part of this feature.
- The existing `WebSocketService.subscribe()` correctly deduplicates topics — callers do
  not need to manage deduplication themselves.
- `AuthService` does not currently expose `getUserZoneId()`. `syncCurrentUser()` MUST be
  extended to also store the user's zone ID in localStorage (key: `sageline_zone_id`) from
  the `/api/users/me` response. `AppComponent` reads this value when wiring the CHEF_SECTEUR
  zone WebSocket subscription.
- `TECH_VAL` users available for assignment are fetched via the existing `UserService` using
  a role filter parameter (`role=TECH_VAL`). No new endpoint or client-side filtering needed.
- PrimeNG `p-dialog`, `p-table`, `p-timeline`, `p-message`, `p-toast`, and `p-dropdown`
  are already available through `primeng.module.ts` or will be added to it before use.
- The sidebar navigation is driven by a TypeScript array of nav item objects in the
  layout/sidebar component class. The "Passations" entry is added as a new object in that
  array with `label`, `icon`, `routerLink`, `roles`, and `badge` properties.
- The `lara-dark-blue` PrimeNG theme and `--sage-*` CSS variables apply automatically to
  all new components without additional setup.
- No unit or integration tests are required for this frontend feature (PFE project scope).
