---

description: "Task list for Workflow Guard â€” Frontend (Phase 003). Optimized for an implementer LLM (Haiku-class): each task names a single file, gives the exact code/skeleton, and avoids cross-task inference."
---

# Tasks: Workflow Guard â€” Frontend (Phase 003)

**Input**: Design documents from `spec-RealMesure/specs/003-workflow-guard-frontend/`
**Prerequisites**: plan.md âœ“, spec.md âœ“, research.md âœ“, data-model.md âœ“, contracts/workflow-readiness-api.md âœ“

**Tests**: Karma/Jasmine tests are included because FR-025/FR-026/FR-027 explicitly require them (Constitution IV â€” guarded transition UX must be tested).

**Implementer note (Haiku-friendly)**: Every task targets one file with a clear deliverable. Code skeletons are included verbatim â€” paste them and adjust types if compile errors appear. **Do not invent file paths or symbol names**; if a path or name is missing from a task, treat it as a bug and ask, do not guess.

**Verified codebase facts** (use these names verbatim â€” do not rename):

- `TicketService` exists at `src/app/services/ticket.service.ts`. Its existing transition method is named **`submitForReview(id: number)`** (NOT `submitReview`). All tasks in this file use `submitForReview`.
- `TicketStatus` is the **type alias** exported from `src/app/shared/enums/ticket.enum.ts` (NOT a class/enum). Import as `import { TicketStatus } from '../shared/enums/ticket.enum';`.
- `WebSocketService` exists at `src/app/services/websocket.service.ts` and exposes `isConnected$: Observable<boolean>` and `subscribe(topic, callback)` / `unsubscribe(topic)`. Use these as-is.
- `MeasurePanelComponent` selector is `app-measure-panel` and is already declared in `src/app/app.module.ts` (around line 132).
- `MeasureStatusBadge` already exists at `src/app/shared/components/measure-status-badge/`. Reuse it.
- The PrimeNG centralized module is `src/app/shared/primeng/primeng.module.ts`. Import any PrimeNG primitive there if not already exported.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story (US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

No new dependencies, no new build config. Skip to Phase 2.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Model, typed error, service extension, PrimeNG exports, and forward-port of `MeasurePanel` to expose a `measuresChanged` output. Everything in Phase 2 MUST be complete before any user story phase begins.

- [x] T001 Create the readiness model file `src/app/models/workflow-readiness.model.ts` with the exact contents below.

  ```typescript
  import { TicketStatus } from '../shared/enums/ticket.enum';

  export interface WorkflowReadinessMissingMeasure {
    measureCode: string;
    label: string;
    required: boolean;
    catalogTemplateId: number | null;
  }

  export interface WorkflowReadinessOutOfRangeMeasure {
    measureId: number;
    measureCode: string;
    label: string;
    measuredValue: number;
    unit: string;
    lowerBound: number;
    upperBound: number;
    deviationPct: number;
  }

  export interface WorkflowReadiness {
    ticketId: number;
    currentStatus: TicketStatus;
    targetStatus: TicketStatus;
    mandatoryTotal: number;
    mandatoryFilled: number;
    mandatoryMissing: number;
    missingMeasures: WorkflowReadinessMissingMeasure[];
    outOfRangeMeasures: WorkflowReadinessOutOfRangeMeasure[];
    canTransition: boolean;
    blockingReasons: string[];
  }
  ```

- [x] T002 [P] In `src/app/services/ticket.service.ts`, add the `WorkflowReadinessBlockedError` class and import the readiness model. Place the class **above** the `@Injectable` decorator (so it is exported from the same file).

  ```typescript
  import { WorkflowReadiness } from '../models/workflow-readiness.model';

  export class WorkflowReadinessBlockedError extends Error {
    readonly name = 'WorkflowReadinessBlockedError';
    constructor(public readonly readiness: WorkflowReadiness) {
      super(readiness.blockingReasons?.[0] ?? 'Workflow transition blocked');
    }
  }
  ```

- [x] T003 In `src/app/services/ticket.service.ts`, add the `getReadiness(...)` method to the `TicketService` class. Add the necessary imports at the top of the file if missing: `import { HttpErrorResponse } from '@angular/common/http';`, `import { catchError, throwError } from 'rxjs';`. Insert the method right after `getByWeek(...)`.

  ```typescript
  getReadiness(ticketId: number, targetStatus?: TicketStatus): Observable<WorkflowReadiness> {
    let params = new HttpParams();
    if (targetStatus) {
      params = params.set('targetStatus', targetStatus);
    }
    return this.http.get<WorkflowReadiness>(`${this.apiUrl}/${ticketId}/readiness`, { params });
  }
  ```

- [x] T004 In `src/app/services/ticket.service.ts`, REPLACE the existing `submitForReview(id)` method body with the version below that pipes through `catchError`. **Do not rename the method.** Keep the same public signature.

  ```typescript
  submitForReview(id: number): Observable<Validation> {
    return this.http.patch<Validation>(`${this.apiUrl}/${id}/submit-review`, {}).pipe(
      catchError((err: unknown) => {
        if (
          err instanceof HttpErrorResponse &&
          err.status === 422 &&
          err.error &&
          typeof err.error === 'object' &&
          err.error.canTransition === false
        ) {
          return throwError(() => new WorkflowReadinessBlockedError(err.error as WorkflowReadiness));
        }
        return throwError(() => err);
      })
    );
  }
  ```

- [x] T005 [P] In `src/app/pages/Ticket/measure-panel/measure-panel.component.ts`, add an `@Output() measuresChanged = new EventEmitter<void>();` field on the class. Import `EventEmitter, Output` from `@angular/core` (extend the existing `import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';` line). After every successful mutation path in this file (search the file for `.subscribe({` blocks following `create(...)`, `update(...)`, `delete(...)`, `batchUpdate(...)`, `fromTemplate(...)`, `instantiate(...)` calls â€” Phase 002's existing flow), add `this.measuresChanged.emit();` inside the `next:` handler **right after** `this.refresh()` is called (or at the end of the existing success branch if `refresh()` is not called there). Do NOT change any other behavior.

  Implementation hint: if you cannot quickly locate all mutation success branches, a safe fallback is to emit from `refresh()` itself at the end of the `next:` handler: `this.measuresChanged.emit();` â€” this still satisfies FR-020 because every successful mutation in Phase 002 already calls `refresh()` per R10.

- [x] T006 [P] In `src/app/pages/Ticket/measure-panel/measure-panel.component.html`, find the `<tr>` for each measure row in the PrimeNG table body and add the attribute `[attr.data-measure-code]="measure.measureCode"` to it. This attribute is consumed by `scrollToMeasureCode(...)` in Phase 005's interaction. Do not change any other markup.

- [x] T007 [P] In `src/app/pages/Ticket/measure-panel/measure-panel.component.ts`, add a public method below `refresh()`:

  ```typescript
  scrollToMeasureCode(code: string): void {
    const row = document.querySelector<HTMLTableRowElement>(
      `tr[data-measure-code="${code}"]`
    );
    if (!row) return;
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    row.classList.add('is-highlighted');
    setTimeout(() => row.classList.remove('is-highlighted'), 1500);
  }
  ```

- [x] T008 [P] In `src/app/pages/Ticket/measure-panel/measure-panel.component.scss`, append the highlight rule:

  ```scss
  tr.is-highlighted {
    background: var(--sage-highlight, rgba(255, 193, 7, 0.18)) !important;
    transition: background 0.3s ease-out;
  }
  ```

- [x] T009 [P] In `src/app/shared/primeng/primeng.module.ts`, ensure the following PrimeNG modules are imported AND exported (add any that are missing â€” do NOT remove existing entries): `ProgressBarModule`, `SidebarModule`, `TooltipModule`, `SkeletonModule`, `BadgeModule`. The existing `ButtonModule` and `ToastModule` are already there per Phase 002; do not duplicate them.

**Checkpoint**: Phase 2 complete. Model exists, typed error exists, `getReadiness` is reachable, `submitForReview` translates 422 to the typed error, `MeasurePanel` emits on change and offers a public scroll method.

---

## Phase 3: User Story 1 â€” Live readiness bar (Priority: P1) ðŸŽ¯ MVP

**Goal**: A user opening any `EN_COURS` ticket sees a live progress bar at the top of the ticket detail page that updates over WebSocket.

**Independent Test**: Open a ticket whose zone catalog has â‰¥1 mandatory measure. Observe `mandatoryFilled / mandatoryTotal` rendered above `MeasurePanel`. Add or update a measure via `MeasurePanel`; observe the bar update within 1 s without a manual refresh.

### Implementation

- [x] T010 [US1] Create `src/app/shared/components/workflow-readiness-bar/workflow-readiness-bar.component.ts` with the exact contents below.

  ```typescript
  import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
  import { WorkflowReadiness } from '../../../models/workflow-readiness.model';

  @Component({
    selector: 'app-workflow-readiness-bar',
    templateUrl: './workflow-readiness-bar.component.html',
    styleUrls: ['./workflow-readiness-bar.component.scss'],
    standalone: false,
  })
  export class WorkflowReadinessBarComponent implements OnChanges {
    @Input() readiness: WorkflowReadiness | null = null;
    @Input() wsConnected = true;

    @Output() panelToggleRequested = new EventEmitter<void>();
    @Output() refreshRequested = new EventEmitter<void>();

    // 5-second WS-paused grace timer state (FR-010)
    pausedIndicatorVisible = false;
    private pausedTimer: ReturnType<typeof setTimeout> | null = null;

    ngOnChanges(changes: SimpleChanges): void {
      if (changes['wsConnected']) {
        this.handleWsConnectedChange();
      }
    }

    private handleWsConnectedChange(): void {
      if (this.wsConnected) {
        if (this.pausedTimer) {
          clearTimeout(this.pausedTimer);
          this.pausedTimer = null;
        }
        this.pausedIndicatorVisible = false;
      } else {
        if (this.pausedTimer) return;
        this.pausedTimer = setTimeout(() => {
          this.pausedIndicatorVisible = true;
          this.pausedTimer = null;
        }, 5000);
      }
    }

    get percentage(): number {
      if (!this.readiness || this.readiness.mandatoryTotal === 0) return 0;
      return Math.round(
        (this.readiness.mandatoryFilled / this.readiness.mandatoryTotal) * 100
      );
    }

    get fillRatio(): number {
      if (!this.readiness || this.readiness.mandatoryTotal === 0) return 0;
      return (this.readiness.mandatoryFilled / this.readiness.mandatoryTotal) * 100;
    }

    get colorBand(): 'red' | 'amber' | 'green' | 'gray' {
      if (!this.readiness || this.readiness.mandatoryTotal === 0) return 'gray';
      const pct = this.fillRatio;
      if (pct >= 100) return 'green';
      if (pct >= 50) return 'amber';
      return 'red';
    }

    get tooltipText(): string {
      if (!this.readiness || this.readiness.missingMeasures.length === 0) {
        return 'No missing mandatory measures';
      }
      const top = this.readiness.missingMeasures.slice(0, 5)
        .map(m => `${m.measureCode} â€” ${m.label}`)
        .join('\n');
      const remaining = this.readiness.missingMeasures.length - 5;
      const overflow = remaining > 0 ? `\n+ ${remaining} more â€” click the bar to see all` : '';
      return `${top}${overflow}`;
    }

    get ariaText(): string {
      if (!this.readiness) return 'Loading readinessâ€¦';
      if (this.readiness.mandatoryTotal === 0) {
        return 'No mandatory measures defined for this zone';
      }
      const base = `${this.readiness.mandatoryFilled} of ${this.readiness.mandatoryTotal} mandatory measures complete`;
      return this.readiness.canTransition ? `${base}, ready for review` : base;
    }

    onBarClick(): void {
      this.panelToggleRequested.emit();
    }

    onRefreshClick(event: Event): void {
      event.stopPropagation();
      this.refreshRequested.emit();
    }
  }
  ```

- [x] T011 [US1] Create `src/app/shared/components/workflow-readiness-bar/workflow-readiness-bar.component.html` with the exact contents below.

  ```html
  <div class="readiness-bar" [class.is-clickable]="readiness">
    <ng-container *ngIf="!readiness; else loadedTpl">
      <p-skeleton height="2.5rem" width="100%"></p-skeleton>
    </ng-container>

    <ng-template #loadedTpl>
      <div
        class="bar-body"
        [class.band-red]="colorBand === 'red'"
        [class.band-amber]="colorBand === 'amber'"
        [class.band-green]="colorBand === 'green'"
        [class.band-gray]="colorBand === 'gray'"
        [pTooltip]="tooltipText"
        tooltipPosition="bottom"
        (click)="onBarClick()"
      >
        <p-progressBar
          [value]="fillRatio"
          [showValue]="false"
          class="readiness-progress"
        ></p-progressBar>

        <span class="readiness-label" aria-live="polite" aria-atomic="true">
          <ng-container *ngIf="readiness!.mandatoryTotal === 0; else countTpl">
            No mandatory measures defined for this zone
          </ng-container>
          <ng-template #countTpl>
            {{ readiness!.mandatoryFilled }} / {{ readiness!.mandatoryTotal }}
            ({{ percentage }}%) â€” {{ ariaText }}
          </ng-template>
        </span>

        <span
          *ngIf="pausedIndicatorVisible"
          class="paused-chip"
          aria-label="Live updates paused"
        >
          <i class="pi pi-bolt"></i> live updates paused
          <a class="refresh-link" (click)="onRefreshClick($event)">Refresh</a>
        </span>
      </div>
    </ng-template>
  </div>
  ```

- [x] T012 [US1] Create `src/app/shared/components/workflow-readiness-bar/workflow-readiness-bar.component.scss` with the exact contents below.

  ```scss
  :host {
    display: block;
    width: 100%;
  }

  .readiness-bar {
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    background: var(--sage-surface-2, #1f2937);

    &.is-clickable .bar-body {
      cursor: pointer;
    }
  }

  .bar-body {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .readiness-label {
    font-family: var(--sage-font-ui, 'DM Sans'), sans-serif;
    font-size: 0.875rem;
    color: var(--sage-text-primary, #e5e7eb);
  }

  .paused-chip {
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.2rem 0.5rem;
    border-radius: 0.5rem;
    background: var(--sage-warning-bg, rgba(234, 179, 8, 0.15));
    color: var(--sage-warning-fg, #facc15);
    font-size: 0.75rem;

    .refresh-link {
      color: var(--sage-link, #60a5fa);
      text-decoration: underline;
      cursor: pointer;
    }
  }

  .band-red ::ng-deep .p-progressbar .p-progressbar-value { background: var(--sage-danger, #ef4444); }
  .band-amber ::ng-deep .p-progressbar .p-progressbar-value { background: var(--sage-warning, #f59e0b); }
  .band-green ::ng-deep .p-progressbar .p-progressbar-value { background: var(--sage-success, #10b981); }
  .band-gray ::ng-deep .p-progressbar .p-progressbar-value { background: var(--sage-muted, #6b7280); }
  ```

- [x] T013 [US1] In `src/app/app.module.ts`, declare `WorkflowReadinessBarComponent`. Add the import at the top: `import { WorkflowReadinessBarComponent } from './shared/components/workflow-readiness-bar/workflow-readiness-bar.component';`. Add `WorkflowReadinessBarComponent` to the `declarations` array (alongside `MeasurePanelComponent` around line 132). Keep alphabetical-ish order if the file uses one; otherwise append.

- [x] T014 [US1] In `src/app/pages/Ticket/ticket-detail/ticket-detail.component.ts`:
  1. Add imports at the top:
     ```typescript
     import { WorkflowReadiness } from '../../../models/workflow-readiness.model';
     import { TicketService, WorkflowReadinessBlockedError } from '../../../services/ticket.service';
     import { WebSocketService } from '../../../services/websocket.service';
     import { Subscription, auditTime, Subject } from 'rxjs';
     ```
     (If `TicketService` is already imported, just append `, WorkflowReadinessBlockedError` to the existing import binding list.)
  2. Inside the component class, add fields:
     ```typescript
     readiness: WorkflowReadiness | null = null;
     wsConnected = true;
     private readinessSub: Subscription | null = null;
     private connectedSub: Subscription | null = null;
     private readinessUpdate$ = new Subject<WorkflowReadiness>();
     ```
  3. Confirm the component already has access to `ticketService: TicketService` and a `ticketId: number` populated from the route. If `ticketService` is not yet injected, add it to the constructor: `private ticketService: TicketService`. If `WebSocketService` is not yet injected, add `private webSocketService: WebSocketService` to the constructor. **Do not remove existing constructor parameters.**

- [x] T015 [US1] In `src/app/pages/Ticket/ticket-detail/ticket-detail.component.ts`, inside `ngOnInit()` (after the existing logic that resolves `ticketId`), append:

  ```typescript
  this.loadReadiness();
  this.subscribeReadinessTopic();

  this.connectedSub = this.webSocketService.isConnected$.subscribe(
    (connected) => (this.wsConnected = connected)
  );

  this.readinessSub = this.readinessUpdate$
    .pipe(auditTime(200))
    .subscribe((r) => (this.readiness = r));
  ```

  Then add these private helper methods on the class:

  ```typescript
  private loadReadiness(): void {
    this.ticketService.getReadiness(this.ticketId).subscribe({
      next: (r) => (this.readiness = r),
      error: () => (this.readiness = null),
    });
  }

  private subscribeReadinessTopic(): void {
    this.webSocketService.subscribe(
      `/topic/validation/${this.ticketId}/readiness`,
      (payload: WorkflowReadiness) => this.readinessUpdate$.next(payload)
    );
  }
  ```

- [x] T016 [US1] In `src/app/pages/Ticket/ticket-detail/ticket-detail.component.ts`, ensure `ngOnDestroy()` exists; if not, implement `OnDestroy` on the class. Inside `ngOnDestroy()`, append:

  ```typescript
  this.readinessSub?.unsubscribe();
  this.connectedSub?.unsubscribe();
  this.webSocketService.unsubscribe(`/topic/validation/${this.ticketId}/readiness`);
  ```

- [x] T017 [US1] In `src/app/pages/Ticket/ticket-detail/ticket-detail.component.html`, locate the existing `<app-measure-panel ...>` element and insert the readiness bar **directly above** it:

  ```html
  <app-workflow-readiness-bar
    [readiness]="readiness"
    [wsConnected]="wsConnected"
    (refreshRequested)="onRefreshReadiness()"
  ></app-workflow-readiness-bar>
  ```

  Then in the TS file, add the method:

  ```typescript
  onRefreshReadiness(): void {
    this.loadReadiness();
  }
  ```

- [x] T018 [US1] In `src/app/pages/Ticket/ticket-detail/ticket-detail.component.html`, find the existing `<app-measure-panel ...>` opening tag and add the event binding `(measuresChanged)="onMeasuresChanged()"`. Then in the TS file add:

  ```typescript
  onMeasuresChanged(): void {
    if (!this.wsConnected) {
      this.loadReadiness();
    }
  }
  ```

### Tests for US1

- [x] T019 [P] [US1] Create `src/app/shared/components/workflow-readiness-bar/workflow-readiness-bar.component.spec.ts` with these test cases:

  - Renders skeleton when `readiness` is `null`.
  - Renders `mandatoryFilled / mandatoryTotal (percentage)` text when readiness is provided.
  - `colorBand` returns `'red'` for 30% filled, `'amber'` for 75% filled, `'green'` for 100% filled, `'gray'` for `mandatoryTotal === 0`.
  - `tooltipText` includes the first 5 missing-measure codes and the `+ N more` overflow when there are 7 missing entries.
  - `pausedIndicatorVisible` becomes `true` exactly 5 seconds after `wsConnected` flips to `false` (use `fakeAsync` + `tick(5000)`).
  - `pausedIndicatorVisible` returns to `false` immediately on `wsConnected` flipping back to `true` (also tested with `fakeAsync`).
  - Clicking the bar emits `panelToggleRequested`.
  - Clicking the refresh link emits `refreshRequested` (use `triggerEventHandler('click', ...)`).

  Use `TestBed.configureTestingModule` with `declarations: [WorkflowReadinessBarComponent]` and import `NoopAnimationsModule`, `ProgressBarModule`, `SkeletonModule`, `TooltipModule`. Mock no services (the component is purely presentational).

**Checkpoint**: US1 complete. Bar renders, updates over WS, and exposes outputs. The page does NOT yet wire button gating (US2) or side panel (US3).

---

## Phase 4: User Story 2 â€” Disabled Submit button + 422 handling (Priority: P1)

**Goal**: While `canTransition === false`, the existing "Submit for review" button is disabled and labeled `Submit for review (filled/total)`. On HTTP 422 from `submitForReview`, a toast is shown and the side panel will be opened (panel itself ships in US3).

**Independent Test**: With a ticket where `canTransition === false` and `mandatoryFilled = 14`, `mandatoryTotal = 16`, the existing Submit button reads `Submit for review (14/16)` and is disabled. Force a submit via devtools console; toast appears.

### Implementation

- [x] T020 [US2] In `src/app/pages/Ticket/ticket-detail/ticket-detail.component.ts`, add the getters used by the template:

  ```typescript
  get isSubmitDisabled(): boolean {
    return !this.readiness || this.readiness.canTransition === false;
  }

  get submitLabel(): string {
    if (!this.readiness) return 'Loadingâ€¦';
    if (this.readiness.canTransition) return 'Submit for review';
    return `Submit for review (${this.readiness.mandatoryFilled}/${this.readiness.mandatoryTotal})`;
  }
  ```

- [x] T021 [US2] In `src/app/pages/Ticket/ticket-detail/ticket-detail.component.html`, locate the existing "Submit for review" button (it currently calls `submitForReview(...)` or similar) and replace its `[disabled]` binding (or add one if absent) with `[disabled]="isSubmitDisabled"` and replace its visible text with `{{ submitLabel }}`. Keep all existing `*ngIf` role guards intact (do not change visibility rules). Example final state:

  ```html
  <p-button
    *ngIf="canSeeSubmitButton"     <!-- existing role-gating ngIf â€” leave as-is -->
    [disabled]="isSubmitDisabled"
    (onClick)="onSubmitForReview()"
    [label]="submitLabel"
  ></p-button>
  ```

  If the existing template uses a native `<button>` or a different PrimeNG syntax, adapt accordingly â€” **only change** the `[disabled]` and label expressions; do not change the role-guarding `*ngIf`.

- [x] T022 [US2] In `src/app/pages/Ticket/ticket-detail/ticket-detail.component.ts`, add (or replace) the click handler `onSubmitForReview()`:

  ```typescript
  private lastBlockedToastAt = 0;
  sidePanelOpen = false;

  onSubmitForReview(): void {
    this.ticketService.submitForReview(this.ticketId).subscribe({
      next: (updated) => {
        // existing post-submit UX (status refresh, navigate, toast, etc.) goes here
        // if the file already had logic here, preserve it
      },
      error: (err) => this.handleSubmitError(err),
    });
  }

  private handleSubmitError(err: unknown): void {
    if (err instanceof WorkflowReadinessBlockedError) {
      this.readiness = err.readiness;
      this.sidePanelOpen = true;
      const now = Date.now();
      if (now - this.lastBlockedToastAt >= 3000) {
        this.lastBlockedToastAt = now;
        this.messageService.add({
          severity: 'warn',
          summary: 'Submission blocked',
          detail: err.readiness.blockingReasons?.[0] ?? 'Mandatory measures missing.',
        });
      }
      return;
    }
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to submit ticket for review.',
    });
  }
  ```

  If `messageService` is not yet injected, add `private messageService: MessageService` to the constructor and `import { MessageService } from 'primeng/api';` at the top. **Do not remove** any existing post-submit logic â€” merge with whatever is already in `next:`.

### Tests for US2

- [x] T023 [P] [US2] Create `src/app/services/ticket.service.spec.ts` test cases under a new `describe('getReadiness + submitForReview 422', ...)` block (append to the existing file if it exists; create the file if not, mirroring the structure of `src/app/services/validation-measure.service.spec.ts`):

  - `getReadiness(id)` issues `GET /api/validations/{id}/readiness` and returns the body.
  - `getReadiness(id, 'EN_REVUE')` issues `GET /api/validations/{id}/readiness?targetStatus=EN_REVUE`.
  - `submitForReview(id)` returning HTTP 422 with `{ canTransition: false, ... }` body translates into a `WorkflowReadinessBlockedError` whose `.readiness` matches the body.
  - `submitForReview(id)` returning HTTP 500 rethrows the original `HttpErrorResponse` (assert `err instanceof HttpErrorResponse`).
  - `submitForReview(id)` returning HTTP 200 emits the body as `Validation` (no error).

  Use `HttpClientTestingModule` + `HttpTestingController`. Reference the existing `validation-measure.service.spec.ts` for the patterns already used in this repo.

**Checkpoint**: US2 complete. Submit button is disabled when blocked, label reflects progress, 422 â†’ toast + readiness updated.

---

## Phase 5: User Story 3 â€” Blocking-measures side panel (Priority: P2)

**Goal**: User clicks the bar (or the toast triggers it) to see exactly which measures are missing / out-of-range, each row clickable to scroll to the matching `MeasurePanel` row.

**Independent Test**: With a ticket where `missingMeasures.length === 3` and `outOfRangeMeasures.length === 1`, click the bar â†’ side panel opens with two sections, 3 + 1 rows. Click a missing row â†’ page scrolls to the matching `MeasurePanel` row (or opens the Phase 002 catalog dialog pre-filled if the row does not yet exist).

### Implementation

- [x] T024 [US3] Create `src/app/shared/components/workflow-readiness-panel/workflow-readiness-panel.component.ts`:

  ```typescript
  import { Component, EventEmitter, Input, Output } from '@angular/core';
  import {
    WorkflowReadiness,
    WorkflowReadinessMissingMeasure,
    WorkflowReadinessOutOfRangeMeasure,
  } from '../../../models/workflow-readiness.model';

  @Component({
    selector: 'app-workflow-readiness-panel',
    templateUrl: './workflow-readiness-panel.component.html',
    styleUrls: ['./workflow-readiness-panel.component.scss'],
    standalone: false,
  })
  export class WorkflowReadinessPanelComponent {
    @Input() visible = false;
    @Input() readiness: WorkflowReadiness | null = null;

    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() missingMeasureClicked = new EventEmitter<WorkflowReadinessMissingMeasure>();
    @Output() outOfRangeMeasureClicked = new EventEmitter<WorkflowReadinessOutOfRangeMeasure>();

    get isEmpty(): boolean {
      if (!this.readiness) return true;
      return (
        this.readiness.missingMeasures.length === 0 &&
        this.readiness.outOfRangeMeasures.length === 0
      );
    }

    onHide(): void {
      this.visible = false;
      this.visibleChange.emit(false);
    }

    onMissingClick(m: WorkflowReadinessMissingMeasure): void {
      this.missingMeasureClicked.emit(m);
    }

    onOutOfRangeClick(m: WorkflowReadinessOutOfRangeMeasure): void {
      this.outOfRangeMeasureClicked.emit(m);
    }
  }
  ```

- [x] T025 [US3] Create `src/app/shared/components/workflow-readiness-panel/workflow-readiness-panel.component.html`:

  ```html
  <p-sidebar
    [(visible)]="visible"
    (visibleChange)="visibleChange.emit($event)"
    position="right"
    [modal]="false"
    [style]="{ width: '28rem' }"
    styleClass="readiness-side-panel"
  >
    <ng-template pTemplate="header">
      <h3>Workflow blockers</h3>
    </ng-template>

    <div *ngIf="isEmpty" class="empty-state">
      <i class="pi pi-check-circle"></i>
      All mandatory measures complete.
    </div>

    <ng-container *ngIf="!isEmpty && readiness">
      <section *ngIf="readiness.missingMeasures.length > 0">
        <h4>Missing mandatory measures ({{ readiness.missingMeasures.length }})</h4>
        <ul class="row-list">
          <li
            *ngFor="let m of readiness.missingMeasures"
            class="row missing"
            (click)="onMissingClick(m)"
          >
            <span class="code">{{ m.measureCode }}</span>
            <span class="label">{{ m.label }}</span>
          </li>
        </ul>
      </section>

      <section *ngIf="readiness.outOfRangeMeasures.length > 0">
        <h4>Out-of-range measures ({{ readiness.outOfRangeMeasures.length }})</h4>
        <ul class="row-list">
          <li
            *ngFor="let m of readiness.outOfRangeMeasures"
            class="row out-of-range"
            (click)="onOutOfRangeClick(m)"
          >
            <span class="code">{{ m.measureCode }}</span>
            <span class="value">
              {{ m.measuredValue }} {{ m.unit }}
              <small>[{{ m.lowerBound }} â€¦ {{ m.upperBound }}]</small>
              <small>({{ m.deviationPct | number:'1.0-1' }}%)</small>
            </span>
          </li>
        </ul>
      </section>
    </ng-container>
  </p-sidebar>
  ```

- [x] T026 [US3] Create `src/app/shared/components/workflow-readiness-panel/workflow-readiness-panel.component.scss`:

  ```scss
  :host ::ng-deep .readiness-side-panel { background: var(--sage-surface-1, #111827); }

  h3 { margin: 0; font-family: var(--sage-font-ui, 'DM Sans'), sans-serif; }

  h4 {
    margin: 1rem 0 0.5rem;
    font-size: 0.875rem;
    color: var(--sage-text-secondary, #9ca3af);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 2rem;
    color: var(--sage-success, #10b981);
  }

  .row-list { list-style: none; padding: 0; margin: 0; }

  .row {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.5rem 0.75rem;
    border-radius: 0.375rem;
    cursor: pointer;

    &:hover { background: var(--sage-surface-3, rgba(255, 255, 255, 0.05)); }

    .code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.8125rem;
      color: var(--sage-text-primary, #e5e7eb);
    }

    .label, .value {
      font-size: 0.8125rem;
      color: var(--sage-text-secondary, #9ca3af);
    }

    &.missing .code { color: var(--sage-warning, #f59e0b); }
    &.out-of-range .code { color: var(--sage-danger, #ef4444); }
  }
  ```

- [x] T027 [US3] In `src/app/app.module.ts`, declare `WorkflowReadinessPanelComponent`. Add import `import { WorkflowReadinessPanelComponent } from './shared/components/workflow-readiness-panel/workflow-readiness-panel.component';` and add the symbol to the `declarations` array next to `WorkflowReadinessBarComponent`.

- [x] T028 [US3] In `src/app/pages/Ticket/ticket-detail/ticket-detail.component.html`, append after the `<app-workflow-readiness-bar ...>` element:

  ```html
  <app-workflow-readiness-panel
    [(visible)]="sidePanelOpen"
    [readiness]="readiness"
    (missingMeasureClicked)="onMissingMeasureClicked($event)"
    (outOfRangeMeasureClicked)="onOutOfRangeMeasureClicked($event)"
  ></app-workflow-readiness-panel>
  ```

  Then in the `<app-workflow-readiness-bar>` element, add the event binding `(panelToggleRequested)="sidePanelOpen = !sidePanelOpen"`.

- [x] T029 [US3] In `src/app/pages/Ticket/ticket-detail/ticket-detail.component.ts`, add:

  ```typescript
  import { ViewChild } from '@angular/core';
  import { MeasurePanelComponent } from '../measure-panel/measure-panel.component';
  import {
    WorkflowReadinessMissingMeasure,
    WorkflowReadinessOutOfRangeMeasure,
  } from '../../../models/workflow-readiness.model';
  ```

  Inside the class, add the ViewChild and handlers:

  ```typescript
  @ViewChild(MeasurePanelComponent) measurePanel?: MeasurePanelComponent;

  onMissingMeasureClicked(m: WorkflowReadinessMissingMeasure): void {
    this.measurePanel?.scrollToMeasureCode(m.measureCode);
  }

  onOutOfRangeMeasureClicked(m: WorkflowReadinessOutOfRangeMeasure): void {
    this.measurePanel?.scrollToMeasureCode(m.measureCode);
  }
  ```

  Note: opening the Phase 002 catalog dialog when the row does not exist yet is an enhancement; if `scrollToMeasureCode` finds no row (returns silently), this is acceptable behavior for the MVP. A follow-up task could wire `MeasurePanelComponent.openAddDialogForTemplate(...)` once that API exists.

### Tests for US3

- [x] T030 [P] [US3] Create `src/app/shared/components/workflow-readiness-panel/workflow-readiness-panel.component.spec.ts`:

  - When `readiness` is `null` or both lists are empty, `isEmpty` is `true` and the empty state is rendered.
  - Renders one `<li>` per missing measure and one per out-of-range measure.
  - Clicking a missing row emits `missingMeasureClicked` with the corresponding object.
  - Clicking an out-of-range row emits `outOfRangeMeasureClicked` with the corresponding object.
  - Setting `visible = false` via `onHide()` emits `visibleChange` with `false`.

  Configure `TestBed` with `declarations: [WorkflowReadinessPanelComponent]`, imports `SidebarModule`, `NoopAnimationsModule`, `CommonModule`. The PrimeNG Sidebar renders to overlay; use `fixture.nativeElement.ownerDocument` to query its contents.

**Checkpoint**: US3 complete. Side panel opens on bar click, lists missing + out-of-range rows, clicking each scrolls to the matching `MeasurePanel` row.

---

## Phase 6: User Story 4 â€” WS-paused degradation (Priority: P2)

**Goal**: When the WebSocket connection is down for â‰¥ 5 s, the bar shows a "live updates paused" chip. Every measure mutation refreshes readiness once via HTTP. A manual "Refresh" link issues a one-shot HTTP refresh.

**Independent Test**: Stop the backend â†’ within ~5 s the chip appears. Click the Refresh link â†’ one HTTP GET to `/readiness` issues. Mutate a measure â†’ HTTP refresh issues. Restart the backend â†’ chip disappears within 1 s.

### Implementation

Most of this story is already covered by Phase 3 (T010 â†’ `pausedIndicatorVisible`, T015 â†’ `connectedSub`) and T018 (`onMeasuresChanged` â†’ `loadReadiness()` while paused). The remaining wiring tasks:

- [x] T031 [US4] Verify `onMeasuresChanged()` in `src/app/pages/Ticket/ticket-detail/ticket-detail.component.ts` matches:

  ```typescript
  onMeasuresChanged(): void {
    if (!this.wsConnected) {
      this.loadReadiness();
    }
  }
  ```

  If T018 was already done this is a no-op; mark this task complete by reading the file and confirming.

- [x] T032 [US4] In `src/app/pages/Ticket/ticket-detail/ticket-detail.component.ts`, confirm the `onRefreshReadiness()` method (created in T017) exists and calls `this.loadReadiness()`. No new code required if T017 is complete.

- [x] T033 [US4] In `src/app/pages/Ticket/ticket-detail/ticket-detail.component.html`, confirm the readiness-bar element binds `[wsConnected]="wsConnected"` and `(refreshRequested)="onRefreshReadiness()"`. If missing, add them.

- [x] T034 [US4] **Negative-coverage guard**: search `src/app/pages/Ticket/ticket-detail/ticket-detail.component.ts` for any `setInterval(` or `interval(` calls that might poll readiness on a timer. If found and clearly related to readiness, remove them â€” FR-021a explicitly prohibits timer-based polling. (Unrelated intervals â€” e.g., existing chat heartbeat â€” should be left alone.)

### Tests for US4

- [x] T035 [P] [US4] In `src/app/pages/Ticket/ticket-detail/ticket-detail.component.spec.ts` (extend the existing file), add a `describe('readiness wiring', ...)` block with:

  - On `ngOnInit`, `ticketService.getReadiness` is called exactly once.
  - On a WebSocket payload pushed via the `WebSocketService` stub's `subscribe` callback, after the 200 ms `auditTime` tick, `component.readiness` matches the pushed payload.
  - When `webSocketService.isConnected$` emits `false` and 5 s elapse (`fakeAsync` + `tick(5000)`), then a `measuresChanged` event from `MeasurePanel` triggers a second `getReadiness` call.
  - When `webSocketService.isConnected$` is `true`, a `measuresChanged` event does NOT trigger a second `getReadiness` call.
  - On a 422 from `submitForReview`, the typed `WorkflowReadinessBlockedError` is handled: `sidePanelOpen` becomes `true` and `messageService.add` is called once.
  - Two 422s within 3 s trigger `messageService.add` exactly once (toast dedup, R11).

  Use a `WebSocketServiceStub` with a `Subject<boolean>` for `isConnected$` and a `subscribe(topic, cb)` that stores the callback so the spec can drive payloads. Use a `TicketServiceStub` with spies returning controllable observables (`of(...)` / `throwError(() => new WorkflowReadinessBlockedError(...))`).

**Checkpoint**: US4 complete. Degradation indicator works, mutation-driven fallback fires only while paused, no timer-based polling exists.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T036 Run `npm test -- --watch=false --browsers=ChromeHeadless --include='src/app/services/ticket.service.spec.ts' --include='src/app/pages/Ticket/ticket-detail/ticket-detail.component.spec.ts' --include='src/app/shared/components/workflow-readiness-bar/workflow-readiness-bar.component.spec.ts' --include='src/app/shared/components/workflow-readiness-panel/workflow-readiness-panel.component.spec.ts'` and ensure all four spec files pass.

- [x] T037 Run `ng build --configuration=development` to confirm the project compiles. If a TS error appears, fix it locally (most likely import paths; do not invent new symbols).

- [x] T038 Manual smoke walk-through following `spec-RealMesure/specs/003-workflow-guard-frontend/quickstart.md` steps 1â€“9. Use the role `TECH_VAL` for steps 1â€“7 and `EXPERT` for step 8.

- [x] T039 [P] Update `spec-RealMesure/specs/003-workflow-guard-frontend/checklists/requirements.md`: change the heading to add a "Reviewed during implementation 2026-05-15" stamp and mark all items checked once tests + manual walkthrough pass.

---

## Dependencies & Story Completion Order

```
Phase 2 (Foundational: T001â€“T009)
   â”œâ”€â”€ T001 â†’ T002 â†’ T003 â†’ T004 [sequential; all touch ticket.service.ts except T001]
   â”œâ”€â”€ T005 â†’ T007 [both touch measure-panel.component.ts; sequential]
   â”œâ”€â”€ T006 [P with T005/T007] (HTML file)
   â”œâ”€â”€ T008 [P] (SCSS file)
   â””â”€â”€ T009 [P] (primeng.module.ts)

Phase 3 (US1: T010â€“T019)
   â”œâ”€â”€ T010 â†’ T011 â†’ T012 [bar component files; sequential]
   â”œâ”€â”€ T013 [after T010] (module declaration)
   â”œâ”€â”€ T014 â†’ T015 â†’ T016 â†’ T017 â†’ T018 [ticket-detail.component.ts; sequential]
   â””â”€â”€ T019 [P after T010â€“T012] (bar spec)

Phase 4 (US2: T020â€“T023) â€” depends on Phase 3 (uses ticket-detail.component.ts state)
   â”œâ”€â”€ T020 â†’ T021 â†’ T022 [sequential]
   â””â”€â”€ T023 [P after T002â€“T004]

Phase 5 (US3: T024â€“T030) â€” depends on Phase 3 (panel toggled by bar) and T007 (scrollToMeasureCode)
   â”œâ”€â”€ T024 â†’ T025 â†’ T026 [panel files; sequential]
   â”œâ”€â”€ T027 [after T024]
   â”œâ”€â”€ T028 â†’ T029 [ticket-detail wire-up; sequential]
   â””â”€â”€ T030 [P after T024â€“T026]

Phase 6 (US4: T031â€“T035) â€” depends on Phase 3 (uses wsConnected wiring)
   â”œâ”€â”€ T031, T032, T033 â€” verification tasks (sequential reads of ticket-detail.component.ts)
   â”œâ”€â”€ T034 [P]
   â””â”€â”€ T035 [P after T020â€“T022]

Phase 7 (Polish: T036â€“T039) â€” depends on all previous phases
```

### Per-phase parallel opportunities

- **Phase 2**: T002, T005, T006, T008, T009 can run in parallel after T001 lands.
- **Phase 3**: T013 and T019 can be done in parallel with the ticket-detail wiring (T014â€“T018).
- **Phase 4**: T023 (the service spec) can be done in parallel with T020â€“T022 if the implementer is comfortable holding the spec in mind.
- **Phase 5**: T030 (the panel spec) can be done in parallel with T028â€“T029.
- **Phase 6**: T034 and T035 can be done in parallel.

## Implementation Strategy

- **MVP scope (deliver first)**: Phase 2 + Phase 3 (US1). This delivers a live readiness bar without changing the Submit button â€” already user-visible value.
- **First production increment**: + Phase 4 (US2). Submit gating is the headline business rule.
- **Second increment**: + Phase 5 (US3). Side panel makes the bar actionable.
- **Third increment**: + Phase 6 (US4). Degradation polish â€” important for the demo but not required for happy-path correctness.
- **Final**: Phase 7. Tests passing + manual walkthrough.

## Independent test criteria per story (recap)

- **US1**: Bar renders correct `(filled/total)` after page load and updates over WS within 1 s of a measure mutation.
- **US2**: Submit button disabled with `(filled/total)` label when `canTransition === false`; HTTP 422 â†’ toast + side panel-open flag flipped.
- **US3**: Bar click â†’ side panel shows missing + out-of-range; row click â†’ scroll to matching `MeasurePanel` row with brief highlight.
- **US4**: WS off â‰¥ 5 s â†’ "live updates paused" chip; measure mutation triggers HTTP refresh; manual refresh link triggers HTTP refresh; no timer-based polling.

## Format check (last line of defense)

Every task in this file follows `- [ ] TNNN [P?] [Story?] description with file path`. Setup/Foundational/Polish tasks omit the `[Story]` tag; user-story tasks include `[US1]â€¦[US4]`. Tasks 31â€“33 are verification-only and may resolve as no-ops if the related implementation tasks were performed exactly as specified.

