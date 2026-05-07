---
description: "Task list for Handover System — Angular Frontend"
---

# Tasks: Handover System — Angular Frontend

**Input**: Design documents from `specs/001-handover-frontend/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅ quickstart.md ✅
**Tests**: Not requested — no test tasks generated.
**Angular project root**: `sageline-frontend/` (relative paths below are from this root)

> **Implementation note for the executing model**: Read `specs/001-handover-frontend/data-model.md`
> for exact TypeScript interfaces and enum values. Read `specs/001-handover-frontend/research.md`
> for architectural decisions. Read `specs/001-handover-frontend/contracts/handover-api.md` for
> the exact HTTP method signatures. Every task below is self-contained with the exact file path
> and the complete change required.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)
- All paths are relative to `sageline-frontend/src/app/`

---

## Phase 1: Setup — Shared Type Infrastructure

**Purpose**: Create enums, models, and the Angular service. These have zero Angular
dependencies and unblock all component work. All tasks in this phase can run in parallel.

- [x] T001 [P] Create `src/app/shared/enums/handover-status.enum.ts` with TypeScript enum `HandoverStatus` (values: PENDING, ACCEPTED, COMPLETED, CANCELLED), `HANDOVER_STATUS_LABELS` Record map (En attente / Assignée / Terminée / Annulée), and `HANDOVER_STATUS_SEVERITY` Record map (warning / info / success / danger). Copy exact content from `specs/001-handover-frontend/data-model.md` section "handover-status.enum.ts".

- [x] T002 [P] Create `src/app/shared/enums/trigger-type.enum.ts` with TypeScript enum `TriggerType` (values: MANUAL, SHIFT_END_AUTO, ADMIN_FORCE), `TRIGGER_TYPE_LABELS` Record map (Manuelle / Automatique (fin de shift) / Forcée (admin)), and `TRIGGER_TYPE_SEVERITY` Record map (info / warning / danger). Copy exact content from `specs/001-handover-frontend/data-model.md` section "trigger-type.enum.ts".

- [x] T003 [P] Extend `src/app/shared/enums/ticket.enum.ts`: (1) Add `'EN_ATTENTE_HANDOVER'` to the `TicketStatus` string literal union type. (2) Add `EN_ATTENTE_HANDOVER: 'En Attente Passation'` to `TICKET_STATUS_LABELS`. (3) Add `EN_ATTENTE_HANDOVER: 'warning'` to `TICKET_STATUS_COLORS`. (4) Add `EN_ATTENTE_HANDOVER: 'pi pi-arrows-h'` to `TICKET_STATUS_ICONS`. All four changes in the same file.

- [x] T004 [P] Create `src/app/models/handover.model.ts` with three interfaces: `HandoverResponse` (id, validationId, ticketCode, fromTechUsername, toTechUsername?, handoverNote, progressSummary, status: HandoverStatus, triggeredBy: TriggerType, scheduledAt: string, acceptedAt?: string), `HandoverInitiateRequest` (handoverNote: string, progressSummary: string), `HandoverAssignRequest` (techId: number). Import `HandoverStatus` from `../shared/enums/handover-status.enum` and `TriggerType` from `../shared/enums/trigger-type.enum`. Copy exact content from `specs/001-handover-frontend/data-model.md` section "handover.model.ts".

- [x] T005 [P] Create `src/app/services/handover.service.ts` as `@Injectable({ providedIn: 'root' })` with `HttpClient` injected. Implement six methods: `initiateHandover(validationId: number, body: HandoverInitiateRequest): Observable<HandoverResponse>` → POST `${apiUrl}/initiate/${validationId}`; `acceptHandover(handoverId: number): Observable<HandoverResponse>` → POST `${apiUrl}/${handoverId}/accept` with empty body `{}`; `assignHandover(handoverId: number, techId: number): Observable<HandoverResponse>` → PATCH `${apiUrl}/${handoverId}/assign` with body `{ techId }`; `cancelHandover(handoverId: number): Observable<HandoverResponse>` → PATCH `${apiUrl}/${handoverId}/cancel` with empty body `{}`; `getPendingHandovers(): Observable<HandoverResponse[]>` → GET `${apiUrl}/pending`; `getHandoverHistory(validationId: number): Observable<HandoverResponse[]>` → GET `${apiUrl}/validation/${validationId}`. Set `private apiUrl = \`\${environment.apiUrl}/handovers\``. Import from `../../environments/environment`, `../models/handover.model`.

