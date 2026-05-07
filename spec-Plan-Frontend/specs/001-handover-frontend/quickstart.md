# Quickstart: Handover System — Angular Frontend

**Feature**: 001-handover-frontend
**Date**: 2026-05-06

---

## Prerequisites

1. Spring Boot backend running on `http://localhost:8089`
2. Keycloak running on `http://localhost:8180` with realm `sageline`
3. At least two `TECH_VAL` accounts and one `CHEF_SECTEUR` account in Keycloak
4. One ticket in `EN_COURS` status with an `ACTIVE` assignment

---

## Start the Angular Dev Server

```bash
cd sageline-frontend
ng serve
# → http://localhost:4200
```

---

## Verification Scenarios

### Scenario A — Manual Handover Initiation (TECH_VAL)

1. Log in as `TECH_VAL` (e.g., Jean)
2. Navigate to a ticket in `EN_COURS` → `/validations/{id}`
3. Verify: "Initier la passation" button is visible
4. Click the button → `HandoverInitiateDialog` opens
5. Leave fields empty → click submit → verify validation error appears
6. Fill "Résumé du travail effectué" and "Note de passation"
7. Submit → verify:
   - Dialog closes
   - Ticket status badge changes to `EN_ATTENTE_HANDOVER`
   - Amber `HandoverBanner` appears at top of ticket detail

---

### Scenario B — Accept Handover (TECH_VAL)

1. Log in as a different `TECH_VAL` (e.g., Mohamed)
2. Navigate to `/validations/{id}/handover`
3. Verify: previous tech's name, progress summary, handover note, and timestamp are visible
4. Verify: `p-skeleton` appears briefly during data load
5. Click "Accepter la passation" → verify:
   - Page redirects to `/validations/{id}`
   - Ticket status is now `EN_COURS`
   - `HandoverTimeline` shows the completed handover entry

---

### Scenario C — Supervisor Queue (CHEF_SECTEUR)

1. Log in as `CHEF_SECTEUR`
2. Verify: "Passations" entry appears in the sidebar under PASSATIONS group
3. Navigate to `/handovers/queue`
4. Verify: pending handover table loads with correct columns
5. Verify: `p-skeleton` rows appear during load; `p-message` appears when empty
6. From another tab, trigger a new handover → verify the table updates without page refresh
7. Select a technician from the "Assigner" dropdown → verify success toast
8. Click "Annuler" → confirm dialog → verify row disappears

---

### Scenario D — Role Access Control

1. Log in as `TECH_PREP`
2. Navigate to `/handovers/queue` → verify redirect to `/access-denied`
3. Navigate to `/validations/{id}/handover` → verify redirect to `/access-denied`

---

### Scenario E — Real-Time Toast Notification

1. Log in as `TECH_VAL` (Jean) — keep browser tab open
2. From another browser / session, call `POST /api/handovers/initiate/{validationId}`
   (or wait for the 16:45 scheduler)
3. Verify: a PrimeNG `warn` toast appears within 3 seconds with the handover message

---

## Known Pre-Conditions

- `sageline_zone_id` in localStorage is populated only after `syncCurrentUser()` runs
  (first login after the feature is deployed). Clear localStorage and log in again if
  the CHEF_SECTEUR zone subscription doesn't fire.
- The `p-skeleton` component requires `SkeletonModule` in `primeng.module.ts`.
- The `p-confirmDialog` requires `ConfirmationService` provided at the queue panel component
  level: `providers: [ConfirmationService]`.
