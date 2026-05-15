# Quickstart: Workflow Guard — Frontend (Phase 003)

**Goal**: bring up the workflow-guard frontend locally and walk a reviewer through the readiness bar, the disabled Submit button, the side panel, and the WS-paused fallback end-to-end in under 5 minutes.

---

## Prerequisites

- Node 18+, npm 9+, Angular CLI installed globally (`npm i -g @angular/cli`) — same versions as the rest of the project.
- The sibling Spring Boot backend on `http://localhost:8089` with the Phase 003 branch (`003-workflow-guard`) deployed: `/api/validations/{id}/readiness` responds, `PATCH /submit-review` returns 422 with a `WorkflowReadinessDTO` body when blocked, and the STOMP topic `/topic/validation/{id}/readiness` pushes on every measure mutation.
- Phase 002 already merged: `ValidationMeasureService`, `MeasurePanel`, `validation_measure` table seeded.
- Phase 001 already merged: at least one PosteType catalog seeded (default: `WIFI_CONDUIT` with 16 mandatory templates).
- Keycloak on `http://localhost:8180`, realm `sageline`, client `sageline-frontend`, with at least one test user per role (`TECH_VAL`, `EXPERT`, `CHEF_SECTEUR`, `ADMIN_IT`).
- A ticket in status `EN_COURS` against a `WIFI_CONDUIT` zone, with the catalog seeded as `NOT_EXECUTED` (see Phase 002 quickstart §2 for seeding).

---

## Run the frontend

```bash
cd sageline-frontend
npm install          # no-op if dependencies haven't changed since Phase 002
ng serve             # http://localhost:4200
```

No new dependencies are required for this phase — `npm install` is a no-op if you've built before.

---

## Walk-through

### 1. Open a ticket — see the bar

1. Log in as `TECH_VAL`.
2. Navigate to **Validations** → open a ticket in status `EN_COURS` with the catalog seeded.
3. Expected: a progress bar appears above the **Measures** panel showing `0 / 16 (0%)` in the red band. The text reads `Submit for review (0/16)` on the disabled Submit button below.
4. Hover the bar: a tooltip lists the first 5 missing measures (codes + labels) plus `+ 11 more — click the bar to see all` and a `Refresh readiness` link.

### 2. Add measures — see the bar update live

1. Use **MeasurePanel** to fill 8 measures (mix of OK and OUT_OF_RANGE values).
2. Expected after the 8th save: the bar reads `8 / 16 (50%)` in the amber band within 1 second, **without a manual refresh**. The Submit-button label updates to `Submit for review (8/16)`.
3. Open the browser devtools Network tab and observe a STOMP frame on `/topic/validation/{id}/readiness` after each mutation.

### 3. Click the bar — see the side panel

1. Click the readiness bar.
2. Expected: a right-anchored side panel slides in with two sections:
   - **Missing mandatory measures** — 8 rows.
   - **Out-of-range measures** — N rows (depending on how many OUT_OF_RANGE values you entered in §2).
3. Click a missing-measure row.
4. Expected: the page scrolls to the matching row in `MeasurePanel`. If the row does not exist yet (because the catalog template was not yet instantiated), the Phase 002 catalog-backed **Add measure** dialog opens pre-filled to that template.
5. Click an out-of-range row.
6. Expected: the page scrolls to the matching row in `MeasurePanel` and that row pulses with the `--sage-highlight` color for ~1.5 s.

### 4. Try to submit while blocked — see the 422 path

1. Open a separate browser devtools console.
2. Run:
   ```js
   ng.getInjector(document.querySelector('app-root'))
     .get('TicketService')
     .submitReview(<ticketId>)
     .subscribe({ error: e => console.log(e.name, e.readiness) });
   ```
3. Expected: a `WorkflowReadinessBlockedError` is logged with a populated `.readiness` payload. A toast appears in the UI naming the count of blocking reasons; the side panel opens automatically if it was closed.

### 5. Fill the remaining mandatory measures — see the bar turn green

1. Fill the remaining 8 mandatory measures in `MeasurePanel`.
2. Expected: the bar reaches `16 / 16 (100%)` in the green band within 1 second of the last save. The Submit button becomes enabled and its label reverts to `Submit for review` (no counter suffix).
3. The `aria-live` region announces `16 of 16 mandatory measures complete, ready for review` to a screen reader (verify with the OS narrator or the Chromium accessibility tab).