**Checkpoint**: Enums, model, and service exist. `ng build` MUST compile without errors before proceeding.

---

## Phase 2: Foundational — Module & Route Wiring

**Purpose**: Register all new components in `app.module.ts` and add routes. Must be done
before any component template can be used. These tasks can proceed in parallel with Phase 3+
component file creation, but components must be declared here before they are referenced
in templates.

> **Note for executing model**: In Angular NgModule projects, you CANNOT use a component in
> any template until it is declared in `app.module.ts`. Do these wiring tasks as each
> component is created — do not wait until all components are done.

- [x] T006 [P] Verify that `src/app/shared/primeng/primeng.module.ts` imports and exports these PrimeNG modules (add any that are missing): `DialogModule`, `InputTextareaModule`, `MessageModule`, `TableModule`, `DropdownModule`, `TimelineModule`, `SkeletonModule`, `CardModule`, `TagModule`, `ButtonModule`, `ToastModule`, `ConfirmDialogModule`. Each missing module: import from `primeng/<module-name>`, add to both `imports` and `exports` arrays.

- [x] T007 Add two new routes to `src/app/app-routing.module.ts` inside the `LayoutComponent` children array (alongside existing routes like `validations`, `kpis`, etc.):
  ```
  { path: 'validations/:id/handover', component: HandoverAcceptPanelComponent,
    canActivate: [AuthGuard], data: { roles: ['TECH_VAL', 'CHEF_SECTEUR', 'ADMIN_IT'] } },
  { path: 'handovers/queue', component: HandoverQueuePanelComponent,
    canActivate: [AuthGuard], data: { roles: ['CHEF_SECTEUR', 'ADMIN_IT'] } }
  ```
  Import `HandoverAcceptPanelComponent` and `HandoverQueuePanelComponent` at the top of the routing file.

**Checkpoint**: Routes added. Components will be declared in T008 after they are created.

---

## Phase 3: User Story 1 — TECH_VAL Initiates a Handover (Priority: P1) 🎯 MVP

**Goal**: TECH_VAL sees an "Initier la passation" button on a ticket in `EN_COURS` and can
submit a handover form. After submit the dialog closes and a success toast appears.

**Independent Test**: See `quickstart.md` Scenario A.

### Implementation for User Story 1

- [x] T008 [P] [US1] Create `src/app/pages/Handover/handover-initiate-dialog/handover-initiate-dialog.component.ts` using Angular CLI pattern (standalone: false, selector: `app-handover-initiate-dialog`). Inputs: `@Input() validationId: number`, `@Input() visible: boolean`. Outputs: `@Output() visibleChange = new EventEmitter<boolean>()`, `@Output() initiated = new EventEmitter<void>()`. Inject `HandoverService`, `MessageService`. Properties: `form = { handoverNote: '', progressSummary: '' }`, `loading = false`. Method `submit()`: validates both fields non-empty (else `messageService.add({ severity: 'warn', summary: 'Champs requis', detail: 'Veuillez remplir tous les champs.' })`), sets `loading = true`, calls `handoverService.initiateHandover(this.validationId, this.form)`, on success: emits `initiated`, sets `visible = false`, emits `visibleChange.emit(false)`, on error: shows error toast. Method `cancel()`: emits `visibleChange.emit(false)`. Add `providers: [MessageService]` to component decorator.

- [x] T009 [P] [US1] Create `src/app/pages/Handover/handover-initiate-dialog/handover-initiate-dialog.component.html`: PrimeNG `p-dialog` with `[visible]="visible"` `(visibleChange)="visibleChange.emit($event)"` `header="Initier la passation"` `[modal]="true"` `[style]="{ width: '500px' }"`. Inside: two `<div class="field">` blocks each with a `<label>` and `<textarea pInputTextarea [(ngModel)]="form.progressSummary" rows="4" placeholder="..." class="w-full"></textarea>`. First field: label "Résumé du travail effectué", ngModel `form.progressSummary`. Second field: label "Note de passation", ngModel `form.handoverNote`. Dialog footer: two buttons — `<p-button label="Annuler" severity="secondary" (click)="cancel()">` and `<p-button label="Soumettre" (click)="submit()" [loading]="loading">`. Add `<p-toast></p-toast>` at the top.

