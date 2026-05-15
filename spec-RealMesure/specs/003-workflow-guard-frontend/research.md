# Research: Workflow Guard — Frontend (Phase 003)

**Date**: 2026-05-15
**Spec**: [spec.md](./spec.md)

All open questions from `/speckit-specify` and `/speckit-clarify` (sessions 2026-05-14 and 2026-05-15) are resolved either in the spec's Clarifications section or below. Zero `NEEDS CLARIFICATION` markers remain.

---

## R1 — PrimeNG primitive for the side panel (`Sidebar` vs. `OverlayPanel`)

**Decision**: PrimeNG `Sidebar` anchored right, modal-less (`[modal]="false"`), with `position="right"` and a fixed width of 28rem.

**Rationale**: The side panel can carry tens of rows (FR-014 anticipates large lists with virtualization-friendly markup). A right-aligned slide-in panel preserves the user's view of `MeasurePanel`, which is required by the click-to-scroll interaction in Story 3 — the user clicks a row in the panel and expects the underlying page to be partially visible so the scroll target is observable. `OverlayPanel` is positioned relative to its trigger, can't be persistent across scroll, and clips at viewport edges with long lists.

**Alternatives considered**:
- `OverlayPanel`: rejected — fixed sizing constraints and trigger-anchored positioning are wrong for a list-of-blockers UI.
- A new full-page route: rejected — violates Constitution XI (no new feature modules / no new routes for this phase) and breaks the inline scroll-to-row workflow.

---

## R2 — Scroll-into-view technique from side panel row → `MeasurePanel` row

**Decision**: `MeasurePanel` exposes a public method `scrollToMeasureCode(code: string): void` reachable via a `@ViewChild` reference from `TicketDetailComponent`. The method finds the matching row in the rendered table by `data-measure-code` attribute and calls `Element.scrollIntoView({ behavior: 'smooth', block: 'center' })`, then applies a `.is-highlighted` class for 1.5 s via `setTimeout`.

**Rationale**: Imperative ViewChild call keeps the bar/panel decoupled from `MeasurePanel`'s internal state. `data-measure-code` is a stable, easy-to-test selector that doesn't require row-index math (the user may have filtered or sorted the panel between page load and click). The CSS class transition is reused from the existing `--sage-highlight` token; no new design token added.

**Alternatives considered**:
- RxJS event bus / shared service: rejected — adds an indirection layer for a single-page interaction; ViewChild is the existing Angular idiom in this codebase (used in `ticket-detail` for other inline panels).
- Anchor-link with element id: rejected — collides with the global URL hash and triggers a browser jump that breaks smooth-scroll.

---

## R3 — WebSocket subscription pattern

**Decision**: Subscribe in `TicketDetailComponent.ngOnInit` (after `ticketId` is known from the route) via `webSocketService.subscribe('/topic/validation/{id}/readiness', payload => this.onReadinessUpdate(payload))`. Unsubscribe in `ngOnDestroy`. The existing `WebSocketService` already deduplicates topic subscriptions; no extra guard needed. Burst updates are debounced via `auditTime(200)` from the component side (FR-019).

**Rationale**: The existing service already manages SockJS reconnect logic and queues subscriptions if the client is not yet connected. Component-scoped lifecycle ensures we don't leak the subscription across navigations. `auditTime` over `debounceTime` because we want to apply the **latest** update on a tick, not skip intermediate ones when they pause.

**Alternatives considered**:
- A new dedicated `ReadinessSocketService`: rejected — duplicates infrastructure for one topic.
- Persisting the subscription at the app shell level: rejected — wastes traffic for users not viewing the ticket; harder to clean up.

---

## R4 — WS-disconnect detection and the 5-second grace period

**Decision**: `WorkflowReadinessBar` exposes an `Input() wsConnected: boolean` and an `Input() lastUpdateAt: Date | null`. The parent `TicketDetailComponent` reads connection state from the existing `WebSocketService` (existing `connected$: Observable<boolean>` accessor, or equivalent) and gates the "live updates paused" chip with a 5-second debounce: on `connected = false`, start a 5 s timer; if the timer elapses without reconnect, set `paused = true`. On reconnect, clear the timer and `paused = false` immediately.

**Rationale**: Matches the Q1 clarification (2026-05-15). Suppressing the chip during transient blips prevents visual flicker; clearing on reconnect matches user intuition.

