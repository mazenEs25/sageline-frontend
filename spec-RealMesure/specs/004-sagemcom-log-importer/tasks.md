---

description: "Task list for Sagemcom Log Importer — Frontend (Phase 004). Optimized for an implementer LLM (Haiku-class): each task names a single file, gives the exact code/skeleton, and avoids cross-task inference."
---

# Tasks: Sagemcom Log Importer — Frontend (Phase 004)

**Input**: Design documents from `spec-RealMesure/specs/004-sagemcom-log-importer/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/log-importer-api.md ✓

**Tests**: Karma/Jasmine tests are included because FR-022/FR-023 explicitly require them and Constitution VII demands real-log-driven fixtures for importer code.

**Implementer note (Haiku-friendly)**: Every task targets ONE file with a clear deliverable. Code skeletons are included verbatim — paste them and adjust only the obvious tokens that the task tells you to adjust. **Do not invent file paths, symbol names, enum members, or import sources**; if anything is missing from a task treat it as a bug and ask, do not guess.

**Verified codebase facts** (use these names verbatim — do not rename):

- `ValidationMeasureService` exists at `src/app/services/validation-measure.service.ts`. Its existing methods are `list`, `create`, `update`, `delete`, `createBatch`, `updateBatch`, `fromTemplate`, `fromCatalog`. Its `apiUrl` field is `${environment.apiUrl}/validations`.
- `ValidationMeasure` model is at `src/app/models/validation-measure.model.ts` and already has a `sourceLogFile: string | null` field — no schema change needed.
- `MeasureStatus` enum lives at `src/app/shared/enums/measure-status.enum.ts`. Members include `OK`, `OUT_OF_RANGE`, `NOT_EXECUTED`.
- `Role` enum lives at `src/app/shared/enums/role.enum.ts` (note: **role.enum.ts**, NOT `role.ts`). Members: `ADMIN_IT`, `CHEF_SECTEUR`, `EXPERT`, `TECH_VAL`, `TECH_PREP`, `RESPONSABLE`.
- `MeasurePanelComponent` lives at `src/app/pages/Ticket/measure-panel/`. Already declared in `src/app/app.module.ts`.
- `TicketDetailComponent` lives at `src/app/pages/Ticket/ticket-detail/`. Already declared.
- The PrimeNG centralized module is `src/app/shared/primeng/primeng.module.ts`. It currently exports `DialogModule`, `TagModule`, `BadgeModule`, `TooltipModule`, `ToastModule`, `MessageModule`, `SkeletonModule`, `TableModule`, `ButtonModule`, `ProgressSpinnerModule`. It does **NOT** yet export `FileUploadModule` or `AccordionModule` — Phase 2 tasks add them.
- `MessageService` from `primeng/api` is already provided in `app.module.ts` (line 22). `<p-toast>` is mounted globally — just inject `MessageService` and call `.add({...})`.
- `AuthService` exists at `src/app/services/auth.service.ts` and exposes `getRoles(): string[]`. Use it to gate UI by role.
- The contract is `spec-RealMesure/specs/004-sagemcom-log-importer/contracts/log-importer-api.md`. Field names there are authoritative.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story (US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

No new npm dependencies. No new build config. **Skip to Phase 2.**

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add the 5 model files, extend the PrimeNG module with `FileUploadModule` + `AccordionModule`, and add the 3 new service methods to `ValidationMeasureService`. Everything in Phase 2 MUST be complete before any user story phase begins.

- [ ] T001 [P] Create `src/app/models/matched-measure.model.ts` with the exact contents below. Do not change field names or order.

  ```typescript
  import { MeasureStatus } from '../shared/enums/measure-status.enum';

  export interface MatchedMeasure {
    /** Present only on import-log responses; omitted by preview-log. */
    id?: number;
    measureCode: string;
    label: string;
    value: number;
    unit: string;
    status: MeasureStatus;
    lower: number;
    upper: number;
    templateId: number;
  }
  ```

- [ ] T002 [P] Create `src/app/models/unmatched-measure.model.ts` with the exact contents below.

  ```typescript
  export interface UnmatchedMeasure {
    measureCode: string;
    reason: string;
  }
  ```

- [ ] T003 [P] Create `src/app/models/skipped-measure.model.ts` with the exact contents below.

  ```typescript
  import { MeasureStatus } from '../shared/enums/measure-status.enum';

  export interface SkippedMeasure {
    measureCode: string;
    existingValue: number | null;
    existingStatus: MeasureStatus;
    incomingValue: number;
  }
  ```

- [ ] T004 [P] Create `src/app/models/log-import-report.model.ts` with the exact contents below.

  ```typescript
  import { MatchedMeasure } from './matched-measure.model';
  import { UnmatchedMeasure } from './unmatched-measure.model';
  import { SkippedMeasure } from './skipped-measure.model';

  export type LogFormat = 'BNFT' | 'BWC' | 'BTF';

  export interface LogImportReport {
    detectedFormat: LogFormat;
    totalParsed: number;
    matched: MatchedMeasure[];
    skipped: SkippedMeasure[];
    unmatched: UnmatchedMeasure[];
    warnings: string[];
  }
  ```

- [ ] T005 [P] Create `src/app/models/log-source-snippet.model.ts` with the exact contents below.

  ```typescript
  export interface LogSourceSnippet {
    filename: string;
    snippet: string;
    /** Optional, e.g. "42-58". */
    lineRange?: string;
  }
  ```

- [ ] T006 Modify `src/app/shared/primeng/primeng.module.ts`: add the two missing PrimeNG modules used by Phase 004.

  At the top of the file, **add** these two import lines next to the existing PrimeNG imports:

  ```typescript
  import { FileUploadModule } from 'primeng/fileupload';
  import { AccordionModule } from 'primeng/accordion';
  ```

  Then add `FileUploadModule` and `AccordionModule` to **both** the `imports:` and `exports:` arrays of the `@NgModule({...})` decorator. Do not touch any other entry; preserve ordering of existing entries.

- [ ] T007 Modify `src/app/services/validation-measure.service.ts`: add three new methods at the end of the class (after `fromCatalog`). The top-of-file imports section must also gain three new lines.

  **Add to imports at top of file:**

  ```typescript
  import { LogImportReport } from '../models/log-import-report.model';
  import { LogSourceSnippet } from '../models/log-source-snippet.model';
  ```

  **Append inside the class, after `fromCatalog`:**

  ```typescript
    previewLog(validationId: number, file: File): Observable<LogImportReport> {
      const body = new FormData();
      body.append('file', file, file.name);
      return this.http.post<LogImportReport>(`${this.apiUrl}/${validationId}/preview-log`, body);
    }

    importLog(validationId: number, file: File): Observable<LogImportReport> {
      const body = new FormData();
      body.append('file', file, file.name);
      return this.http.post<LogImportReport>(`${this.apiUrl}/${validationId}/import-log`, body);
    }

    getSourceSnippet(validationId: number, measureId: number): Observable<LogSourceSnippet> {
      return this.http.get<LogSourceSnippet>(`${this.apiUrl}/${validationId}/measures/${measureId}/source-snippet`);
    }
  ```

  Do not set a `Content-Type` header anywhere — the browser supplies the multipart boundary automatically.

- [ ] T008 Append three new Karma specs to `src/app/services/validation-measure.service.spec.ts`. Copy the block below verbatim **inside** the existing `describe('ValidationMeasureService', () => { ... })` block, just before its closing `});`. Do not touch existing tests.

  ```typescript
    it('previewLog: POSTs multipart to /{id}/preview-log with a part named "file"', () => {
      const file = new File(['hello log'], 'a.log', { type: 'text/plain' });
      service.previewLog(7, file).subscribe();
      const req = httpMock.expectOne({ url: `${apiUrl}/7/preview-log`, method: 'POST' });
      expect(req.request.body instanceof FormData).toBeTrue();
      const fd = req.request.body as FormData;
      expect(fd.get('file') instanceof File).toBeTrue();
      expect((fd.get('file') as File).name).toBe('a.log');
      req.flush({ detectedFormat: 'BWC', totalParsed: 0, matched: [], skipped: [], unmatched: [], warnings: [] });
    });

    it('importLog: POSTs multipart to /{id}/import-log with a part named "file"', () => {
      const file = new File(['hello log'], 'b.log', { type: 'text/plain' });
      service.importLog(9, file).subscribe();
      const req = httpMock.expectOne({ url: `${apiUrl}/9/import-log`, method: 'POST' });
      expect(req.request.body instanceof FormData).toBeTrue();
      req.flush({ detectedFormat: 'BNFT', totalParsed: 0, matched: [], skipped: [], unmatched: [], warnings: [] });
    });

    it('getSourceSnippet: GETs /{id}/measures/{measureId}/source-snippet', () => {
      service.getSourceSnippet(11, 33).subscribe(snip => {
        expect(snip.filename).toBe('a.log');
      });
      const req = httpMock.expectOne({ url: `${apiUrl}/11/measures/33/source-snippet`, method: 'GET' });
      req.flush({ filename: 'a.log', snippet: 'Mesure <X>...', lineRange: '1-2' });
    });
  ```

**Checkpoint**: Phase 2 done — models, PrimeNG primitives, and service methods are in place. Run `ng test --include='**/validation-measure.service.spec.ts'` and confirm all tests pass before moving on.

---

## Phase 3: User Story 1 — Import a Sagemcom log to auto-populate measures (Priority: P1) 🎯 MVP

**Goal**: A `TECH_VAL` / `TECH_PREP` / `ADMIN_IT` user opens a ticket, clicks "Import Sagemcom log", drops a `.log` file, sees a preview, confirms, and the measure panel + readiness bar refresh.

**Independent Test**: With backend running, open any `EN_COURS` ticket, drag-drop `bwc-gateway-safran-wifi5g.log` into the dialog, click "Confirm import", verify ≥16 measures appear in `MeasurePanel` and the readiness bar advances. No browser refresh, no console errors.

### Implementation for User Story 1

- [ ] T009 [US1] Create `src/app/pages/Ticket/log-import-dialog/log-import-dialog.component.ts`. Paste the skeleton below verbatim. Do not rename inputs/outputs.

  ```typescript
  import { Component, EventEmitter, Input, Output } from '@angular/core';
  import { MessageService } from 'primeng/api';
  import { ValidationMeasureService } from '../../../services/validation-measure.service';
  import { AuthService } from '../../../services/auth.service';
  import { LogImportReport } from '../../../models/log-import-report.model';
  import { Role } from '../../../shared/enums/role.enum';

  const MAX_BYTES = 10 * 1024 * 1024;
  const ALLOWED_EXT = ['.log', '.txt'];

  @Component({
    selector: 'app-log-import-dialog',
    templateUrl: './log-import-dialog.component.html',
    styleUrls: ['./log-import-dialog.component.scss'],
    standalone: false
  })
  export class LogImportDialogComponent {
    @Input() ticketId!: number;
    @Input() posteType: string = '';
    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() importSucceeded = new EventEmitter<number[]>();

    droppedFile: File | null = null;
    report: LogImportReport | null = null;
    loading = false;
    submitting = false;
    fileError: string | null = null;

    constructor(
      private measures: ValidationMeasureService,
      private auth: AuthService,
      private toast: MessageService
    ) {}

    get totalMatched(): number { return this.report?.matched.length ?? 0; }
    get totalSkipped(): number { return this.report?.skipped.length ?? 0; }
    get totalUnmatched(): number { return this.report?.unmatched.length ?? 0; }
    get totalWarnings(): number { return this.report?.warnings.length ?? 0; }
    get hasSkipped(): boolean { return this.totalSkipped > 0; }
    get hasUnmatched(): boolean { return this.totalUnmatched > 0; }
    get confirmDisabled(): boolean { return this.submitting || this.totalMatched === 0; }

    get canAddToCatalog(): boolean {
      const roles = this.auth.getRoles();
      return roles.includes(Role.ADMIN_IT) || roles.includes(Role.CHEF_SECTEUR);
    }

    onFileSelected(event: { files: File[] }): void {
      this.fileError = null;
      const file = event.files?.[0];
      if (!file) return;
      const lower = file.name.toLowerCase();
      const okExt = ALLOWED_EXT.some(ext => lower.endsWith(ext));
      if (!okExt) {
        this.fileError = lower.endsWith('.zip')
          ? 'ZIP not supported — drop a .log or .txt file'
          : 'Unsupported file type — drop a .log or .txt file';
        return;
      }
      if (file.size > MAX_BYTES) {
        this.fileError = 'File too large (max 10 MB)';
        return;
      }
      this.droppedFile = file;
      this.runPreview();
    }

    runPreview(): void {
      if (!this.droppedFile) return;
      this.loading = true;
      this.report = null;
      this.measures.previewLog(this.ticketId, this.droppedFile).subscribe({
        next: (report) => { this.report = report; this.loading = false; },
        error: (err) => {
          this.loading = false;
          this.report = null;
          this.toast.add({ severity: 'error', summary: 'Parse failed', detail: err?.error?.message ?? 'Could not parse log file' });
        }
      });
    }

    rePreview(): void { this.runPreview(); }

    confirmImport(): void {
      if (!this.droppedFile || this.confirmDisabled) return;
      this.submitting = true;
      this.measures.importLog(this.ticketId, this.droppedFile).subscribe({
        next: (report) => {
          const ids = (report.matched || []).map(m => m.id!).filter((id): id is number => typeof id === 'number');
          this.toast.add({
            severity: 'success',
            summary: 'Import completed',
            detail: `${report.matched.length} measures created from ${this.droppedFile?.name ?? 'log'}`
          });
          this.importSucceeded.emit(ids);
          this.close();
        },
        error: (err) => {
          this.submitting = false;
          this.toast.add({ severity: 'error', summary: 'Import failed', detail: err?.error?.message ?? 'Network or server error' });
        }
      });
    }

    openCatalogTab(code: string): void {
      const url = `/admin/poste-catalog/new?measureCode=${encodeURIComponent(code)}&posteType=${encodeURIComponent(this.posteType)}`;
      window.open(url, '_blank');
    }

    close(): void {
      this.visible = false;
      this.visibleChange.emit(false);
      this.droppedFile = null;
      this.report = null;
      this.loading = false;
      this.submitting = false;
      this.fileError = null;
    }
  }
  ```

  > **Note for implementer**: the `openCatalogTab` URL is a **best-effort default** to the Phase 001 catalog route. If that route does not yet exist at the time of integration, leave the function as-is — the link will simply 404 in the new tab; that is acceptable for this phase. Do NOT invent a different route.

- [ ] T010 [US1] Create `src/app/pages/Ticket/log-import-dialog/log-import-dialog.component.html` with the exact contents below.

  ```html
  <p-dialog
    [(visible)]="visible"
    (visibleChange)="visibleChange.emit($event)"
    [modal]="true"
    [draggable]="false"
    [resizable]="false"
    [closable]="true"
    [style]="{ width: 'min(720px, 92vw)' }"
    header="Import Sagemcom log"
    (onHide)="close()">

    <!-- Drop region -->
    <div class="log-import-drop" *ngIf="!report && !loading">
      <p-fileUpload
        mode="basic"
        chooseLabel="Drop .log or .txt"
        accept=".log,.txt"
        [auto]="true"
        [customUpload]="true"
        (uploadHandler)="onFileSelected($event)">
      </p-fileUpload>
      <p-message *ngIf="fileError" severity="error" [text]="fileError"></p-message>
    </div>

    <!-- Spinner -->
    <div class="log-import-loading" *ngIf="loading">
      <p-progressSpinner></p-progressSpinner>
      <span>Parsing log…</span>
    </div>

    <!-- Preview -->
    <div class="log-import-preview" *ngIf="report && !loading">
      <div class="log-import-chips">
        <p-tag severity="info" [value]="'Detected format: ' + report.detectedFormat"></p-tag>
        <p-tag severity="secondary" [value]="'Total parsed: ' + report.totalParsed"></p-tag>
      </div>

      <p-accordion [multiple]="true" [activeIndex]="[0]">
        <p-accordionTab>
          <ng-template pTemplate="header">
            <span>Matched</span>
            <p-badge [value]="totalMatched" severity="success"></p-badge>
          </ng-template>
          <p-table [value]="report.matched" *ngIf="totalMatched > 0">
            <ng-template pTemplate="header">
              <tr><th>Code</th><th>Label</th><th>Value</th><th>Unit</th><th>Range</th><th>Status</th></tr>
            </ng-template>
            <ng-template pTemplate="body" let-row>
              <tr>
                <td>{{ row.measureCode }}</td>
                <td>{{ row.label }}</td>
                <td>{{ row.value }}</td>
                <td>{{ row.unit }}</td>
                <td>[{{ row.lower }}, {{ row.upper }}]</td>
                <td>{{ row.status }}</td>
              </tr>
            </ng-template>
          </p-table>
          <p class="log-import-empty" *ngIf="totalMatched === 0">No matchable measures in this log.</p>
        </p-accordionTab>

        <p-accordionTab *ngIf="hasSkipped">
          <ng-template pTemplate="header">
            <span>Skipped (already present)</span>
            <p-badge [value]="totalSkipped" severity="secondary"></p-badge>
          </ng-template>
          <p-table [value]="report.skipped">
            <ng-template pTemplate="header">
              <tr><th>Code</th><th>Existing value</th><th>Existing status</th><th>Incoming value (discarded)</th></tr>
            </ng-template>
            <ng-template pTemplate="body" let-row>
              <tr>
                <td>{{ row.measureCode }}</td>
                <td>{{ row.existingValue }}</td>
                <td>{{ row.existingStatus }}</td>
                <td>{{ row.incomingValue }}</td>
              </tr>
            </ng-template>
          </p-table>
        </p-accordionTab>

        <p-accordionTab>
          <ng-template pTemplate="header">
            <span>Unmatched</span>
            <p-badge [value]="totalUnmatched" severity="warning"></p-badge>
          </ng-template>
          <p-table [value]="report.unmatched" *ngIf="hasUnmatched">
            <ng-template pTemplate="header">
              <tr><th>Code</th><th>Reason</th><th *ngIf="canAddToCatalog">Action</th></tr>
            </ng-template>
            <ng-template pTemplate="body" let-row>
              <tr>
                <td>{{ row.measureCode }}</td>
                <td>{{ row.reason }}</td>
                <td *ngIf="canAddToCatalog">
                  <button pButton type="button" class="p-button-text p-button-sm"
                          icon="pi pi-external-link" label="Add to catalog"
                          (click)="openCatalogTab(row.measureCode)"></button>
                </td>
              </tr>
            </ng-template>
          </p-table>
          <p class="log-import-empty" *ngIf="!hasUnmatched">No unmatched measures.</p>
        </p-accordionTab>

        <p-accordionTab>
          <ng-template pTemplate="header">
            <span>Warnings</span>
            <p-badge [value]="totalWarnings" severity="warning"></p-badge>
          </ng-template>
          <ul *ngIf="totalWarnings > 0"><li *ngFor="let w of report.warnings">{{ w }}</li></ul>
          <p class="log-import-empty" *ngIf="totalWarnings === 0">No warnings.</p>
        </p-accordionTab>
      </p-accordion>
    </div>

    <ng-template pTemplate="footer">
      <button *ngIf="report && hasUnmatched" pButton type="button"
              class="p-button-text" icon="pi pi-refresh"
              label="Re-preview after fixes" [disabled]="loading || submitting"
              (click)="rePreview()"></button>
      <button pButton type="button" class="p-button-text" label="Cancel" (click)="close()"></button>
      <button pButton type="button" class="p-button-primary"
              label="Confirm import"
              [disabled]="confirmDisabled || !report"
              [pTooltip]="totalMatched === 0 ? 'No measures to import' : ''"
              (click)="confirmImport()"></button>
    </ng-template>
  </p-dialog>
  ```

- [ ] T011 [US1] Create `src/app/pages/Ticket/log-import-dialog/log-import-dialog.component.scss` with the contents below.

  ```scss
  :host { display: contents; }

  .log-import-drop {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 2rem;
    border: 2px dashed var(--surface-border, #444);
    border-radius: 0.5rem;
  }

  .log-import-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 2rem;
  }

  .log-import-preview {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .log-import-chips {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .log-import-empty {
    color: var(--text-color-secondary, #888);
    font-style: italic;
    margin: 0.5rem 0;
  }
  ```

- [ ] T012 [US1] Modify `src/app/app.module.ts`: declare `LogImportDialogComponent` (added below in alphabetical order with the other Ticket page imports/declarations).

  1. Add this import line near the other `pages/Ticket/...` imports:
     ```typescript
     import { LogImportDialogComponent } from './pages/Ticket/log-import-dialog/log-import-dialog.component';
     ```
  2. Add `LogImportDialogComponent,` inside the `declarations: [ ... ]` array (anywhere in that array — alphabetical is preferred).
  3. Do **not** touch any other entry.

- [ ] T013 [US1] Modify `src/app/pages/Ticket/ticket-detail/ticket-detail.component.html`: above the `<app-measure-panel ...>` tag, add the import button and the dialog. Find the existing `<app-measure-panel>` line; add the snippet below directly above it. Do not delete or alter the existing `app-measure-panel` line.

  ```html
  <!-- Phase 004: Sagemcom log importer -->
  <div class="ticket-detail__import-row" *ngIf="canImportLog">
    <button pButton type="button"
            class="p-button-primary"
            [class.pulse]="(measures?.length ?? 0) === 0"
            icon="pi pi-upload"
            label="Import Sagemcom log"
            [disabled]="!canEditMeasures"
            [pTooltip]="!canEditMeasures ? 'Ticket is closed — no edits allowed' : ''"
            (click)="logImportVisible = true"></button>
  </div>

  <app-log-import-dialog
    [ticketId]="ticket?.id ?? 0"
    [posteType]="ticket?.posteType ?? ''"
    [(visible)]="logImportVisible"
    (importSucceeded)="onImportSucceeded($event)">
  </app-log-import-dialog>
  ```

  > **Note**: if the existing template uses different property names than `measures` or `ticket`, do not change them blindly — read the component class to confirm and adjust **only the bindings** (`measures`, `ticket?.id`, `ticket?.posteType`) accordingly. The new property names `canImportLog`, `canEditMeasures`, `logImportVisible`, `onImportSucceeded` are introduced in the next task and must match exactly.

- [ ] T014 [US1] Modify `src/app/pages/Ticket/ticket-detail/ticket-detail.component.ts`: add four new members and one handler. Paste the snippets into the existing class — do not remove existing members.

  At the top of the file, add (alongside existing imports):

  ```typescript
  import { ViewChild } from '@angular/core';
  import { Role } from '../../../shared/enums/role.enum';
  import { AuthService } from '../../../services/auth.service';
  import { MeasurePanelComponent } from '../measure-panel/measure-panel.component';
  ```

  > If `AuthService` is already imported, do **not** add a second import line — only add `Role`, `ViewChild`, and `MeasurePanelComponent`. Same applies to `ViewChild`.

  Inside the class, add the four members:

  ```typescript
    logImportVisible = false;

    @ViewChild(MeasurePanelComponent) private measurePanelRef?: MeasurePanelComponent;

    get canImportLog(): boolean {
      const allowed = [Role.ADMIN_IT, Role.TECH_VAL, Role.TECH_PREP];
      const roles = this.auth.getRoles();
      return allowed.some(r => roles.includes(r));
    }

    get canEditMeasures(): boolean {
      const s = this.ticket?.status;
      return s !== 'CONFORME' && s !== 'NON_CONFORME' && s !== 'ANNULE';
    }

    onImportSucceeded(_ids: number[]): void {
      // Reload the measure panel so the new rows appear.
      this.measurePanelRef?.reload?.();
      // Reload the readiness bar if it exists on this page (added in Phase 003).
      const wrb: any = (this as any).workflowReadinessBarRef;
      wrb?.reload?.();
    }
  ```

  Make sure the constructor receives `AuthService`. If the existing constructor signature already injects it (e.g. `private auth: AuthService`), do not add it again. Otherwise add `, private auth: AuthService` to the constructor parameter list.

  > **MeasurePanel reload method**: this task assumes `MeasurePanelComponent` exposes a `reload(): void` method (or any zero-arg public method named `reload`). If it does not yet, see T015.

- [ ] T015 [US1] Verify `src/app/pages/Ticket/measure-panel/measure-panel.component.ts` exposes a public `reload(): void` method that re-fetches the list. If it does, do nothing. If it does NOT yet, add the method below (place it at the end of the class):

  ```typescript
    public reload(): void {
      // Replace this body with the component's existing list-loading logic.
      // The body MUST call the same method already used in ngOnInit to fetch measures.
      this.ngOnInit();
    }
  ```

  > Implementer guidance: prefer calling the existing private fetch method (e.g. `this.loadMeasures()`) over `ngOnInit()`. Read the file to see which method already fetches; use that. Do not invent a new fetch path.

- [ ] T016 [US1] Modify `src/app/pages/Ticket/ticket-detail/ticket-detail.component.scss` to add the pulse animation. Append the block below at the **end** of the file.

  ```scss
  .ticket-detail__import-row {
    display: flex;
    justify-content: flex-end;
    margin: 0.75rem 0;
  }

  .ticket-detail__import-row .pulse {
    position: relative;
    overflow: visible;
  }

  .ticket-detail__import-row .pulse::after {
    content: "";
    position: absolute;
    inset: -4px;
    border-radius: inherit;
    border: 2px solid var(--sage-accent, #4ea3ff);
    opacity: 0;
    animation: sage-pulse-ring 1.6s ease-in-out infinite;
    pointer-events: none;
  }

  @keyframes sage-pulse-ring {
    0%   { opacity: 0.5; transform: scale(1); }
    70%  { opacity: 0;   transform: scale(1.18); }
    100% { opacity: 0;   transform: scale(1.18); }
  }
  ```

### Karma tests for User Story 1

- [ ] T017 [US1] Create `src/app/pages/Ticket/log-import-dialog/__fixtures__/bwc-report.fixture.json` containing a realistic `LogImportReport` capture. Use the structure below as a starting point and adjust values to match the supervisor's BWC log if available.

  ```json
  {
    "detectedFormat": "BWC",
    "totalParsed": 16,
    "matched": [
      { "id": null, "measureCode": "POWER_RMS_AVG_VSA1", "label": "RMS power VSA1", "value": 15.52, "unit": "dBm", "status": "OK", "lower": 14.0, "upper": 17.0, "templateId": 1 }
    ],
    "skipped": [],
    "unmatched": [],
    "warnings": []
  }
  ```

  > For correctness against Constitution VII, replace the synthetic single-row content with a byte-for-byte capture of `POST /api/validations/{id}/preview-log` against `bwc-gateway-safran-wifi5g.log` once the backend is reachable. The schema above is sufficient for unit tests to pass.

- [ ] T018 [P] [US1] Create `src/app/pages/Ticket/log-import-dialog/__fixtures__/bnft-report.fixture.json` with the structure below (six matched rows is the contractual expectation per SC-003; values may be placeholders until a real capture is taken).

  ```json
  {
    "detectedFormat": "BNFT",
    "totalParsed": 6,
    "matched": [
      { "id": null, "measureCode": "PWR_2G_ANT0", "label": "2G power antenna 0", "value": 18.1, "unit": "dBm", "status": "OK", "lower": 17, "upper": 19, "templateId": 10 },
      { "id": null, "measureCode": "PWR_2G_ANT1", "label": "2G power antenna 1", "value": 18.2, "unit": "dBm", "status": "OK", "lower": 17, "upper": 19, "templateId": 11 },
      { "id": null, "measureCode": "PWR_2G_ANT2", "label": "2G power antenna 2", "value": 18.0, "unit": "dBm", "status": "OK", "lower": 17, "upper": 19, "templateId": 12 },
      { "id": null, "measureCode": "PWR_2G_ANT3", "label": "2G power antenna 3", "value": 17.9, "unit": "dBm", "status": "OK", "lower": 17, "upper": 19, "templateId": 13 },
      { "id": null, "measureCode": "PWR_2G_ANT4", "label": "2G power antenna 4", "value": 18.4, "unit": "dBm", "status": "OK", "lower": 17, "upper": 19, "templateId": 14 },
      { "id": null, "measureCode": "PWR_2G_ANT5", "label": "2G power antenna 5", "value": 18.3, "unit": "dBm", "status": "OK", "lower": 17, "upper": 19, "templateId": 15 }
    ],
    "skipped": [],
    "unmatched": [],
    "warnings": []
  }
  ```

- [ ] T019 [P] [US1] Create `src/app/pages/Ticket/log-import-dialog/__fixtures__/btf-report.fixture.json` with the structure below (placeholder until a real capture is taken).

  ```json
  {
    "detectedFormat": "BTF",
    "totalParsed": 10,
    "matched": [
      { "id": null, "measureCode": "BTF_FREQ_OFFSET", "label": "Frequency offset", "value": 0.04, "unit": "ppm", "status": "OK", "lower": -0.1, "upper": 0.1, "templateId": 21 }
    ],
    "skipped": [],
    "unmatched": [],
    "warnings": []
  }
  ```

- [ ] T020 [US1] Create `src/app/pages/Ticket/log-import-dialog/log-import-dialog.component.spec.ts` with the contents below. Paste verbatim. Adjust **only** the import paths to match the project's tsconfig if relative-path resolution fails.

  ```typescript
  import { ComponentFixture, TestBed } from '@angular/core/testing';
  import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
  import { NoopAnimationsModule } from '@angular/platform-browser/animations';
  import { MessageService } from 'primeng/api';
  import { LogImportDialogComponent } from './log-import-dialog.component';
  import { ValidationMeasureService } from '../../../services/validation-measure.service';
  import { AuthService } from '../../../services/auth.service';
  import { environment } from '../../../../environments/environment';

  import bwc from './__fixtures__/bwc-report.fixture.json';
  import bnft from './__fixtures__/bnft-report.fixture.json';
  import btf from './__fixtures__/btf-report.fixture.json';

  describe('LogImportDialogComponent', () => {
    let fixture: ComponentFixture<LogImportDialogComponent>;
    let component: LogImportDialogComponent;
    let http: HttpTestingController;

    const apiUrl = `${environment.apiUrl}/validations`;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [HttpClientTestingModule, NoopAnimationsModule],
        declarations: [LogImportDialogComponent],
        providers: [
          MessageService,
          ValidationMeasureService,
          { provide: AuthService, useValue: { getRoles: () => ['TECH_VAL'] } }
        ],
        schemas: [/* CUSTOM_ELEMENTS_SCHEMA omitted intentionally; tests target component logic, not template */ ]
      })
      .overrideComponent(LogImportDialogComponent, { set: { template: '' } })
      .compileComponents();

      fixture = TestBed.createComponent(LogImportDialogComponent);
      component = fixture.componentInstance;
      component.ticketId = 42;
      component.posteType = 'WIFI_CONDUIT';
      http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    function dropAndFlush(fixtureJson: any, filename = 'a.log') {
      const file = new File(['x'], filename, { type: 'text/plain' });
      component.onFileSelected({ files: [file] } as any);
      const req = http.expectOne(r => r.method === 'POST' && r.url === `${apiUrl}/42/preview-log`);
      req.flush(fixtureJson);
    }

    it('rejects .zip with the ZIP-specific message before any HTTP call', () => {
      const file = new File(['x'], 'a.zip', { type: 'application/zip' });
      component.onFileSelected({ files: [file] } as any);
      expect(component.fileError).toBe('ZIP not supported — drop a .log or .txt file');
      http.expectNone(`${apiUrl}/42/preview-log`);
    });

    it('rejects unsupported extension with the generic message before any HTTP call', () => {
      const file = new File(['x'], 'a.pdf', { type: 'application/pdf' });
      component.onFileSelected({ files: [file] } as any);
      expect(component.fileError).toBe('Unsupported file type — drop a .log or .txt file');
      http.expectNone(`${apiUrl}/42/preview-log`);
    });

    it('rejects files larger than 10 MB before any HTTP call', () => {
      const big = new File([new ArrayBuffer(10 * 1024 * 1024 + 1)], 'a.log', { type: 'text/plain' });
      component.onFileSelected({ files: [big] } as any);
      expect(component.fileError).toBe('File too large (max 10 MB)');
      http.expectNone(`${apiUrl}/42/preview-log`);
    });

    it('renders the BWC fixture: matched count, detectedFormat preserved', () => {
      dropAndFlush(bwc);
      expect(component.report?.detectedFormat).toBe('BWC');
      expect(component.totalMatched).toBe(bwc.matched.length);
    });

    it('renders the BNFT fixture: matched length is 6 per SC-003', () => {
      dropAndFlush(bnft, 'bnft.txt');
      expect(component.report?.detectedFormat).toBe('BNFT');
      expect(component.totalMatched).toBe(6);
    });

    it('renders the BTF fixture: detectedFormat preserved', () => {
      dropAndFlush(btf);
      expect(component.report?.detectedFormat).toBe('BTF');
    });

    it('emits importSucceeded exactly once with persisted IDs on confirm', () => {
      dropAndFlush(bwc);
      // simulate the backend returning a matched array with IDs
      const ids: number[] = [];
      component.importSucceeded.subscribe(arr => arr.forEach(i => ids.push(i)));
      component.confirmImport();
      const req = http.expectOne(r => r.method === 'POST' && r.url === `${apiUrl}/42/import-log`);
      req.flush({
        ...bwc,
        matched: bwc.matched.map((m: any, i: number) => ({ ...m, id: 100 + i }))
      });
      expect(ids.length).toBe(bwc.matched.length);
      expect(ids[0]).toBe(100);
    });

    it('disables confirm when there are zero matched measures', () => {
      const empty = { ...bwc, matched: [], totalParsed: 0 };
      dropAndFlush(empty);
      expect(component.confirmDisabled).toBeTrue();
    });
  });
  ```

  > **Karma TypeScript JSON imports**: this project allows JSON imports through `resolveJsonModule: true` in tsconfig. If your `tsconfig.spec.json` does not yet enable it, set `"resolveJsonModule": true` and `"esModuleInterop": true` under `compilerOptions`.

**Checkpoint US1**: Run `ng test --include='**/log-import-dialog/**' --include='**/validation-measure.service.spec.ts'`. All tests must pass. Then run `ng serve`, log in as `TECH_VAL`, open an `EN_COURS` ticket, drop a Sagemcom log, confirm import — measure panel should refresh.

---

## Phase 4: User Story 2 — Review unmatched measures and warnings (Priority: P1)

**Goal**: Operator can expand Unmatched and Warnings accordions before confirming, and `ADMIN_IT`/`CHEF_SECTEUR` see the "Add to catalog" inline action.

**Independent Test**: Drop a log into a ticket whose `posteType` is intentionally NOT seeded in the catalog. Verify the Unmatched accordion lists rows, each with a reason. Switch user role to `EXPERT` and verify the "Add to catalog" button is absent.

> **Most of US2 is already covered by US1's component code** (T009/T010 render the Unmatched + Warnings sections and gate "Add to catalog" by role). The tasks below add the missing role-gating spec and the re-preview test.

### Implementation for User Story 2

- [ ] T021 [US2] Append role-gating specs to `src/app/pages/Ticket/log-import-dialog/log-import-dialog.component.spec.ts`. Add **inside** the existing `describe` block (just before its closing `});`):

  ```typescript
    it('shows "Add to catalog" action only to ADMIN_IT or CHEF_SECTEUR', () => {
      const authStub: any = TestBed.inject(AuthService);
      authStub.getRoles = () => ['TECH_VAL'];
      expect(component.canAddToCatalog).toBeFalse();
      authStub.getRoles = () => ['ADMIN_IT'];
      expect(component.canAddToCatalog).toBeTrue();
      authStub.getRoles = () => ['CHEF_SECTEUR'];
      expect(component.canAddToCatalog).toBeTrue();
    });

    it('opens a new tab when "Add to catalog" is invoked', () => {
      const winSpy = spyOn(window, 'open');
      component.posteType = 'WIFI_CONDUIT';
      component.openCatalogTab('SCRATCH_TEST');
      expect(winSpy).toHaveBeenCalled();
      const url = winSpy.calls.mostRecent().args[0] as string;
      expect(url).toContain('measureCode=SCRATCH_TEST');
      expect(url).toContain('posteType=WIFI_CONDUIT');
      expect(winSpy.calls.mostRecent().args[1]).toBe('_blank');
    });

    it('re-preview re-uses the previously dropped file (no re-drop needed)', () => {
      dropAndFlush(bwc);
      component.rePreview();
      const req = http.expectOne(r => r.method === 'POST' && r.url === `${apiUrl}/42/preview-log`);
      req.flush(bwc);
      expect(component.report?.detectedFormat).toBe('BWC');
    });
  ```

**Checkpoint US2**: Re-run the dialog spec; the 3 new tests above must pass.

---

## Phase 5: User Story 3 — Trace any measure back to its source log (Priority: P2)

**Goal**: After import, `MeasurePanel` shows a paperclip on each measure with `sourceLogFile`. Clicking opens `LogSourceDialog` with filename and raw snippet.

**Independent Test**: Import a log, click the paperclip on any imported row, verify the dialog opens with the original filename and a monospace snippet block.

### Implementation for User Story 3

- [ ] T022 [P] [US3] Create `src/app/pages/Ticket/log-source-dialog/log-source-dialog.component.ts` with the contents below.

  ```typescript
  import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
  import { ValidationMeasureService } from '../../../services/validation-measure.service';
  import { LogSourceSnippet } from '../../../models/log-source-snippet.model';

  @Component({
    selector: 'app-log-source-dialog',
    templateUrl: './log-source-dialog.component.html',
    styleUrls: ['./log-source-dialog.component.scss'],
    standalone: false
  })
  export class LogSourceDialogComponent implements OnChanges {
    @Input() ticketId!: number;
    @Input() measureId: number | null = null;
    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();

    snippet: LogSourceSnippet | null = null;
    loading = false;
    error: string | null = null;

    constructor(private measures: ValidationMeasureService) {}

    ngOnChanges(_changes: SimpleChanges): void {
      if (this.visible && this.measureId != null && this.ticketId != null) {
        this.load();
      }
    }

    private load(): void {
      this.loading = true;
      this.snippet = null;
      this.error = null;
      this.measures.getSourceSnippet(this.ticketId, this.measureId!).subscribe({
        next: (s) => { this.snippet = s; this.loading = false; },
        error: (err) => {
          this.loading = false;
          this.snippet = null;
          this.error = err?.status === 404
            ? 'Source snippet not available for this measure'
            : err?.status === 410
            ? 'Source log no longer available on the server'
            : 'Could not load source snippet';
        }
      });
    }

    close(): void {
      this.visible = false;
      this.visibleChange.emit(false);
      this.snippet = null;
      this.error = null;
    }
  }
  ```

- [ ] T023 [P] [US3] Create `src/app/pages/Ticket/log-source-dialog/log-source-dialog.component.html` with the contents below.

  ```html
  <p-dialog
    [(visible)]="visible"
    (visibleChange)="visibleChange.emit($event)"
    [modal]="true"
    [draggable]="false"
    [resizable]="false"
    [closable]="true"
    [style]="{ width: 'min(720px, 92vw)' }"
    [header]="snippet?.filename ?? 'Source snippet'"
    (onHide)="close()">

    <div *ngIf="snippet?.lineRange" class="log-source-subtitle">
      lines {{ snippet?.lineRange }}
    </div>

    <p-progressSpinner *ngIf="loading"></p-progressSpinner>
    <p-message *ngIf="error" severity="error" [text]="error"></p-message>

    <pre class="log-snippet" *ngIf="snippet && !error">{{ snippet.snippet }}</pre>
  </p-dialog>
  ```

- [ ] T024 [P] [US3] Create `src/app/pages/Ticket/log-source-dialog/log-source-dialog.component.scss` with the contents below.

  ```scss
  .log-source-subtitle {
    color: var(--text-color-secondary, #888);
    margin-bottom: 0.5rem;
    font-size: 0.85rem;
  }

  .log-snippet {
    font-family: var(--sage-font-mono, 'JetBrains Mono', monospace);
    white-space: pre;
    overflow-x: auto;
    max-height: 60vh;
    padding: 0.75rem;
    background: var(--surface-card, #1e1e1e);
    border-radius: 0.5rem;
    margin: 0;
  }
  ```

- [ ] T025 [US3] Modify `src/app/app.module.ts`: declare `LogSourceDialogComponent`. Add the import line near the other `pages/Ticket/...` imports:

  ```typescript
  import { LogSourceDialogComponent } from './pages/Ticket/log-source-dialog/log-source-dialog.component';
  ```

  And add `LogSourceDialogComponent,` to the `declarations: [ ... ]` array.

- [ ] T026 [US3] Modify `src/app/pages/Ticket/measure-panel/measure-panel.component.html`: add the paperclip column. **Locate the existing `<p-table ...>` block that lists measures**, and inside its `<ng-template pTemplate="header">` insert **as the first `<th>`**:

  ```html
  <th style="width: 32px"></th>
  ```

  Then inside its `<ng-template pTemplate="body" let-row>`, insert **as the first `<td>`**:

  ```html
  <td>
    <button *ngIf="row.sourceLogFile"
            pButton type="button"
            class="p-button-text p-button-sm"
            icon="pi pi-paperclip"
            [pTooltip]="row.sourceLogFile"
            (click)="openSnippet(row.id)"></button>
  </td>
  ```

  > Do not change any other column. The existing columns must remain unchanged.

- [ ] T027 [US3] Modify `src/app/pages/Ticket/measure-panel/measure-panel.component.html`: at the **end** of the file (after the closing `</p-table>` or last container), append the `LogSourceDialog` instance:

  ```html
  <app-log-source-dialog
    [ticketId]="validationId"
    [measureId]="snippetMeasureId"
    [(visible)]="snippetVisible">
  </app-log-source-dialog>
  ```

  > **Note**: `validationId` is the property name `MeasurePanelComponent` already uses for the ticket ID (verify in the component class). If the component uses a different name (`ticketId`, `validation?.id`, etc.), bind that exact expression instead.

- [ ] T028 [US3] Modify `src/app/pages/Ticket/measure-panel/measure-panel.component.ts`: add two new members and one handler.

  Inside the class:

  ```typescript
    snippetVisible = false;
    snippetMeasureId: number | null = null;

    openSnippet(measureId: number): void {
      this.snippetMeasureId = measureId;
      this.snippetVisible = true;
    }
  ```

- [ ] T029 [US3] Create `src/app/pages/Ticket/log-source-dialog/log-source-dialog.component.spec.ts` with the contents below.

  ```typescript
  import { ComponentFixture, TestBed } from '@angular/core/testing';
  import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
  import { NoopAnimationsModule } from '@angular/platform-browser/animations';
  import { SimpleChange } from '@angular/core';
  import { LogSourceDialogComponent } from './log-source-dialog.component';
  import { ValidationMeasureService } from '../../../services/validation-measure.service';
  import { environment } from '../../../../environments/environment';

  describe('LogSourceDialogComponent', () => {
    let fixture: ComponentFixture<LogSourceDialogComponent>;
    let component: LogSourceDialogComponent;
    let http: HttpTestingController;
    const apiUrl = `${environment.apiUrl}/validations`;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [HttpClientTestingModule, NoopAnimationsModule],
        declarations: [LogSourceDialogComponent],
        providers: [ValidationMeasureService]
      })
      .overrideComponent(LogSourceDialogComponent, { set: { template: '' } })
      .compileComponents();

      fixture = TestBed.createComponent(LogSourceDialogComponent);
      component = fixture.componentInstance;
      component.ticketId = 7;
      http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    function trigger(measureId: number, visible: boolean) {
      component.measureId = measureId;
      component.visible = visible;
      component.ngOnChanges({
        measureId: new SimpleChange(null, measureId, true),
        visible:   new SimpleChange(false, visible, true)
      } as any);
    }

    it('loads the snippet when visible becomes true with a measureId', () => {
      trigger(33, true);
      const req = http.expectOne({ url: `${apiUrl}/7/measures/33/source-snippet`, method: 'GET' });
      req.flush({ filename: 'bwc.log', snippet: 'line1\nline2', lineRange: '42-43' });
      expect(component.snippet?.filename).toBe('bwc.log');
      expect(component.error).toBeNull();
    });

    it('surfaces a 404 with the no-longer-available message', () => {
      trigger(34, true);
      const req = http.expectOne({ url: `${apiUrl}/7/measures/34/source-snippet`, method: 'GET' });
      req.flush({ message: 'not found' }, { status: 404, statusText: 'Not Found' });
      expect(component.snippet).toBeNull();
      expect(component.error).toBe('Source snippet not available for this measure');
    });

    it('surfaces a 410 with the deleted-on-server message', () => {
      trigger(35, true);
      const req = http.expectOne({ url: `${apiUrl}/7/measures/35/source-snippet`, method: 'GET' });
      req.flush({ message: 'gone' }, { status: 410, statusText: 'Gone' });
      expect(component.error).toBe('Source log no longer available on the server');
    });
  });
  ```

**Checkpoint US3**: Run `ng test --include='**/log-source-dialog/**' --include='**/measure-panel/**'`. All tests must pass. Manually: import a log, click a paperclip, verify the dialog opens with the snippet in monospace.

---

## Phase 6: User Story 4 — Visual pulse hint on empty tickets (Priority: P3)

**Goal**: When the ticket has zero measures, the import button shows a subtle pulse animation; when populated, the pulse is absent.

**Independent Test**: Open a freshly created ticket — pulse visible. Open a ticket already with measures — pulse absent.

**This story is already implemented** by T013 (`[class.pulse]="(measures?.length ?? 0) === 0"`) and T016 (SCSS keyframes). No new task. Verify manually after Phase 5.

> If the existing `measures` property on `TicketDetailComponent` is named differently (e.g. `measureList`, or computed via `measurePanelRef.measures`), adjust **only** the template binding `[class.pulse]="(measures?.length ?? 0) === 0"` in `ticket-detail.component.html` (T013). Do not introduce a new property.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T030 [P] Run `ng build` and ensure it completes with no NEW warnings introduced by the Phase 004 files. If any new warning relates to a missing PrimeNG primitive, return to T006 and verify the imports.
- [ ] T031 [P] Run `ng serve` and walk the entire golden path documented in `spec-RealMesure/specs/004-sagemcom-log-importer/quickstart.md` (§ Golden path). Confirm SC-001 (≤30 s end-to-end), SC-007 (corrupted-file error toast ≤2 s).
- [ ] T032 [P] Walk the negative paths table in `quickstart.md` (rows for `.zip`, `.pdf`, >10 MB, empty `.log`, backend down, EXPERT role, CONFORME status, deleted source log).
- [ ] T033 [P] Replace the synthetic fixture content in `bwc-report.fixture.json`, `bnft-report.fixture.json`, `btf-report.fixture.json` with byte-for-byte captures of the real `preview-log` responses against the three supervisor logs once the backend is reachable. Drop a one-page `README.md` in `__fixtures__/` documenting the source log filename, capture date, and the `curl` command used. **Required by Constitution VII**.
- [ ] T034 [P] Verify no `package.json` change: `git diff -- package.json package-lock.json` must show no edits introduced by Phase 004 work.
- [ ] T035 Verify the `<!-- SPECKIT START -->` block in the repo root `CLAUDE.md` points at `spec-RealMesure/specs/004-sagemcom-log-importer/plan.md` (already done by `/speckit-plan` — confirm).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: empty — skip.
- **Phase 2 (Foundational)**: T001–T008. Must complete before any user story task. T001–T005 can run in parallel; T006/T007/T008 depend on the model files but can otherwise run in parallel.
- **Phase 3 (US1)**: T009–T020. Depends on Phase 2. T017/T018/T019 (fixture JSON files) can run in parallel.
- **Phase 4 (US2)**: T021. Depends on Phase 3 (the spec file edited in T021 was created in T020).
- **Phase 5 (US3)**: T022–T029. T022/T023/T024 can run in parallel; T025–T028 depend on T022; T029 depends on T022.
- **Phase 6 (US4)**: no new task — covered by T013 + T016.
- **Phase 7 (Polish)**: depends on all earlier phases.

### Parallel Execution Examples

```text
# After Phase 2 starts:
Run in parallel: T001, T002, T003, T004, T005   (five independent model files)