- [x] T010 [P] [US1] Create `src/app/pages/Handover/handover-initiate-dialog/handover-initiate-dialog.component.scss`: empty or minimal styles (e.g., `.field { margin-bottom: 1rem; }`, `label { display: block; margin-bottom: 0.25rem; font-weight: 500; }`).

- [x] T011 [US1] Declare `HandoverInitiateDialogComponent` in `src/app/app.module.ts`: add the import at the top and add to the `declarations` array.

**Checkpoint**: `HandoverInitiateDialogComponent` compiles. Ready to integrate into ticket-detail in Phase 6.

---

## Phase 4: User Story 2 — TECH_VAL Accepts a Pending Handover (Priority: P1)

**Goal**: TECH_VAL navigates to `/validations/:id/handover`, sees the previous tech's
context, and clicks "Accepter la passation" to resume the ticket.

**Independent Test**: See `quickstart.md` Scenario B.

### Implementation for User Story 2

- [x] T012 [P] [US2] Create `src/app/pages/Handover/handover-accept-panel/handover-accept-panel.component.ts` (standalone: false, selector: `app-handover-accept-panel`). Inject `ActivatedRoute`, `Router`, `HandoverService`, `MessageService`, `ConfirmationService`. Properties: `handover: HandoverResponse | null = null`, `loading = true`, `accepting = false`, `ticketId!: number`. `ngOnInit()`: reads `ticketId` from `route.snapshot.params['id']` (parse to number), calls `handoverService.getHandoverHistory(ticketId)`, finds first record with `status === HandoverStatus.PENDING`, assigns to `this.handover`, sets `loading = false`. If none found, shows info message "Aucune passation en attente pour ce ticket". Method `accept()`: sets `accepting = true`, calls `handoverService.acceptHandover(this.handover!.id)`, on success navigates to `/validations/${ticketId}`, on error shows error toast, sets `accepting = false`. Import `HandoverStatus` from enums. Add `providers: [MessageService, ConfirmationService]`.

- [x] T013 [P] [US2] Create `src/app/pages/Handover/handover-accept-panel/handover-accept-panel.component.html`. Structure: `<p-toast></p-toast>` at top. Then a `<div class="page-container">` with `<h2>Passation de ticket</h2>`. Show `p-skeleton` (4 rows, height 2rem) while `loading`. When loaded and `handover` exists: show a `<p-card>` with these fields: "Ticket" (`handover.ticketCode`), "Technicien sortant" (`handover.fromTechUsername`), "Déclenchée le" (`handover.scheduledAt | date:'dd/MM/yyyy HH:mm'`), "Résumé du travail effectué" (`handover.progressSummary` in a `<pre>` tag), "Note de passation" (`handover.handoverNote` in a `<pre>` tag). Below the card: `<p-button label="Accepter la passation" icon="pi pi-check" (click)="accept()" [loading]="accepting" [disabled]="accepting">`. When `!handover && !loading`: show `<p-message severity="info" text="Aucune passation en attente pour ce ticket.">`.

- [x] T014 [P] [US2] Create `src/app/pages/Handover/handover-accept-panel/handover-accept-panel.component.scss` with `.page-container { max-width: 700px; margin: 2rem auto; padding: 0 1rem; }` and `pre { white-space: pre-wrap; word-wrap: break-word; background: var(--surface-ground); padding: 0.75rem; border-radius: 6px; }`.

- [x] T015 [US2] Declare `HandoverAcceptPanelComponent` in `src/app/app.module.ts`. Also verify T007 route for `validations/:id/handover` is present.

**Checkpoint**: Navigate to `/validations/99/handover` (with a real ticket ID that has a PENDING handover). Accept panel loads with skeleton then content. Accept button redirects to ticket detail.

---

## Phase 5: User Story 3 — CHEF_SECTEUR Manages the Handover Queue (Priority: P2)

**Goal**: CHEF_SECTEUR has a live queue at `/handovers/queue` with assign and cancel actions.

**Independent Test**: See `quickstart.md` Scenario C.

### Implementation for User Story 3

