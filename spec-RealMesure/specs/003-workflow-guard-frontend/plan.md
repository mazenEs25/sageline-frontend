# Implementation Plan: Workflow Guard — Frontend

**Branch**: `003-workflow-guard-frontend` | **Date**: 2026-05-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/003-workflow-guard-frontend/spec.md`

## Summary

Deliver the Angular 17 frontend for **Phase 003 — Workflow Guard** (backend track handled in the sibling Spring Boot project). Surface backend-computed `WorkflowReadiness` as a live progress bar on the ticket detail page, disable the existing "Submit for Review" button when `canTransition === false` (with a `(filled/total)` counter label), expose missing and out-of-range measures in a clickable side panel that jumps into `MeasurePanel`, and degrade gracefully when the WebSocket readiness channel is unavailable. Strict reuse of existing services (`TicketService`, `WebSocketService`, Phase 002's `MeasurePanel` / `ValidationMeasureService`) and the existing app shell. One new model, one `TicketService` method extension, one new shared bar component, one new side-panel component, and the wire-up + 422 error handling in `TicketDetailComponent`. No new dependencies, no new feature module, no new routes.

## Technical Context

**Language/Version**: TypeScript ~5.4 on Angular 17.3 (NgModule mode, `standalone: false`)
**Primary Dependencies**: `primeng@17.18` (`ProgressBar`, `Sidebar`, `Tooltip`, `Toast`, `Skeleton`, `Badge`, `Button`), `primeicons@7`, `primeflex@4`, `keycloak-angular@15`, RxJS ~7.8, `@stomp/stompjs` / `sockjs-client` (already wired via existing `WebSocketService`). No new dependencies.
**Storage**: N/A on the frontend. Backend persists nothing new for the readiness path beyond what Phase 002 already persists; readiness is computed on demand and pushed via STOMP.
**Testing**: Karma + Jasmine. This phase ships **guarded transition UX** (Constitution IV), so test coverage is mandatory for: every coloring band of the bar, the 422-with-DTO error path on `submit-review`, the WS-paused indicator, the loading skeleton state, the `aria-live` text content on update, and the typed-error transform in `TicketService`. HTTP spec uses `HttpClientTestingModule`; WS interactions use a thin in-memory stub of `WebSocketService.subscribe(...)`.
**Target Platform**: Modern evergreen browsers (Chrome / Edge / Firefox) — existing app support matrix.
**Project Type**: Web frontend — Angular SPA, talks to Spring Boot `http://localhost:8089/api` and STOMP-over-SockJS `http://localhost:8089/ws`.
**Performance Goals**: First readiness response rendered ≤ 1 s after page load (SC-001); WebSocket-driven update applied ≤ 1 s after backend push (SC-002); WS-paused fallback refresh ≤ 1 s after the triggering measure mutation's HTTP response (SC-006); WS-burst debounce ≤ 200 ms (FR-019); WS-disconnect grace period before "live updates paused" indicator = 5 s (FR-010); tooltip truncation at 5 missing entries (FR-008).
**Constraints**: Reuse existing app shell (`LayoutComponent`). Reuse centralized PrimeNG module. Reuse `lara-dark-blue` theme, `--sage-*` tokens, DM Sans / JetBrains Mono fonts, `app` selector prefix. No new dependencies. No standalone components. No new feature modules. No new routes. No client-side recomputation of `canTransition` — the bar always defers to the backend flag. No timer-based polling fallback (FR-021a — strictly event-driven).
**Scale/Scope**: 1 new bar component, 1 new side-panel component, 1 new model file, 1 extension method on `TicketService` plus enriched error handling on its existing `submitReview` method, ~2 modified files on `TicketDetailComponent` (TS + HTML), `app.module.ts` declarations expanded by 2. Estimated ~700–900 LOC including templates and specs.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

Constitution: `.specify/memory/constitution.md` — v1.0.0.

| Principle | Status | Evidence / Notes |
|---|---|---|
| I. Industrial Fidelity | PASS | Readiness counts and missing-measure list both originate from the Phase 001 catalog seeded from real supervisor logs. The frontend invents no codes. |
| II. Bounded Tolerance, Not Target | PASS | The out-of-range list in the side panel renders each row's `measuredValue` next to its `[lowerBound, upperBound]` and `deviationPct`. No `expectedValue` is read or shown anywhere. |
| III. Three-Valued Measure Status | PASS | The bar's `mandatoryFilled` count is "measures whose `status != NOT_EXECUTED`", computed by the backend from the Phase 001 enum. The frontend never inspects a boolean `conform`. Side-panel row colors reuse the Phase 002 `MeasureStatusBadge` rather than introducing inline mappings. |
| IV. Guarded Transitions | PASS | This phase is the **embodiment** of principle IV: the `EN_COURS → EN_REVUE` transition surfaces the guard's verdict (`canTransition`, `(filled/total)`, missing list) before the user clicks. An HTTP 422 from `submit-review` is treated as a recoverable UX path (toast + side panel), not an unexpected error. |
| V. Traceability From Log to Verdict | PASS (forward-ready) | Each missing/out-of-range row in the side panel exposes its `measureCode` and label; click → scroll to the matching `MeasurePanel` row where Phase 002's "entered by" tooltip and Phase 004's paperclip already exist. No new traceability UI is invented here. |
| VI. DTO / Entity Separation & Mirroring | PASS | `workflow-readiness.model.ts` mirrors the backend `WorkflowReadinessDTO` field-for-field (see data-model). No renames. The WebSocket push payload uses the same shape. |
| VII. Real-Log Test Fixtures | N/A | No parser in this phase. The readiness path is template-driven, not log-driven. |
| VIII. Backward Compatibility | N/A | This phase introduces a net-new endpoint and topic; nothing is being deprecated by it. |
| IX. Auditability of Overrides | N/A | Conformity verdict + override arrive in Phase 005. No verdict UI in this phase. |
| X. No Premature AI Integration | PASS | Zero AI calls. The bar is a deterministic readout of the backend's computed counts. |
| XI. Frontend Stack Consistency | PASS | All new components NgModule-based, declared in `app.module.ts`. PrimeNG imports via `shared/primeng/primeng.module.ts`. `lara-dark-blue` theme. `--sage-*` tokens. DM Sans / JetBrains Mono. `app` selector prefix. No new UI library. No standalone components. No feature modules. No new routes. |
| XII. Role-Gated UI | PASS | The Submit-for-Review button's visibility (vs. disabled state) is unchanged by this phase — it stays governed by the existing routing/role rules (visible only to `ADMIN_IT`, `CHEF_SECTEUR`, `TECH_VAL`). The readiness bar and side panel are informational and visible to every role that can already open the ticket detail page — consistent with principle XII (no destructive capability is leaked; the bar exposes no mutating action). |

