# Quickstart: ValidationMeasure Refactor — Frontend (Phase 002)

**Goal**: bring up the refactored ticket detail page locally and walk a reviewer through the new measure panel end-to-end in under 5 minutes.

---

## Prerequisites

- Node 18+, npm 9+, Angular CLI installed globally (`npm i -g @angular/cli`) — same versions as the rest of the project.
- The sibling Spring Boot backend on `http://localhost:8089` with the Phase 002 branch (`002-validation-measure-refactor`) deployed: the `validation_measure` table exists and `/api/validations/{id}/measures` responds.
- Phase 001 already merged: the `poste_measure_catalog` table is seeded for at least one PosteType (default seed: `WIFI_CONDUIT` with 16 templates).
- Keycloak on `http://localhost:8180`, realm `sageline`, client `sageline-frontend`, with at least one test user per role (`TECH_VAL`, `EXPERT`, `CHEF_SECTEUR`, `ADMIN_IT`).

---

## Run the frontend

```bash
cd sageline-frontend
npm install          # only if dependencies changed since last pull
ng serve             # http://localhost:4200
```

No new dependencies are required for this phase — `npm install` is a no-op if you've built before.

---

## Walk-through

### 1. Open a ticket — verify the panel replaces the legacy view

1. Log in as `TECH_VAL`.
2. Navigate to **Validations** → click any ticket whose zone PosteType is `WIFI_CONDUIT`.
3. Expected: the right-hand side of the page shows the new **Measures** panel. The old "Results" section is gone. A status filter (`All / OK / OUT_OF_RANGE / NOT_EXECUTED`) and a sortable PrimeNG table render.

### 2. Seed the ticket from the catalog

If the ticket has zero measures:

1. Click **Instantiate all template measures**.
2. Expected: 16 rows appear within ~2 seconds, all with the gray `NOT_EXECUTED` badge.
3. Click the button again — expected: it is now hidden (idempotent at the UI level).

### 3. Add a single catalog-backed measure

1. Click **Add measure**.
2. In the dialog, search and pick `POWER_RMS_AVG_VSA1 — ANT1 / 5500 MHz`.
3. The bounds (`13.5 / 16.5`), unit (`dBm`), antenna/frequency are pre-filled and read-only.
4. Enter `15.52` and submit.
5. Expected: the dialog closes, a success toast appears, the row updates to a green `OK` badge with a deviation progress bar at ~33% (green band).

### 4. Add a value out of range

1. Pick another template (e.g., `POWER_RMS_AVG_VSA1 — ANT2 / 5500 MHz`).
2. Enter `20.0` and submit.
3. Expected: the row renders with a red `OUT_OF_RANGE` badge and a deviation progress bar far into the red band (numeric label shows ~433%).

### 5. Bulk-edit several rows

1. Click **Bulk edit**.
2. Edit 3+ `measuredValue` cells inline. Mix in-range and out-of-range values.
3. Click **Save all**.
4. Expected: every row that passed server validation updates with the new value, status, and deviation. A toast reports `N saved`.
5. To verify partial-success UX, edit one cell with the literal string `abc` (forcing a server-side numeric validation error), submit, and confirm: that single row stays in edit mode with an inline error, while the others persist. Toast reads `X saved, 1 failed`.

### 6. Add an ad-hoc measure (supervisor only)

1. Log out, log back in as `CHEF_SECTEUR`.
2. Open the same ticket — expected: the **Add ad-hoc measure** button is now visible.
3. Log out, log back in as `TECH_VAL`.
4. Open the ticket — expected: the **Add ad-hoc measure** button is not present anywhere.

### 7. Verify read-only behavior

1. Log in as `RESPONSABLE` (or `EXPERT`).
2. Open the ticket.
3. Expected: the table is visible, but **Add measure**, **Add ad-hoc measure**, **Bulk edit**, **Instantiate all** are all absent. Per-row delete icons are absent.

### 8. Verify the legacy shim

1. In a browser devtools console, paste:
   ```js
   ng.getInjector(document.querySelector('app-root'))
     .get('ValidationResultService')   // or via the dev tools' Angular inspector
     .listByValidation(<ticketId>).subscribe(console.log);
   ```
2. Expected: a `console.warn('[deprecated] ValidationResultService.listByValidation — migrate to ValidationMeasureService')` appears. The returned data has the new `ValidationMeasure` shape (the shim mapped it).

### 9. Run the unit tests

```bash
ng test --watch=false --browsers=ChromeHeadless \
  --include='src/app/services/validation-measure.service.spec.ts' \
  --include='src/app/pages/Ticket/measure-panel/measure-panel.component.spec.ts' \
  --include='src/app/shared/components/measure-status-badge/measure-status-badge.component.spec.ts' \
  --include='src/app/shared/components/deviation-progress/deviation-progress.component.spec.ts' \
  --include='src/app/shared/pipes/measure-unit.pipe.spec.ts'
```

Expected: all 5 spec files pass. Coverage of the new code paths is per `research.md` R12.

---

## Acceptance checklist (matches spec Success Criteria)

- [ ] SC-001 — every opened ticket renders the new panel; legacy "Results" panel is gone.
- [ ] SC-002 — adding one catalog-backed measure end-to-end finishes under 20 s.
- [ ] SC-003 — seeding 16+ catalog templates in one click renders under 2 s.
- [ ] SC-004 — 10+ row bulk update completes under 3 s end-to-end (local backend, idle network).
- [ ] SC-005 — green / red / gray badge mapping verified across at least one measure in each state.
- [ ] SC-006 — grep the codebase: zero references to the old `validation-result.component.html` markup in any rendered template.
- [ ] SC-007 — `RESPONSABLE` walkthrough shows zero mutating buttons.
- [ ] SC-008 — `ng test` passes the new specs.

---

## Troubleshooting

- **Panel renders empty even after seeding** — confirm the ticket's zone PosteType has catalog rows. Hit `GET /api/poste-catalog/<PosteType>/measures` directly.
- **All rows show `NOT_EXECUTED` even after entering values** — backend probably did not recompute. Verify the response payload includes a non-null `status` and a numeric `deviationPct`. The frontend trusts the server (R6).
- **Legacy `validation-result.component` still appears** — search the project for stale imports: `grep -rn "ValidationResultComponent" src/`. Remove residual selectors.
- **Toast says `0 saved, N failed` after bulk edit** — backend likely rejected the whole batch with a 400 instead of returning per-row `status="error"`. Confirm the batch endpoint matches §5 of `contracts/validation-measure-api.md`.