- [x] T016 [P] [US3] Create `src/app/pages/Handover/handover-queue-panel/handover-queue-panel.component.ts` (standalone: false, selector: `app-handover-queue-panel`, implements OnInit, OnDestroy). Inject `HandoverService`, `UserService`, `AuthService`, `WebSocketService`, `MessageService`, `ConfirmationService`. Properties: `handovers: HandoverResponse[] = []`, `techVals: User[] = []`, `selectedTechId: { [key: number]: number } = {}`, `loading = true`. `ngOnInit()`: calls `loadHandovers()` and `loadTechVals()`. Also subscribes to zone WS topic: reads `zoneId = authService.getCurrentUserZoneId()`, if `zoneId > 0` calls `wsService.subscribe('/topic/handover.zone.' + zoneId, () => this.loadHandovers())`. `ngOnDestroy()`: calls `wsService.unsubscribe('/topic/handover.zone.' + zoneId)`. `loadHandovers()`: sets `loading = true`, calls `handoverService.getPendingHandovers()`, assigns result to `this.handovers`, sets `loading = false`. `loadTechVals()`: calls `userService.getByRole('TECH_VAL')`, assigns to `this.techVals`. `assign(handoverId: number)`: calls `handoverService.assignHandover(handoverId, this.selectedTechId[handoverId])`, on success shows success toast and calls `loadHandovers()`. `confirmCancel(handoverId: number)`: uses `confirmationService.confirm({ message: 'Annuler cette passation?', accept: () => this.cancel(handoverId) })`. `cancel(handoverId: number)`: calls `handoverService.cancelHandover(handoverId)`, on success shows toast and calls `loadHandovers()`. Add `providers: [MessageService, ConfirmationService]`.

- [x] T017 [P] [US3] Create `src/app/pages/Handover/handover-queue-panel/handover-queue-panel.component.html`. Structure: `<p-toast></p-toast>` and `<p-confirmDialog></p-confirmDialog>` at top. Then `<div class="page-container">` with `<h2>File d'attente des passations</h2>`. Show `p-skeleton` (5 rows, height 2.5rem) while `loading`. When loaded and `handovers.length === 0`: show `<p-message severity="info" text="Aucune passation en attente.">`. When `handovers.length > 0`: show `<p-table [value]="handovers" [tableStyle]="{'min-width': '60rem'}">` with columns: "Ticket" (`h.ticketCode`), "Zone" (`h.validationId`), "Technicien sortant" (`h.fromTechUsername`), "Créé le" (`h.scheduledAt | date:'dd/MM/yyyy HH:mm'`), "Actions". In the Actions column: `<p-dropdown [options]="techVals" [(ngModel)]="selectedTechId[h.id]" optionLabel="username" optionValue="id" placeholder="Choisir un tech" [style]="{'width':'200px'}">` followed by `<p-button label="Assigner" icon="pi pi-user-plus" (click)="assign(h.id)" [disabled]="!selectedTechId[h.id]" size="small" class="mr-2">` and `<p-button label="Annuler" icon="pi pi-times" severity="danger" (click)="confirmCancel(h.id)" size="small">`.

- [x] T018 [P] [US3] Create `src/app/pages/Handover/handover-queue-panel/handover-queue-panel.component.scss` with `.page-container { padding: 1.5rem; }`.

- [x] T019 [US3] Declare `HandoverQueuePanelComponent` in `src/app/app.module.ts`. Verify T007 route for `handovers/queue` is present.

- [x] T020 [US3] Add "Passations" sidebar entry to `src/app/layout/sidebar/sidebar.component.ts`. In the `allMenuItems` array, add a new group object after the COMMUNICATION group:
  ```typescript
  {
    label: 'PASSATIONS',
    items: [
      { label: 'Passations', icon: 'pi pi-arrows-h',
        route: '/handovers/queue', roles: ['CHEF_SECTEUR', 'ADMIN_IT'] }
    ]
  }
  ```
  No other changes to the component — the existing `filteredMenuItems` logic handles role filtering automatically.

**Checkpoint**: Log in as CHEF_SECTEUR. Sidebar shows "Passations". Navigate to `/handovers/queue`. Table renders with skeleton then data or empty message.

---

## Phase 6: User Story 4 — Ticket Detail Shows Handover Context (Priority: P2)

**Goal**: `ticket-detail` shows an amber `HandoverBanner` when ticket status is
`EN_ATTENTE_HANDOVER` (role-aware content), and a `HandoverTimeline` below the existing
timeline when history exists.