### 6. Submit for real — see the happy path

1. Click **Submit for review**.
2. Expected: the request returns 200, the ticket status transitions to `EN_REVUE`, and the existing post-submit UX takes over.

### 7. Simulate WS drop — see the paused fallback

1. Stop the backend or block port 8089 in your OS firewall.
2. Expected after ~5 seconds: a `live updates paused` chip appears next to the percentage on the bar.
3. In `MeasurePanel`, perform a measure mutation that the backend would normally accept (e.g., on a still-open second tab, or via a queued local request). Without the backend up, the mutation fails — for a proper test, restart the backend and observe that the chip disappears within 1 second of reconnect.
4. While paused, click the `Refresh readiness` link inside the bar's tooltip.
5. Expected: a single HTTP GET is issued and the bar refreshes. No timer-based polling is observable in the Network tab while paused.

### 8. Verify role visibility

1. Log out, log back in as `EXPERT`.
2. Open the same ticket.
3. Expected: the readiness bar is **visible** and live-updating. The Submit-for-Review button is **absent** (existing role-gating; Phase 003 does not change it).
4. Log out, log back in as `RESPONSABLE` — same expectations.

### 9. Run the unit tests

```bash
ng test --watch=false --browsers=ChromeHeadless \
  --include='src/app/services/ticket.service.spec.ts' \
  --include='src/app/pages/Ticket/ticket-detail/ticket-detail.component.spec.ts' \
  --include='src/app/shared/components/workflow-readiness-bar/workflow-readiness-bar.component.spec.ts' \
  --include='src/app/shared/components/workflow-readiness-panel/workflow-readiness-panel.component.spec.ts'
```

Expected: all 4 spec files pass. Coverage of the new code paths is per `research.md` R12.

---

## Acceptance checklist (matches spec Success Criteria)

- [ ] SC-001 — the bar renders within 1 s of ticket detail page load with correct `(filled/total)` for the ticket.
- [ ] SC-002 — a measure mutation reflects in the bar within 1 s over WebSocket (live), or within 1 s of the mutation's HTTP response (WS-paused).
- [ ] SC-003 — every `EN_COURS` ticket with a NOT_EXECUTED mandatory measure renders Submit disabled with the `(filled/total)` counter; none can be submitted by user click while blocked.
- [ ] SC-004 — on HTTP 422, toast + side panel appear within 1 s and list exactly the backend-named blockers.
- [ ] SC-005 — clicking a missing-measure row in the side panel scrolls to the matching `MeasurePanel` row (or opens the Phase 002 dialog pre-filled) in under 1 s.
- [ ] SC-006 — under WS-paused conditions, the bar never lags behind a successful HTTP mutation by more than 1 s.
- [ ] SC-007 — color thresholds verified: red < 50%, amber 50–99%, green 100%, gray (`total = 0`).
- [ ] SC-008 — `ng test` passes the four new/modified spec files.

---

## Troubleshooting

- **Bar stays in skeleton state forever** — the initial `getReadiness(...)` call is failing. Check the Network tab: `GET /api/validations/{id}/readiness` should return 200. Verify the backend Phase 003 branch is deployed.
- **Bar never updates over WebSocket** — confirm the STOMP CONNECT succeeded (Network tab → WS frames). The existing `WebSocketService` logs a console message on connect/disconnect. If CONNECT fails, the bar still works via §2's measure-mutation fallback.
- **422 path is caught as a generic error** — check that `TicketService.submitReview` is piping through the `catchError` from data-model §2. If the consumer sees a raw `HttpErrorResponse`, the transform did not run.
- **Side panel click does nothing** — confirm `MeasurePanel.scrollToMeasureCode(...)` is implemented and that rows carry a `data-measure-code` attribute (Phase 002 forward-port; see research R2).
- **"Live updates paused" chip flickers on a stable connection** — the 5 s grace period (R4) is configured. If still flickering, inspect `WebSocketService.connected$` — it may be emitting on every heartbeat ack; in that case the chip's debounce should swallow the transitions.
- **`aria-live` region not read by screen reader** — verify the wrapping span has `aria-live="polite"` and `aria-atomic="true"` (research R7); the region must update its text content, not be replaced by a sibling element.