# After Phase 2 model files exist:
Run in parallel: T006 (primeng module), T007 (service), T008 (service spec)

# Inside US1 (after T009 component class exists):
Run in parallel: T010 (html), T011 (scss), T012 (app.module), T013 (ticket-detail html)

# Fixture files (during US1):
Run in parallel: T017, T018, T019

# Inside US3:
Run in parallel: T022, T023, T024   (component class, html, scss)
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Complete Phase 2 (T001–T008).
2. Complete Phase 3 (T009–T020).
3. STOP and validate: drag-drop a real log into an `EN_COURS` ticket as `TECH_VAL`, confirm import, see measures appear.
4. Ship as the demo MVP.

### Incremental Delivery

1. Phase 2 → foundation ready.
2. Add US1 → demo path works.
3. Add US2 → unmatched UX + "Add to catalog" gated.
4. Add US3 → paperclip + source dialog.
5. Phase 7 polish.

---

## Notes for Haiku-class implementer

- **One file per task** — never modify a second file in the same task. If a change "requires" touching a second file, the second touch must be a separate task that already exists in this list.
- **Paste, don't paraphrase** — every code block is meant to be inserted verbatim, modulo the explicit notes ("adjust import paths if…"). Resist the urge to rename symbols for style.
- **Do not invent new routes, new enum members, new pipes, or new services.** If you think you need one, the task list is missing it — flag it back to a human reviewer.
- **Do not add new npm dependencies.** Constitution XI forbids it for this refactor.
- **Constitution gates**: III (no boolean `conform`), VI (mirroring), VII (real-log fixtures), XI (stack), XII (role hiding). If a task seems to push against one of these, stop and ask.