**Independent Test**: See `quickstart.md` Scenario A (end state) and Scenario B (timeline).

### Implementation for User Story 4

- [x] T021 [P] [US4] Create `src/app/pages/Handover/handover-banner/handover-banner.component.ts` (standalone: false, selector: `app-handover-banner`, implements OnInit). Inject `HandoverService`, `UserService`, `AuthService`, `MessageService`. Inputs: `@Input() ticket!: Validation`. Outputs: `@Output() actionCompleted = new EventEmitter<void>()`. Properties: `pendingHandover: HandoverResponse | null = null`, `techVals: User[] = []`, `selectedTechId: number | null = null`, `assigning = false`. `ngOnInit()`: calls `loadPendingHandover()`. If `authService.getRoles().includes('CHEF_SECTEUR') || authService.getRoles().includes('ADMIN_IT')`: calls `userService.getByRole('TECH_VAL').subscribe(users => this.techVals = users)`. `loadPendingHandover()`: calls `handoverService.getHandoverHistory(this.ticket.id)`, finds first record with `status === HandoverStatus.PENDING`, assigns to `this.pendingHandover`. `accept()`: navigates to `/validations/${this.ticket.id}/handover` using injected `Router`. `assign()`: if `!selectedTechId` return; calls `handoverService.assignHandover(this.pendingHandover!.id, this.selectedTechId)`, on success emits `actionCompleted`, shows success toast. Inject `Router` as well. Add `providers: [MessageService]`.

- [x] T022 [P] [US4] Create `src/app/pages/Handover/handover-banner/handover-banner.component.html`. Use `*ngIf="ticket.status === 'EN_ATTENTE_HANDOVER'"` on the root container. Inside: a `<p-message severity="warn">` containing role-conditional content using `*ngIf`. For `TECH_VAL` view (`*ngIf="authService.getRoles().includes('TECH_VAL')"`): text "Ce ticket est en attente de passation." + `<p-button label="Accepter" icon="pi pi-check" (click)="accept()" size="small" class="ml-3">`. For `CHEF_SECTEUR`/`ADMIN_IT` view (`*ngIf="authService.getRoles().includes('CHEF_SECTEUR') || authService.getRoles().includes('ADMIN_IT')"`): text "Passation en attente — assigner un technicien" + `<p-dropdown [options]="techVals" [(ngModel)]="selectedTechId" optionLabel="username" optionValue="id" placeholder="Choisir un technicien" [style]="{'width':'220px'}" class="ml-3">` + `<p-button label="Assigner" icon="pi pi-user-plus" (click)="assign()" [disabled]="!selectedTechId" size="small" class="ml-2">`.

- [x] T023 [P] [US4] Create `src/app/pages/Handover/handover-banner/handover-banner.component.scss`: minimal — `.ml-3 { margin-left: 0.75rem; } .ml-2 { margin-left: 0.5rem; }`.

- [x] T024 [P] [US4] Create `src/app/pages/Handover/handover-timeline/handover-timeline.component.ts` (standalone: false, selector: `app-handover-timeline`, implements OnInit). Inject `HandoverService`. Input: `@Input() validationId!: number`. Property: `handovers: HandoverResponse[] = []`, `loading = true`. `ngOnInit()`: calls `handoverService.getHandoverHistory(this.validationId).subscribe(data => { this.handovers = data; this.loading = false; })`.

- [x] T025 [P] [US4] Create `src/app/pages/Handover/handover-timeline/handover-timeline.component.html`. Use `*ngIf="handovers.length > 0"` on the outer container. Inside: `<h3>Historique des passations</h3>` then `<p-timeline [value]="handovers" align="alternate">`. In the timeline content template: show `fromTechUsername` → `toTechUsername ?? 'Non assigné'`, a `<p-tag [value]="TRIGGER_TYPE_LABELS[h.triggeredBy]" [severity]="TRIGGER_TYPE_SEVERITY[h.triggeredBy]">`, the `handoverNote` in a `<p>`, and `scheduledAt | date:'dd/MM/yyyy HH:mm'`. Import `TRIGGER_TYPE_LABELS` and `TRIGGER_TYPE_SEVERITY` from the enum file in the component class and expose them as component properties.

- [x] T026 [P] [US4] Create `src/app/pages/Handover/handover-timeline/handover-timeline.component.scss`: `h3 { margin-bottom: 1rem; font-size: 1rem; color: var(--text-color-secondary); }`.