**Result**: PASS, no deviations. Complexity Tracking section empty.

## Project Structure

### Documentation (this feature)

```text
specs/003-workflow-guard-frontend/
├── spec.md
├── plan.md                              # this file
├── research.md                          # Phase 0 output
├── data-model.md                        # Phase 1 output
├── contracts/
│   └── workflow-readiness-api.md        # frozen backend contract this feature consumes
├── quickstart.md                        # how to run/verify the readiness bar locally
└── checklists/
    └── requirements.md
```

### Source Code (frontend repo)

Repo root: `sageline-frontend/`. New / modified files (in the frontend project, **not** under `spec-RealMesure/`):

```text
src/app/
├── pages/
│   └── Ticket/
│       └── ticket-detail/
│           ├── ticket-detail.component.ts        # MODIFIED — wire readiness load, WS subscribe, 422 catch, Submit label/disable
│           ├── ticket-detail.component.html      # MODIFIED — embed <app-workflow-readiness-bar> above <app-measure-panel>
│           └── ticket-detail.component.spec.ts   # MODIFIED — add 422-handling + bar wiring assertions
├── services/
│   ├── ticket.service.ts                         # MODIFIED — add getReadiness(); enrich submitReview() with typed 422 error
│   └── ticket.service.spec.ts                    # MODIFIED — cover getReadiness (incl. ?targetStatus=) and 422-with-DTO path
├── models/
│   └── workflow-readiness.model.ts               # NEW — mirrors WorkflowReadinessDTO
├── shared/
│   └── components/
│       ├── workflow-readiness-bar/               # NEW — bar + tooltip + aria-live + skeleton + paused indicator
│       │   ├── workflow-readiness-bar.component.ts
│       │   ├── workflow-readiness-bar.component.html
│       │   ├── workflow-readiness-bar.component.scss
│       │   └── workflow-readiness-bar.component.spec.ts
│       └── workflow-readiness-panel/             # NEW — side panel: missing + out-of-range lists, click-to-scroll
│           ├── workflow-readiness-panel.component.ts
│           ├── workflow-readiness-panel.component.html
│           ├── workflow-readiness-panel.component.scss
│           └── workflow-readiness-panel.component.spec.ts
├── app.module.ts                                 # MODIFIED — declare 2 new components
└── app-routing.module.ts                         # UNCHANGED (no new route)
```

**Structure Decision**: Both new components live under `shared/components/` because the readiness bar and panel are conceptually reusable beyond Phase 003 (Phase 005's conformity report panel may reference `WorkflowReadinessBar` for the `EN_REVUE → CONFORME/NON_CONFORME` step if the team chooses to extend it). The wire-up sits in the existing `pages/Ticket/ticket-detail/` folder (no new page component). No new feature module — flat declarations in `app.module.ts` per Constitution XI.

## Phase 0 — Research

See [research.md](./research.md). All clarifications from `/speckit-clarify` (sessions 2026-05-14 and 2026-05-15) are encoded in the spec; the research notes resolve the remaining design decisions (PrimeNG primitive choice, scroll-into-view technique, WS deduplication strategy, 422 error transform pattern, debounce shape, accessibility wording). Zero `NEEDS CLARIFICATION` markers remain.

## Phase 1 — Design & Contracts

See [data-model.md](./data-model.md), [contracts/workflow-readiness-api.md](./contracts/workflow-readiness-api.md), and [quickstart.md](./quickstart.md).

Agent-context update: a `<!-- SPECKIT START -->` / `<!-- SPECKIT END -->` block is appended to the frontend root `CLAUDE.md` pointing at this plan.

## Post-Design Constitution Re-check

| Principle | Status | Notes |
|---|---|---|
| IV (Guarded transitions) | PASS | Contracts doc enumerates the readiness response shape, the 422 response on `submit-review`, and the WebSocket topic. Data-model encodes the typed 422 error transform so the UI never sees a raw `HttpErrorResponse` for this path. |
| VI (Mirroring) | PASS | `workflow-readiness.model.ts` field list matches `WorkflowReadinessDTO` field-for-field, including nullability. |
| XI (Stack) | PASS | quickstart.md shows only existing dependencies; no new package install steps. |
| XII (Role gating) | PASS | Submit-for-Review visibility remains under the existing routing role guard set (`ADMIN_IT`, `CHEF_SECTEUR`, `TECH_VAL`); bar/panel are informational (no destructive action), visible to all ticket-detail viewers. |
| Others | Unchanged from pre-design check. | |

**Result**: PASS — proceed to `/speckit-tasks`.

## Complexity Tracking

> No constitution deviations. Section intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| — | — | — |