**Alternatives considered**:
- Show the chip on every disconnect event regardless of duration: rejected — flickers during normal STOMP heartbeats.
- 10 s grace: rejected — too tolerant; user may take an action on stale data.

---

## R5 — Typed 422 error transform in `TicketService.submitReview`

**Decision**: The service pipes the `HttpClient.patch(...)` observable through a `catchError` that inspects `err.status === 422` and `err.error?.canTransition === false`. On match, the operator `throw`s a typed `WorkflowReadinessBlockedError extends Error` carrying the `WorkflowReadiness` payload as `error.readiness`. On non-match, it rethrows the original `HttpErrorResponse`. The consumer (`TicketDetailComponent`) does `if (e instanceof WorkflowReadinessBlockedError)` to discriminate.

**Rationale**: Keeps domain semantics inside the service layer (Constitution IV — the guard's verdict is treated as a domain event, not a network error). Consumers don't sniff `HttpErrorResponse.status` directly — that's an abstraction-leak smell repeated through the existing codebase that this phase intentionally does not propagate. The typed class is colocated with the service in `ticket.service.ts` because it is intrinsic to the contract; no need for a separate `errors/` folder.

**Alternatives considered**:
- Have the consumer parse `HttpErrorResponse` directly: rejected — couples every consumer to HTTP plumbing and makes mocking harder.
- A `Result<T, E>` return type: rejected — would force a wider refactor of `TicketService` for a single endpoint.

---

## R6 — Bar coloring thresholds and the empty-catalog case

**Decision**: Coloring follows spec FR-007: `< 50%` red, `>= 50%` and `< 100%` amber, `= 100%` green, `mandatoryTotal === 0` gray (neutral). Computation is purely a function of `mandatoryFilled / mandatoryTotal` and `canTransition`. The percentage is rounded to the nearest integer for display (e.g., 87% not 87.5%) but the bar's CSS fill uses the unrounded ratio for smooth animation.

**Rationale**: Matches FR-007 and the spec's Acceptance Scenario in Story 1. Rounding only the displayed percentage prevents two visually-different bars rendering the same label.

**Alternatives considered**:
- 4-band coloring with a "near complete" 90–99% band: rejected — adds complexity, not in spec.
- Always show 0% when `mandatoryTotal === 0`: rejected — misleading; the "no mandatory measures" empty state is a distinct UX (gray + explanatory text).

---

## R7 — `aria-live` region wording and politeness

**Decision**: The bar wraps its textual summary in `<span aria-live="polite" aria-atomic="true">{{ filled }} of {{ total }} mandatory measures complete{{ canTransition ? ', ready for review' : '' }}</span>`. The Submit-for-Review button uses native `[disabled]` (no extra ARIA — Angular renders `disabled=""` which is screen-reader-readable). On WS-paused, the chip carries `aria-label="Live updates paused"` so screen-reader users perceive the same degraded state visual users do.

**Rationale**: Matches Q5 clarification (polite, not assertive). `aria-atomic="true"` ensures the whole sentence is re-announced on each change rather than just the diff, which avoids confusing partial announcements like "16" (when only the number changes). The "ready for review" tail emphasizes the milestone screen-reader users would otherwise miss visually.

**Alternatives considered**:
- `aria-live="assertive"`: rejected — interrupts current speech on every counter tick; noisy.
- Announcing only at `canTransition` flip: rejected — Q5 chose the per-update option (A), not (D).

---

## R8 — Loading skeleton for the bar and Submit button

**Decision**: Before the first `getReadiness` response, the bar renders a PrimeNG `<p-skeleton height="2.5rem" width="100%" />` and the Submit-for-Review button renders with `[disabled]="true"` and the label `Loading…`. As soon as the first readiness arrives (success **or** error), the skeleton is replaced by the actual bar (or error state per FR error path) and the Submit button's label/disable computation takes over from FR-016.

**Rationale**: Matches Q2 clarification (option A — fail-safe). `p-skeleton` is already used in `TicketDetailComponent` for the header area on initial load, so the visual idiom is consistent.

**Alternatives considered**:
- Hide the bar entirely until first response (Q2 option B): rejected by clarification — Q2 chose A.
- Optimistic enable (Q2 option D): rejected by clarification — risks a false-enable race.

---

## R9 — Tooltip truncation at 5 + "show all in side panel"

**Decision**: The bar's hover tooltip uses the PrimeNG `pTooltip` directive with `tooltipPosition="bottom"`. Content is a multi-line string `"<measureCode> — <label>\n..."` for the first 5 entries, followed by `"+ N more — click the bar to see all"`. The "Refresh readiness" link is rendered inline below the list (visible only on hover, but technically inside the tooltip's content template, so it stays clickable per `[tooltipOptions]="{ event: 'focus' }"` already used elsewhere).