- [x] T027 [US4] Declare `HandoverBannerComponent` and `HandoverTimelineComponent` in `src/app/app.module.ts`.

- [x] T028 [US4] Modify `src/app/pages/Ticket/ticket-detail/ticket-detail.component.html`: (1) Add `<app-handover-banner [ticket]="ticket" (actionCompleted)="loadTicket()">` immediately after the ticket status header section (before the ticket body content), wrapped in `*ngIf="ticket && ticket.status === 'EN_ATTENTE_HANDOVER'"`. (2) Add `<app-handover-timeline [validationId]="ticket.id">` at the bottom of the template, after the existing `<app-ticket-timeline>`, wrapped in `*ngIf="ticket"`.

**Checkpoint**: Open a ticket in `EN_ATTENTE_HANDOVER` as TECH_VAL → amber banner with Accept button. Open same ticket as CHEF_SECTEUR → banner with assign dropdown. Open any ticket with handover history → timeline renders at bottom.

---

## Phase 7: User Story 5 — Real-Time WebSocket Notifications (Priority: P3)

**Goal**: All users receive toast notifications for handover events. CHEF_SECTEUR queue
auto-refreshes. `ticket-detail` auto-refreshes when ticket status changes.

**Independent Test**: See `quickstart.md` Scenario E.

### Implementation for User Story 5

- [x] T029 [US5] Extend `src/app/auth/auth.service.ts`: (1) Add static constant `static readonly ZONE_ID_KEY = 'sageline_zone_id'`. (2) In `syncCurrentUser()`, inside the existing `tap((user: any) => { ... })` operator, add `localStorage.setItem(AuthService.ZONE_ID_KEY, user.zoneId?.toString() ?? '0')` alongside the existing `sageline_user_id` and `currentUser` lines. (3) Add new method: `getCurrentUserZoneId(): number { const stored = localStorage.getItem(AuthService.ZONE_ID_KEY); return stored ? parseInt(stored, 10) : 0; }`. No other changes to the file.

- [x] T030 [US5] Modify `src/app/app.component.ts` to wire handover WebSocket subscriptions. Inject `MessageService` (add to constructor and add `providers: [MessageService]` to component decorator, or use root-provided one if already available via `p-toast` in `app.component.html` — check the template). Inside `syncCurrentUser().subscribe({ next: () => { ... wsService.connect(userId); ADD_HERE } })`, after `wsService.connect(userId)` add: subscribe to `/user/${userId}/queue/handover` with callback that calls `this.messageService.add({ severity: 'warn', summary: 'Passation', detail: notification.message, life: 8000 })`. Then check if `authService.getRoles().includes('CHEF_SECTEUR')`: if so, get `zoneId = authService.getCurrentUserZoneId()`, if `zoneId > 0` subscribe to `/topic/handover.zone.${zoneId}` (the `HandoverQueuePanelComponent` handles its own subscription; this `AppComponent` subscription is NOT needed — skip the zone subscription in AppComponent to avoid duplicate handling). Only wire the personal `/user/${userId}/queue/handover` subscription here.

- [x] T031 [US5] Modify `src/app/pages/Ticket/ticket-detail/ticket-detail.component.ts` to subscribe to `WebSocketService.ticketNotifications$` observable (NOT via `wsService.subscribe()` — use the existing public BehaviorSubject). Add a `private wsSubscription?: Subscription` property. In `ngOnInit()` (after `loadTicket()`): add `this.wsSubscription = this.wsService.ticketNotifications$.subscribe(notification => { if (notification && +notification.validationId === this.ticketId) { this.loadTicket(); } })`. In `ngOnDestroy()`: add `this.wsSubscription?.unsubscribe()`. Import `Subscription` from `rxjs`. The `WebSocketService` is already injected — check the existing constructor and add it if not present. DO NOT call `wsService.subscribe('/user/{id}/queue/tickets', ...)` — use the observable instead (see `research.md` R-002).

**Checkpoint**: Trigger a handover via API. Within 3 seconds a toast appears in the browser. `ticket-detail` page for the affected ticket auto-refreshes and shows the banner without manual reload.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [x] T032 [P] Verify `src/app/app.module.ts` declares all 5 new components: `HandoverInitiateDialogComponent`, `HandoverAcceptPanelComponent`, `HandoverQueuePanelComponent`, `HandoverBannerComponent`, `HandoverTimelineComponent`. Verify all 5 are imported at the top of the file. Fix any missing declarations.

