# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sageline is an Angular 17 frontend for a production-line validation/quality management system (MES-style). It connects to a Spring Boot backend at `http://localhost:8089/api` (configured in `src/environments/environment.ts`). The app manages users, production lines, validation zones, tickets (validation workflow), KPIs, dashboards, and real-time messaging.

## Commands

- **Dev server:** `ng serve` (serves at http://localhost:4200)
- **Build:** `npm run build` (output in `dist/sageline-frontend/`)
- **Run tests:** `npm test` (Karma + Jasmine)
- **Run single test file:** `ng test --include='**/path/to/file.spec.ts'`
- **Generate component:** `ng generate component path/component-name` (generates NgModule-based, SCSS-styled components)

## Architecture

### Module System
NgModule-based (`standalone: false` for all components, directives, pipes). All components must be declared in `app.module.ts` — there are no feature modules. All PrimeNG imports are centralized in `src/app/shared/primeng/primeng.module.ts`.

### Authentication — Keycloak
Auth is handled by `keycloak-angular`. On app init, `keycloak-init.ts` initializes the Keycloak client (realm: `sageline`, client: `sageline-frontend`, server: `http://localhost:8180`). The `enableBearerInterceptor: true` option auto-attaches JWT tokens to all HTTP requests except `/assets` and `/login`.

- `AuthService` wraps `KeycloakService` and exposes `login()` (direct-access grant, no redirect), `logout()`, `getRoles()`, `getUsername()`, `getCurrentUserId()`, and `syncCurrentUser()`.
- `AuthGuard` extends `KeycloakAuthGuard`. Routes declare required roles in `data: { roles: [...] }`. Guard reads roles from `tokenParsed.realm_access.roles` and redirects to `/access-denied` on failure.
- After login, `syncCurrentUser()` hits `/api/users/me` and stores the DB user ID in `localStorage` under `sageline_user_id`.

### Routing
All routes (except `/login`) are children of `LayoutComponent` and protected by `AuthGuard`. Role-based access is enforced per route:

| Path | Allowed Roles |
|------|--------------|
| `admin/users` | ADMIN_IT |
| `admin/secteurs`, `admin/phases` | ADMIN_IT |
| `admin/lines`, `admin/zones` | ADMIN_IT, CHEF_SECTEUR |
| `validations` (ticket list/detail) | ADMIN_IT, CHEF_SECTEUR, EXPERT, TECH_VAL, TECH_PREP, RESPONSABLE |
| `validations/create`, `validations/planner` | ADMIN_IT, CHEF_SECTEUR |
| `validations/:id/prep` | ADMIN_IT, TECH_PREP |
| `results` | ADMIN_IT, CHEF_SECTEUR, EXPERT, TECH_VAL |
| `kpis` | ADMIN_IT, CHEF_SECTEUR, EXPERT, RESPONSABLE |
| `intelligence` | ADMIN_IT, CHEF_SECTEUR, EXPERT |
| `messaging` | (no role restriction) |

Roles: `ADMIN_IT`, `CHEF_SECTEUR`, `EXPERT`, `TECH_VAL`, `TECH_PREP`, `RESPONSABLE`.

### Ticket Workflow Domain
The core business domain is validation tickets. The `Validation` model (from `validation.model.ts`) is the primary entity representing a ticket. The ticket lifecycle follows this status flow:

`PLANIFIE` → `EN_ATTENTE_PREP` → `PREP_VALIDEE` → `EN_COURS` → `EN_REVUE` → `CONFORME` | `NON_CONFORME` | `ANNULE`

`TicketService` (at `src/app/services/ticket.service.ts`) calls `/api/validations` endpoints using PATCH for workflow transitions (`start-prep`, `validate-prep`, `start`, `submit-review`, `close`, `cancel`).

Pages under `src/app/pages/Ticket/`:
- `ticket-list` — filterable table of all tickets
- `ticket-create` — form to create a new ticket (assigns zone, priority, technicians)
- `ticket-detail` — detail view with status transitions and assignment panel
- `week-planner` — bulk week scheduling interface
- `prep-check` — preparation checklist for `TECH_PREP` role

### Real-time — WebSocket
`WebSocketService` uses `@stomp/stompjs` over `SockJS` connecting to `http://localhost:8089/ws`. It auto-connects on user login and subscribes to `/user/{userId}/queue/tickets` for personal notifications. Use `webSocketService.subscribe(topic, callback)` to add STOMP subscriptions; duplicates are deduplicated automatically.

Messaging (`src/app/messaging/`) uses the same WebSocket service for chat: `sendChatMessage()`, `sendTyping()`, `sendReadReceipt()` publish to `/app/chat.*` destinations.

### Domain Hierarchy
`Secteur` → `ProductionLine` → `ValidationZone` → `Validation (Ticket)`
`Phase` is a parallel concept defining process phases used when creating validations.

### Services
All services in `src/app/services/` use `HttpClient` with `environment.apiUrl` as base. Key services: `UserService`, `ProductionLineService`, `ValidationZoneService`, `SecteurService`, `PhaseService`, `TicketService`, `AssignmentService`, `ValidationService`, `ValidationResultService`, `KpiService`, `AnomalyService`, `ToolService`, `MessageService`, `WebSocketService`.

### Shared
- **Enums:** `src/app/shared/enums/` — `Role`, `TicketStatus`, `Priority`, `AssignmentRole`, `ValidationStatus`, `ToolStatus`. Each status/priority enum has a companion `*_LABELS`, `*_COLORS`, and sometimes `*_ICONS` map for display in templates.
- **Pipes:** `RoleFilterPipe`, `FindByIdPipe`, `Nl2brPipe`.
- **Shared components:** `StatCard`, `RiskBadge`, `StatusBadge`, `TicketStatusBadge`, `PriorityBadge`, `AssignmentPanel`, `TicketTimeline`.

### Styling
SCSS with global PrimeNG theme overrides in `src/styles.scss`. Uses `lara-dark-blue` PrimeNG theme. Custom CSS variables prefixed `--sage-*` on `:root`. Fonts: DM Sans (UI text), JetBrains Mono (monospace). Component prefix: `app`.
