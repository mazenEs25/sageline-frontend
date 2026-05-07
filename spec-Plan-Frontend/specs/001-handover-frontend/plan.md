# Implementation Plan: Handover System — Angular Frontend

**Branch**: `001-handover-frontend` | **Date**: 2026-05-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/001-handover-frontend/spec.md`

## Summary

Implement the Angular 17 frontend for the Shift-End Ticket Handover System. The backend
(`/api/handovers`) is fully implemented and tested. This plan covers: two new TypeScript
enum files, one model file, one Angular service, five new NgModule-based components under
`src/app/pages/Handover/`, two new routes, WebSocket subscription wiring in `AppComponent`,
sidebar navigation extension in `SidebarComponent`, and targeted modifications to
`AuthService`, `ticket.enum.ts`, and `ticket-detail`.

The implementation follows the dependency order: enums/models → service → components →
routes → WebSocket → integrations.

## Technical Context

**Language/Version**: TypeScript 5.x / Angular 17 (NgModule-based, `standalone: false`)
**Primary Dependencies**: PrimeNG (lara-dark-blue), keycloak-angular, @stomp/stompjs, SockJS
**Storage**: localStorage (for `sageline_user_id`, `sageline_zone_id` session keys)
**Testing**: No unit tests required (PFE project scope)
**Target Platform**: Web browser — `http://localhost:4200` (Angular dev server)
**Project Type**: SPA feature addition (web-app)
**Performance Goals**: WebSocket notifications ≤ 3s latency; page interactions ≤ 1s
**Constraints**: All components NgModule-based; all PrimeNG imports via `primeng.module.ts`;
no standalone components; no new Angular modules; all paths per constitution
**Scale/Scope**: Single-user session; ~10 concurrent CHEF_SECTEUR queue subscribers

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Architecture Adherence | ✅ PASS | All components use `standalone: false`, declared in `app.module.ts`, no feature modules |
| II. Plan-Driven Implementation | ✅ PASS | Scope maps 1:1 to Plan.md Phase 4 — no additions |
| III. Role-Based Access Control | ✅ PASS | Routes gate with `AuthGuard`; templates gate with `*ngIf` + role checks |
| IV. Real-Time Over Polling | ✅ PASS | WS subscriptions via `WebSocketService`; no HTTP polling anywhere |
| V. Simplicity — No Gold-Plating | ✅ PASS | Exactly 5 components, 1 service, 2 routes — nothing beyond spec |

**No violations. No complexity tracking required.**

## Project Structure

### Documentation (this feature)

```text
specs/001-handover-frontend/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── handover-api.md  # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (Angular project root)

```text
src/app/
├── shared/enums/
│   ├── ticket.enum.ts                     MODIFY — add EN_ATTENTE_HANDOVER
│   ├── handover-status.enum.ts            CREATE
│   └── trigger-type.enum.ts               CREATE
├── models/
│   └── handover.model.ts                  CREATE
├── services/
│   └── handover.service.ts                CREATE
├── auth/
│   └── auth.service.ts                    MODIFY — extend syncCurrentUser()
├── pages/Handover/
│   ├── handover-banner/
│   │   ├── handover-banner.component.ts   CREATE
│   │   ├── handover-banner.component.html CREATE
│   │   └── handover-banner.component.scss CREATE
│   ├── handover-initiate-dialog/
│   │   ├── handover-initiate-dialog.component.ts   CREATE
│   │   ├── handover-initiate-dialog.component.html CREATE
│   │   └── handover-initiate-dialog.component.scss CREATE
│   ├── handover-accept-panel/
│   │   ├── handover-accept-panel.component.ts   CREATE
│   │   ├── handover-accept-panel.component.html CREATE
│   │   └── handover-accept-panel.component.scss CREATE
│   ├── handover-queue-panel/
│   │   ├── handover-queue-panel.component.ts   CREATE
│   │   ├── handover-queue-panel.component.html CREATE
│   │   └── handover-queue-panel.component.scss CREATE
│   └── handover-timeline/
│       ├── handover-timeline.component.ts   CREATE
│       ├── handover-timeline.component.html CREATE
│       └── handover-timeline.component.scss CREATE
├── app.module.ts                          MODIFY — declare 5 new components
├── app-routing.module.ts                  MODIFY — add 2 new routes
├── app.component.ts                       MODIFY — wire handover WS subscriptions
└── layout/sidebar/
    └── sidebar.component.ts               MODIFY — add Passations nav entry
```

**Also modify** (existing pages):
```text
src/app/pages/Ticket/ticket-detail/
├── ticket-detail.component.ts             MODIFY — add HandoverBanner + HandoverTimeline
├── ticket-detail.component.html           MODIFY — inject banner + timeline templates
```

**Structure Decision**: Single Angular project (not a separate backend/frontend tree).
All new files follow the existing `src/app/` directory conventions from CLAUDE.md.

## Phase 0: Research Findings

See `research.md` for full details. Summary:

- `UserService.getByRole()` already exists — use it for TECH_VAL dropdown
- `WebSocketService.ticketNotifications$` already emits `/user/{id}/queue/tickets` events
- `syncCurrentUser()` pattern is established — extend to store zone ID
- Sidebar uses TypeScript array pattern — confirmed by reading `SidebarComponent`
- `TicketStatus` is a string literal union (not a TypeScript enum) — extend accordingly

## Phase 1: Design Artifacts

See `data-model.md` for TypeScript interfaces and enum definitions.
See `contracts/handover-api.md` for the HTTP contract used by `HandoverService`.
See `quickstart.md` for manual verification steps.