- [x] T033 [P] Verify `src/app/app-routing.module.ts` has both routes: `validations/:id/handover` and `handovers/queue`, both with correct `AuthGuard` and `data.roles`. Fix any missing routes.

- [x] T034 [P] Run `ng build` from `sageline-frontend/` and fix any TypeScript compilation errors. Common issues: missing imports, wrong enum references, `HandoverStatus` used as value where string expected (use `HandoverStatus.PENDING` not `'PENDING'`).

- [x] T035 Run manual golden path validation using `quickstart.md` Scenarios A–E. Document any failures.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately. All T001–T005 in parallel.
- **Foundational (Phase 2)**: Depends on Phase 1 — T006 can run with Phase 1; T007 needs Phase 1 complete.
- **US1 (Phase 3)**: Depends on Phase 1 (T001–T005). T008–T010 in parallel; T011 after T008.
- **US2 (Phase 4)**: Depends on Phase 1. T012–T014 in parallel; T015 after T012.
- **US3 (Phase 5)**: Depends on Phase 1. T016–T018 in parallel; T019–T020 after T016.
- **US4 (Phase 6)**: Depends on Phase 1 and US1 (T008–T011 for HandoverInitiateDialog used by banner). T021–T026 in parallel; T027–T028 after T021–T026.
- **US5 (Phase 7)**: Depends on all previous phases.
- **Polish (Phase 8)**: Depends on all phases.

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 1. Independent of US2, US3.
- **US2 (P1)**: Can start after Phase 1. Independent of US1, US3.
- **US3 (P2)**: Can start after Phase 1. Independent of US1, US2.
- **US4 (P2)**: Depends on US1 completed (banner uses HandoverInitiateDialog).
- **US5 (P3)**: Depends on US1–US4 completed (wires everything together).

### Parallel Opportunities Per Phase

```
Phase 1:  T001 ‖ T002 ‖ T003 ‖ T004 ‖ T005  (all parallel — different files)
Phase 3:  T008 ‖ T009 ‖ T010  (then T011)
Phase 4:  T012 ‖ T013 ‖ T014  (then T015)
Phase 5:  T016 ‖ T017 ‖ T018  (then T019, T020)
Phase 6:  T021 ‖ T022 ‖ T023 ‖ T024 ‖ T025 ‖ T026  (then T027, T028)
Phase 8:  T032 ‖ T033 ‖ T034  (then T035)
```

---

## Implementation Strategy

### MVP First (US1 + US2 Only)

1. Complete Phase 1: Setup (T001–T005)
2. Complete Phase 2: Foundational (T006–T007)
3. Complete Phase 3: US1 — HandoverInitiateDialog (T008–T011)
4. Complete Phase 4: US2 — HandoverAcceptPanel (T012–T015)
5. **STOP and VALIDATE**: A TECH_VAL can initiate and another can accept.
6. Deploy/demo MVP.

### Incremental Delivery

1. Setup + Foundational → Phase 1 & 2 done
2. US1 + US2 → P1 stories complete → TECH_VAL handover lifecycle works end-to-end
3. US3 → CHEF_SECTEUR queue operational
4. US4 → ticket-detail integrated
5. US5 → real-time notifications live

---

## Notes

- `[P]` = different files, no runtime dependencies — safe to parallelize
- Every component MUST be declared in `app.module.ts` before its selector is used in any template
- `TicketStatus` is a **string literal union**, not a TypeScript enum — use `'EN_ATTENTE_HANDOVER'` not `TicketStatus.EN_ATTENTE_HANDOVER`
- `HandoverStatus` and `TriggerType` ARE TypeScript enums — use `HandoverStatus.PENDING`
- `WebSocketService.ticketNotifications$` is already subscribed to `/user/{id}/queue/tickets` inside `connect()` — do NOT call `wsService.subscribe()` for this topic again in ticket-detail (see research.md R-002)
- `UserService.getByRole('TECH_VAL')` calls `GET /api/users/role/TECH_VAL` — already implemented
- The `sageline_zone_id` localStorage key will be empty until the user logs out and back in after T029 is deployed