**Rationale**: Matches Q4 clarification (5 entries). PrimeNG's tooltip handles dismissal and focus interactions consistently. The "click the bar to see all" hint anchors the affordance for users who don't already know about the side panel.

**Alternatives considered**:
- Custom-positioned `OverlayPanel` for the tooltip content: rejected — overkill for read-only content; loses native PrimeNG tooltip styling consistency.
- 10 entries (Q4 option C): rejected by clarification.

---

## R10 — Refresh-after-mutation wiring without modifying `MeasurePanel`'s public API

**Decision**: `MeasurePanel` already emits an `@Output() measuresChanged = new EventEmitter<void>()` after every successful mutation (delivered in Phase 002 as part of the bulk-edit cycle). `TicketDetailComponent` binds `(measuresChanged)="onMeasuresChanged()"` and the handler calls `ticketService.getReadiness(this.ticketId)` exactly once. If Phase 002 did not in fact ship the output, the Phase 003 task list (`tasks.md`) includes a small task to add it — the output is generic enough that adding it is not a Phase 002 deviation, just a forward-port. The spec's FR-020 expressly allows this routing path.

**Rationale**: Matches FR-020 ("through an existing event/output channel or through the ticket detail page's own coordination"). Keeps `WorkflowReadinessBar` pure (it consumes inputs and emits user-intent outputs; it does not subscribe to mutations).

**Alternatives considered**:
- `MeasurePanel` directly calls `getReadiness`: rejected — couples Phase 002 to Phase 003.
- Shared signal/observable in a new "ticket page state" service: rejected — adds infrastructure for a single-page coordination.

---

## R11 — Toast deduplication on repeated 422

**Decision**: `TicketDetailComponent.onSubmitReview()` records a `lastBlockedToastAt: number` timestamp. On every 422, if `Date.now() - lastBlockedToastAt < 3000`, no new toast is shown (the side panel is still opened / kept open). Otherwise, a new toast is dispatched via PrimeNG `MessageService` and the timestamp is updated.

**Rationale**: Matches the spec's "Toast spam suppression" edge case. 3 s is short enough that a user who genuinely retries after fixing something will see a fresh toast; long enough to absorb double-clicks.

**Alternatives considered**:
- Disabling the Submit button for 3 s after a 422: rejected — the button is *already* disabled when blocked; the 422 path is a stale-UI safety net.
- Stacking toasts: rejected — visual noise.

---

## R12 — Unit-test scope and conventions

**Decision**: Karma + Jasmine. Specs colocated with sources. Coverage targets for this phase:
- `TicketService.getReadiness`: with and without `?targetStatus=` param; HTTP 200 happy path; HTTP 404 surfaces a normal error.
- `TicketService.submitReview`: 200 happy path; 422 with `WorkflowReadinessDTO` body → `WorkflowReadinessBlockedError` with `.readiness` populated; 500 → normal `HttpErrorResponse` rethrow.
- `WorkflowReadinessBar`:
    - rendering for each of the 4 color states (red `<50%`, amber `50–99%`, green `100%`, gray `total=0`)
    - skeleton state when input is `null` (initial load)
    - WS-paused chip visibility transitions via the 5 s grace period (use `fakeAsync` + `tick(5000)`)
    - `aria-live` region text content updates on input change
- `WorkflowReadinessPanel`:
    - empty state when both lists are empty
    - emits `missingMeasureClicked` / `outOfRangeMeasureClicked` events with the correct measureCode
- `TicketDetailComponent`:
    - on submit-review 422, toast is shown exactly once within a 3 s window and the side panel opens
    - on side-panel row click, `MeasurePanel.scrollToMeasureCode(...)` is called with the correct code
    - on `MeasurePanel.measuresChanged`, `ticketService.getReadiness(...)` is called

**Rationale**: This is a Constitution IV surface (guarded transitions). The bar is the user-facing contract; the typed 422 path is the recovery contract. Both must be tested.

**Alternatives considered**:
- Adding Playwright e2e: rejected — no e2e harness exists in the repo today; introducing one is out of scope (same stance as Phase 002 R12).
- Skipping the `aria-live` assertion: rejected — accessibility regressions are silent and the spec carries an explicit FR-021b.
