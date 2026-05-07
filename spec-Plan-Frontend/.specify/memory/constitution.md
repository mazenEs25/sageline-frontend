<!--
SYNC IMPACT REPORT
==================
Version change: [TEMPLATE] → 1.0.0 (initial ratification — all placeholders replaced)
Modified principles: N/A (first fill)
Added sections:
  - Core Principles (5 principles)
  - Technology Stack & File Placement
  - Component Development Workflow
  - Governance
Removed sections: N/A
Templates updated:
  ✅ .specify/templates/plan-template.md — Constitution Check section aligns with the 5 principles
  ✅ .specify/templates/spec-template.md — User stories and requirements align with role-based and plan-driven principles
  ✅ .specify/templates/tasks-template.md — Task phases align with Angular NgModule-based structure
Follow-up TODOs: None — all fields resolved from Plan.md and CLAUDE.md context
-->

# SageLine — Handover System Frontend Constitution

## Core Principles

### I. Architecture Adherence (NON-NEGOTIABLE)

All Angular components MUST use `standalone: false` and MUST be declared in `app.module.ts`.
All PrimeNG imports MUST be centralized in `src/app/shared/primeng/primeng.module.ts` — no
direct PrimeNG imports in component files. The component selector prefix MUST be `app`.
Styles MUST use SCSS. No feature modules may be introduced. This mirrors the existing project
convention and MUST NOT be deviated from regardless of Angular version recommendations.

**Rationale**: The existing codebase is entirely NgModule-based. Mixing standalone components
would create two incompatible module systems and break the centralized PrimeNG strategy.

### II. Plan-Driven Implementation

Implementation MUST follow `Plan.md` (Phase 4 — Frontend Plan) exactly. The backend is
complete and tested; the frontend MUST map 1:1 to the Angular service signatures, model
interfaces, enum definitions, component names, route paths, and WebSocket topic names
specified in `Plan.md`. No scope additions, UI inventions, or structural deviations are
permitted without an explicit amendment to `Plan.md` first.

**Rationale**: This is a PFE (final-year project) with a fixed spec. Deviation from the plan
risks breaking the tested backend contract and diverging from the acceptance criteria defined
in Phase 5 of the plan.

### III. Role-Based Access Control

Every component rendering role-sensitive UI MUST check roles via `AuthService`. Routes MUST
declare required roles in `data: { roles: [...] }` and be protected by `AuthGuard`. Business
actions (accept handover, assign technician, cancel handover) MUST be gated both at the route
level and at the template level using `*ngIf` with `authService.hasRole(...)`. No privileged
data or action may be rendered to an unauthorized user, even if the API would reject the call.

**Rationale**: The application handles production validation workflows at Sagem. Role leakage
in the UI is a security and compliance issue, not just a cosmetic one.

### IV. Real-Time Over Polling

All live data updates MUST use WebSocket subscriptions via `WebSocketService.subscribe()`.
HTTP polling for handover queue updates, personal alerts, or zone notifications is forbidden.
Duplicate subscriptions to the same topic MUST be avoided — `WebSocketService` deduplicates
automatically and callers MUST NOT bypass this by creating new subscription calls for an
already-subscribed topic. Subscriptions MUST be torn down on component destroy via
`ngOnDestroy` if established inside a component (not in `AppComponent`).

**Rationale**: The handover system is time-sensitive (16:45 shift-end trigger). Polling
introduces unacceptable latency for supervisor tooling and wastes server resources.

### V. Simplicity — No Gold-Plating

Components MUST implement exactly what `Plan.md` specifies — no additional inputs, outputs,
or abstractions beyond what the plan defines. Three similar template lines are preferable to
a premature shared helper. No generic wrappers, no extra configuration objects, no optional
feature flags. If a component is used in only one place, it MUST NOT be abstracted into a
shared component unless `Plan.md` explicitly lists it under `src/app/shared/`.

**Rationale**: The feature set is fixed by the spec and PFE defense timeline. Premature
abstractions add maintenance burden without delivering user value.

## Technology Stack & File Placement

**Framework**: Angular 17, NgModule-based (`standalone: false`)
**UI Library**: PrimeNG with `lara-dark-blue` theme; all imports via `primeng.module.ts`
**Auth**: Keycloak (`keycloak-angular`); JWT auto-attached via bearer interceptor
**Backend**: Spring Boot REST at `http://localhost:8089/api` (env: `environment.apiUrl`)
**WebSocket**: `@stomp/stompjs` over SockJS at `http://localhost:8089/ws`
**Styling**: SCSS; global overrides in `src/styles.scss`; custom `--sage-*` CSS variables

**Mandatory file placement for handover feature**:

| Artifact | Path |
|---|---|
| Components | `src/app/pages/Handover/<component-name>/` |
| Angular service | `src/app/services/handover.service.ts` |
| Model interfaces | `src/app/models/handover.model.ts` |
| HandoverStatus enum | `src/app/shared/enums/handover-status.enum.ts` |
| TriggerType enum | `src/app/shared/enums/trigger-type.enum.ts` |
| Route additions | `src/app/app-routing.module.ts` |
| Component declarations | `src/app/app.module.ts` |
| WS subscriptions | `src/app/app.component.ts` |

## Component Development Workflow

1. Create model interfaces and enums first — these have no Angular dependencies and unblock all components.
2. Implement `HandoverService` — all HTTP methods defined in `Plan.md`; inject `HttpClient` only.
3. Build components in the dependency order from `Plan.md` Phase 5 task table (Tasks 7–11):
   `HandoverBannerComponent` → `HandoverInitiateDialogComponent` → `HandoverAcceptPanelComponent`
   → `HandoverQueuePanelComponent` → `HandoverTimelineComponent`.
4. Declare each component in `app.module.ts` immediately upon creation — never defer.
5. Add routes to `app-routing.module.ts` when the corresponding component is ready.
6. Wire WebSocket subscriptions in `AppComponent.ngOnInit()` last, after all components exist.
7. Extend `ticket-status.enum.ts` with `EN_ATTENTE_HANDOVER` and its label/color entries before
   integrating `HandoverBannerComponent` into `ticket-detail`.

Every task MUST leave the application in a compilable state — no partial imports, no missing
declarations, no broken module references between tasks.

## Governance

This constitution supersedes all implicit conventions and ad-hoc decisions made during
implementation. Any deviation from the principles above MUST be documented as an amendment
with: (1) the principle being modified, (2) the reason the deviation is necessary, and
(3) a migration note for any existing code affected.

Amendment procedure: update this file, increment the version (PATCH for clarifications,
MINOR for new principle, MAJOR for principle removal), and update `LAST_AMENDED_DATE`.
All implementation PRs/reviews MUST verify compliance with Principles I–V before merge.
The `Plan.md` file is the authoritative source for scope — the constitution governs HOW,
the plan governs WHAT.

**Version**: 1.0.0 | **Ratified**: 2026-05-06 | **Last Amended**: 2026-05-06
