
# Tasks — 002 ValidationMeasure Refactor (Frontend)

**Feature dir**: `spec-RealMesure/specs/002-validation-measure-frontend/`
**Frontend repo root** (used in every file path below): `sageline-frontend/`
**Target executor**: low-cost LLM (Haiku). Each task names the exact file to touch, the exact existing reference file to mirror, and the exact field set / pattern to use. Where a task says "use the exact contents", copy the snippet verbatim — do not invent fields, do not rename, do not add fields.

## Conventions referenced (read once, reuse everywhere)

- **Service pattern** → mirror `src/app/services/phase.service.ts` (HttpClient + `environment.apiUrl` + typed `Observable<T>`, `@Injectable({ providedIn: 'root' })`, single private `apiUrl` field).
- **Service spec pattern** → mirror `src/app/services/poste-catalog.service.spec.ts` (HttpClientTestingModule + HttpTestingController + one `expectOne({ url, method })` per public method, flushes minimal mock).
- **Existing legacy service to downgrade** → `src/app/services/validation-result.service.ts` (keep its method signatures; rewire bodies).
- **Existing shared component to reuse** → `src/app/shared/components/measure-badge/measure-badge.component.ts` (delivered in Phase 001 — do NOT re-create).
- **Enums already present (DO NOT recreate)** → `src/app/shared/enums/measure-category.enum.ts`, `src/app/shared/enums/measure-status.enum.ts`, `src/app/shared/enums/role.enum.ts`. Always import the `Role` *enum* (not string literals).
- **Module wiring** → edit `src/app/app.module.ts` (add new components/pipes to `declarations`).
- **PrimeNG imports** → use the existing centralized `src/app/shared/primeng/primeng.module.ts`. Do NOT import PrimeNG modules in feature modules; if a needed PrimeNG module is missing there, add it once and reuse.
- **Selector prefix**: every new component uses `app-*`. `standalone: false` on every component, pipe, directive.
- **Locale**: all user-visible strings in **French** (toasts, button labels, dialog titles, tooltips, table headers).
- **Reactive forms**: use `FormBuilder`, `FormGroup`, `Validators.required`, custom validators only where listed.

---

## Phase 1 — Setup

- [x] T001 From `sageline-frontend/`, run `ng serve` once, verify `http://localhost:4200` compiles and loads, then stop the server. No file changes. This guarantees the baseline is green before any change.
- [x] T002 Verify Phase 001 deliverables exist (no file changes; STOP and report if any is missing):
  - `src/app/shared/enums/measure-category.enum.ts` exports `MeasureCategory`, `MEASURE_CATEGORY_LABELS`, `MEASURE_CATEGORY_ICONS`.
  - `src/app/shared/enums/measure-status.enum.ts` exports `MeasureStatus`, `MEASURE_STATUS_LABELS`, `MEASURE_STATUS_COLORS`, `MEASURE_STATUS_ICONS`.
  - `src/app/shared/components/measure-badge/measure-badge.component.ts` exports `MeasureBadgeComponent` with selector `app-measure-badge`.
  - `src/app/services/poste-catalog.service.ts` exports `PosteCatalogService` with `getMeasuresByPosteType(posteType)`.

---

## Phase 2 — Foundational (must complete before any user-story phase)

### Models

- [x] T003 [P] Create `src/app/models/validation-measure.model.ts` containing exactly:
  ```ts
  import { MeasureCategory } from '../shared/enums/measure-category.enum';
  import { MeasureStatus } from '../shared/enums/measure-status.enum';

  export interface ValidationMeasure {
    id: number;
    validationId: number;
    catalogTemplateId: number | null;
    measureCode: string;
    measureLabel: string;
    category: MeasureCategory;
    measuredValue: number | null;
    unit: string;
    lowerBound: number;
    upperBound: number;
    status: MeasureStatus;
    antenna: string | null;
    frequencyMhz: number | null;
    modulationScheme: string | null;
    deviationPct: number;
    measuredAt: string;
    enteredById: number;
    enteredByUsername: string;
    sourceLogFile: string | null;
  }
  ```
  No other exports.

- [x] T004 [P] Create `src/app/models/create-validation-measure.dto.ts` containing exactly:
  ```ts
  import { MeasureCategory } from '../shared/enums/measure-category.enum';

  export interface CreateValidationMeasureRequest {
    catalogTemplateId?: number;
    measureCode?: string;
    measureLabel?: string;
    category?: MeasureCategory;
    unit?: string;
    lowerBound?: number;
    upperBound?: number;
    antenna?: string;
    frequencyMhz?: number;
    modulationScheme?: string;
    measuredValue?: number | null;
  }
  ```

- [x] T005 [P] Create `src/app/models/update-validation-measure.dto.ts` containing exactly:
  ```ts
  export interface UpdateValidationMeasureRequest {
    measuredValue: number | null;
  }
  ```

- [x] T006 [P] Create `src/app/models/batch-validation-measure.model.ts` containing exactly:
  ```ts
  import { ValidationMeasure } from './validation-measure.model';
  import { CreateValidationMeasureRequest } from './create-validation-measure.dto';

  export interface BatchCreateValidationMeasureRequest {
    items: CreateValidationMeasureRequest[];
  }

  export interface BatchUpdateValidationMeasureItem {
    id: number;
    measuredValue: number | null;
  }

  export interface BatchUpdateValidationMeasureRequest {
    items: BatchUpdateValidationMeasureItem[];
  }

  export interface BatchValidationMeasureResponseItem {
    index: number;
    status: 'ok' | 'error';
    measure?: ValidationMeasure;
    error?: { code: string; message: string };
  }

  export interface BatchValidationMeasureResponse {
    results: BatchValidationMeasureResponseItem[];
    summary: { succeeded: number; failed: number };
  }

  export interface FromCatalogSeedResponse {
    created: number;
    skipped: number;
    measures: ValidationMeasure[];
  }
  ```

### Service

- [x] T007 Create `src/app/services/validation-measure.service.ts` following the `PhaseService` pattern exactly. Class `ValidationMeasureService`, `@Injectable({ providedIn: 'root' })`, `private apiUrl = ${environment.apiUrl}/validations;`. Implement exactly these 8 methods (file paths to import from are listed below the table):
  | Method | URL template | HTTP | Returns |
  |---|---|---|---|
  | `list(validationId)` | `${apiUrl}/${validationId}/measures` | GET | `Observable<ValidationMeasure[]>` |
  | `create(validationId, dto)` | `${apiUrl}/${validationId}/measures` | POST | `Observable<ValidationMeasure>` |
  | `update(validationId, measureId, dto)` | `${apiUrl}/${validationId}/measures/${measureId}` | PUT | `Observable<ValidationMeasure>` |
  | `delete(validationId, measureId)` | `${apiUrl}/${validationId}/measures/${measureId}` | DELETE | `Observable<void>` |
  | `createBatch(validationId, body)` | `${apiUrl}/${validationId}/measures/batch` | POST | `Observable<BatchValidationMeasureResponse>` |
  | `updateBatch(validationId, body)` | `${apiUrl}/${validationId}/measures/batch` | PUT | `Observable<BatchValidationMeasureResponse>` |
  | `fromTemplate(validationId, templateId)` | `${apiUrl}/${validationId}/measures/from-template/${templateId}` | POST (empty body `{}`) | `Observable<ValidationMeasure>` |
  | `fromCatalog(validationId)` | `${apiUrl}/${validationId}/measures/from-catalog` | POST (empty body `{}`) | `Observable<FromCatalogSeedResponse>` |
  Imports:
  - `HttpClient` from `@angular/common/http`
  - `Observable` from `rxjs`
  - `environment` from `../../environments/environment`
  - `ValidationMeasure` from `../models/validation-measure.model`
  - `CreateValidationMeasureRequest` from `../models/create-validation-measure.dto`
  - `UpdateValidationMeasureRequest` from `../models/update-validation-measure.dto`
  - `BatchCreateValidationMeasureRequest`, `BatchUpdateValidationMeasureRequest`, `BatchValidationMeasureResponse`, `FromCatalogSeedResponse` from `../models/batch-validation-measure.model`

- [x] T008 [P] Create `src/app/services/validation-measure.service.spec.ts` mirroring `poste-catalog.service.spec.ts` exactly. One test per public method (8 tests total). Each test: call the method with sample args (use `validationId=42`, `measureId=7`, `templateId=87` where needed), `httpMock.expectOne({ url, method })`, assert URL + method, flush a minimal mock (empty `[]`, or `{} as ValidationMeasure` cast). Use `afterEach(() => httpMock.verify())`. No business-logic assertions.

### Legacy shim (Constitution VIII)

- [x] T009 Modify `src/app/services/validation-result.service.ts`. Keep every existing public method signature intact (do not delete or rename methods). Inside each method body, add a `console.warn('[deprecated] ValidationResultService.<methodName> — migrate to ValidationMeasureService');` as the very first line. The HTTP call beneath stays unchanged at this task. Do NOT change imports. Do NOT add new methods. Save and verify the file still compiles.

### Pipe — `MeasureUnitPipe`

- [x] T010 [P] Create `src/app/shared/pipes/measure-unit.pipe.ts` containing exactly:
  ```ts
  import { Pipe, PipeTransform } from '@angular/core';

  @Pipe({ name: 'measureUnit', standalone: false })
  export class MeasureUnitPipe implements PipeTransform {
    transform(value: number | null | undefined, unit: string | null | undefined, digits = 2): string {
      if (value === null || value === undefined) return '';
      const fixed = Number(value).toFixed(digits);
      return unit ? `${fixed} ${unit}` : fixed;
    }
  }
  ```

- [x] T011 [P] Create `src/app/shared/pipes/measure-unit.pipe.spec.ts` with these 6 cases (one `it` block per case):
  1. `null` value returns `''`.
  2. `undefined` value returns `''`.
  3. `15.521` with unit `'dBm'` returns `'15.52 dBm'`.
  4. `0` with unit `'V'` returns `'0.00 V'`.
  5. `15.521` with `null` unit returns `'15.52'`.
  6. `15.521` with `'dBm'` and `digits=3` returns `'15.521 dBm'`.
  Each test: `const pipe = new MeasureUnitPipe(); expect(pipe.transform(...)).toBe('...');`

### Shared component — `MeasureStatusBadge`

- [x] T012 [P] Create folder `src/app/shared/components/measure-status-badge/` with four files:
  - `measure-status-badge.component.ts`:
    ```ts
    import { Component, Input } from '@angular/core';
    import { MeasureStatus, MEASURE_STATUS_LABELS, MEASURE_STATUS_COLORS, MEASURE_STATUS_ICONS } from '../../enums/measure-status.enum';

    @Component({
      selector: 'app-measure-status-badge',
      templateUrl: './measure-status-badge.component.html',
      styleUrls: ['./measure-status-badge.component.scss'],
      standalone: false
    })
    export class MeasureStatusBadgeComponent {
      @Input() status!: MeasureStatus;
      readonly LABELS = MEASURE_STATUS_LABELS;
      readonly COLORS = MEASURE_STATUS_COLORS;
      readonly ICONS = MEASURE_STATUS_ICONS;
    }
    ```
  - `measure-status-badge.component.html`:
    ```html
    <p-tag [severity]="COLORS[status]" [value]="LABELS[status]" [icon]="ICONS[status]"></p-tag>
    ```
  - `measure-status-badge.component.scss`: empty file (zero bytes is acceptable; otherwise a single `:host { display: inline-block; }` rule).
  - `measure-status-badge.component.spec.ts`: three `it` blocks, one per status (`OK`, `OUT_OF_RANGE`, `NOT_EXECUTED`). For each: `TestBed.createComponent(MeasureStatusBadgeComponent)`, set `component.status = '<value>'`, `fixture.detectChanges()`, then `expect(fixture.nativeElement.querySelector('p-tag')).toBeTruthy();`. Configure TestBed with `declarations: [MeasureStatusBadgeComponent]`, `imports: [TagModule]` from `'primeng/tag'`, and `schemas: [NO_ERRORS_SCHEMA]`.

### Shared component — `DeviationProgress`

- [x] T013 [P] Create folder `src/app/shared/components/deviation-progress/` with four files:
  - `deviation-progress.component.ts`:
    ```ts
    import { Component, Input } from '@angular/core';

    @Component({
      selector: 'app-deviation-progress',
      templateUrl: './deviation-progress.component.html',
      styleUrls: ['./deviation-progress.component.scss'],
      standalone: false
    })
    export class DeviationProgressComponent {
      @Input() deviationPct = 0;

      get widthPct(): number {
        if (this.deviationPct < 0) return 0;
        if (this.deviationPct > 100) return 100;
        return this.deviationPct;
      }

      get band(): 'green' | 'amber' | 'red' {
        if (this.deviationPct <= 50) return 'green';
        if (this.deviationPct <= 100) return 'amber';
        return 'red';
      }
    }
    ```
  - `deviation-progress.component.html`:
    ```html
    <div class="dev-bar" [attr.data-band]="band" [title]="deviationPct.toFixed(1) + '%'">
      <div class="dev-fill" [style.width.%]="widthPct"></div>
      <span class="dev-label">{{ deviationPct.toFixed(1) }}%</span>
    </div>
    ```
  - `deviation-progress.component.scss`:
    ```scss
    :host { display: inline-block; min-width: 8rem; }
    .dev-bar { position: relative; height: 1.25rem; background: var(--surface-200, #e0e0e0); border-radius: 4px; overflow: hidden; }
    .dev-fill { position: absolute; left: 0; top: 0; bottom: 0; }
    .dev-bar[data-band="green"] .dev-fill { background: var(--green-500, #22c55e); }
    .dev-bar[data-band="amber"] .dev-fill { background: var(--orange-500, #f59e0b); }
    .dev-bar[data-band="red"]   .dev-fill { background: var(--red-500,   #ef4444); }
    .dev-label { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-family: var(--font-mono, 'JetBrains Mono'); font-size: 0.75rem; color: var(--text-color, #fff); }
    ```
  - `deviation-progress.component.spec.ts`: 5 `it` blocks asserting:
    1. `deviationPct = 33` → `band === 'green'`, `widthPct === 33`.
    2. `deviationPct = 50` → `band === 'green'`, `widthPct === 50`.
    3. `deviationPct = 75` → `band === 'amber'`, `widthPct === 75`.
    4. `deviationPct = 100` → `band === 'amber'`, `widthPct === 100`.
    5. `deviationPct = 150` → `band === 'red'`, `widthPct === 100`.
    No template rendering needed; instantiate the class directly: `const c = new DeviationProgressComponent(); c.deviationPct = 33; expect(c.band).toBe('green');`.

### Module wiring (foundational)

- [x] T014 Edit `src/app/app.module.ts`:
  1. Add these imports near the top, grouped with existing component imports:
     - `import { MeasureStatusBadgeComponent } from './shared/components/measure-status-badge/measure-status-badge.component';`
     - `import { DeviationProgressComponent } from './shared/components/deviation-progress/deviation-progress.component';`
     - `import { MeasureUnitPipe } from './shared/pipes/measure-unit.pipe';`
  2. Add the three symbols to the `declarations: [...]` array (alphabetical proximity to existing entries).
  3. Save and run `ng build` (or `ng serve` once); fix any typos until the build is green.

- [x] T015 Open `src/app/shared/primeng/primeng.module.ts`. Verify the following PrimeNG modules are listed in both `imports: [...]` and `exports: [...]`: `TagModule`, `ProgressBarModule`, `DropdownModule`, `InputNumberModule`, `InputTextModule`, `DialogModule`, `ButtonModule`, `TableModule`, `ToastModule`, `TooltipModule`. For any that are missing, add the import statement at the top and the symbol in both `imports` and `exports` arrays. Do not remove anything.

---

## Phase 3 — User Story 1 (P1): Inspect a ticket's measures with industrial context

**Story goal**: Opening any ticket renders all measures with color-coded status, bounds, value+unit, and deviation visual. Legacy "Results" markup is replaced.

**Independent test**: Log in as `TECH_VAL`, open a ticket that has measures seeded. Expect: new `app-measure-panel` is visible; old results section is gone; each row shows `app-measure-badge`, value formatted by `measureUnit`, `[lowerBound, upperBound]`, `app-measure-status-badge`, `app-deviation-progress`.

### Component — `MeasurePanel` (read-only scope for US1)

- [x] T016 [US1] Create folder `src/app/pages/Ticket/measure-panel/` with four files. Use `pages/admin/poste-catalog/poste-catalog-list/poste-catalog-list.component.ts` as structural reference (PrimeNG table, `OnInit` loads data, French strings).
  - `measure-panel.component.ts` (read-only scope — no mutating actions yet):
    ```ts
    import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
    import { MessageService } from 'primeng/api';
    import { ValidationMeasureService } from '../../../services/validation-measure.service';
    import { ValidationMeasure } from '../../../models/validation-measure.model';
    import { MeasureStatus, MEASURE_STATUS_LABELS } from '../../../shared/enums/measure-status.enum';

    @Component({
      selector: 'app-measure-panel',
      templateUrl: './measure-panel.component.html',
      styleUrls: ['./measure-panel.component.scss'],
      standalone: false,
      providers: [MessageService]
    })
    export class MeasurePanelComponent implements OnChanges {
      @Input() validationId!: number;
      @Input() posteType: string | null = null;

      measures: ValidationMeasure[] = [];
      loading = false;
      statusFilter: 'ALL' | MeasureStatus = 'ALL';

      readonly STATUS_LABELS = MEASURE_STATUS_LABELS;
      readonly STATUS_OPTIONS: { label: string; value: 'ALL' | MeasureStatus }[] = [
        { label: 'Tous', value: 'ALL' },
        { label: 'Conforme', value: 'OK' },
        { label: 'Hors tolérance', value: 'OUT_OF_RANGE' },
        { label: 'Non exécuté', value: 'NOT_EXECUTED' },
      ];

      constructor(
        private measureService: ValidationMeasureService,
        private messageService: MessageService
      ) {}

      ngOnChanges(changes: SimpleChanges): void {
        if (changes['validationId'] && this.validationId) this.refresh();
      }

      refresh(): void {
        this.loading = true;
        this.measureService.list(this.validationId).subscribe({
          next: (data) => { this.measures = data; this.loading = false; },
          error: () => {
            this.loading = false;
            this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de charger les mesures.' });
          }
        });
      }

      get filteredMeasures(): ValidationMeasure[] {
        if (this.statusFilter === 'ALL') return this.measures;
        return this.measures.filter(m => m.status === this.statusFilter);
      }
    }
    ```
  - `measure-panel.component.html` (read-only scope — table only; action buttons added in later tasks):
    ```html
    <p-toast></p-toast>
    <div class="panel-header">
      <h3>Mesures</h3>
      <p-dropdown [options]="STATUS_OPTIONS" [(ngModel)]="statusFilter" optionLabel="label" optionValue="value" placeholder="Filtrer par statut"></p-dropdown>
    </div>

    <p-table [value]="filteredMeasures" [loading]="loading" [paginator]="false" styleClass="p-datatable-sm">
      <ng-template pTemplate="header">
        <tr>
          <th>Code</th>
          <th>Valeur</th>
          <th>Tolérance</th>
          <th>Statut</th>
          <th>Déviation</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-m>
        <tr>
          <td>
            <app-measure-badge [category]="m.category" [code]="m.measureCode" [antenna]="m.antenna" [frequencyMhz]="m.frequencyMhz"></app-measure-badge>
          </td>
          <td>{{ m.measuredValue | measureUnit:m.unit }}</td>
          <td>[{{ m.lowerBound | measureUnit:m.unit }} ; {{ m.upperBound | measureUnit:m.unit }}]</td>
          <td><app-measure-status-badge [status]="m.status"></app-measure-status-badge></td>
          <td><app-deviation-progress [deviationPct]="m.deviationPct"></app-deviation-progress></td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr><td colspan="5">Aucune mesure pour ce ticket.</td></tr>
      </ng-template>
    </p-table>
    ```
  - `measure-panel.component.scss`:
    ```scss
    .panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
    .panel-header h3 { margin: 0; font-family: var(--font-ui, 'DM Sans'); }
    ```
  - `measure-panel.component.spec.ts`: at minimum, 3 `it` blocks. Use `HttpClientTestingModule` and the existing `TagModule`, `TableModule`, `DropdownModule`, `FormsModule`, `NO_ERRORS_SCHEMA`.
    1. Calls `list(validationId)` on first `ngOnChanges` with a non-null `validationId`.
    2. Filters to `OK` only when `statusFilter='OK'`. Seed `component.measures` with one of each status, set filter, assert `filteredMeasures.length === 1`.
    3. Shows "Aucune mesure pour ce ticket." when `measures = []` after detectChanges.

### Module wiring for US1

- [x] T017 [US1] Edit `src/app/app.module.ts`:
  - Add `import { MeasurePanelComponent } from './pages/Ticket/measure-panel/measure-panel.component';`
  - Add `MeasurePanelComponent` to `declarations: [...]`.
  - Save and `ng build`.

### Replace legacy panel in `ticket-detail`

- [x] T018 [US1] Edit `src/app/pages/Ticket/ticket-detail/ticket-detail.component.html`. Locate the existing block that renders validation results (search the file for `resultService`, `result.conform`, or "Résultats"). Replace that entire block — and only that block — with exactly:
  ```html
  <app-measure-panel [validationId]="ticket.id" [posteType]="ticket?.zone?.posteType || null"></app-measure-panel>
  ```
  Do not remove unrelated sections (assignment panel, timeline, transition buttons, prep checklist, etc.). When in doubt, ask for confirmation rather than deleting.

- [x] T019 [US1] Edit `src/app/pages/Ticket/ticket-detail/ticket-detail.component.ts`. Remove the `ValidationResultService` import and the `resultService` constructor parameter, AND remove any method whose body now becomes unused (e.g. result-loading, result-conformity counters, in-row 5%-tolerance preview). Concretely:
  - Remove the import `import { ValidationResultService } from '../../../services/validation-result.service';`
  - Remove `private resultService: ValidationResultService,` from the constructor parameter list (and re-add a trailing comma after the previous parameter as needed).
  - Search the file for symbols that no longer compile and remove only the dead code that references `resultService` (methods, fields, calls). DO NOT remove anything unrelated. If a transition-button click handler called the result loader, replace that call with a no-op comment `// measures handled by app-measure-panel`.
  - Save and `ng build` until green.

**US1 Checkpoint**: User Story 1 should now be fully functional — open any ticket, see the new panel with existing measures (assuming backend has data). At this point you can run `npm test -- --watch=false --include='**/measure-status-badge.component.spec.ts' --include='**/deviation-progress.component.spec.ts' --include='**/measure-panel.component.spec.ts' --include='**/measure-unit.pipe.spec.ts' --include='**/validation-measure.service.spec.ts'` to confirm green specs.

---

## Phase 4 — User Story 2 (P1): Add a measure from the zone's catalog

**Story goal**: A user with mutation role clicks "Ajouter mesure", picks a catalog template, types a value, submits, and the new row appears.

**Independent test**: As `TECH_VAL`, open a ticket whose zone has a catalog. Click "Ajouter mesure". The dropdown lists templates of that PosteType. Select one. The bounds, unit, antenna, frequency are pre-filled and read-only. Type a value, submit. The dialog closes, the table refreshes, the new row is rendered with correct status.

### Dialog — `AddMeasureDialog`

- [x] T020 [US2] Create folder `src/app/pages/Ticket/add-measure-dialog/` with three files.
  - `add-measure-dialog.component.ts`:
    ```ts
    import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
    import { FormBuilder, FormGroup, Validators } from '@angular/forms';
    import { MessageService } from 'primeng/api';
    import { PosteCatalogService } from '../../../services/poste-catalog.service';
    import { ValidationMeasureService } from '../../../services/validation-measure.service';
    import { PosteMeasureCatalog } from '../../../models/poste-measure-catalog.model';
    import { CreateValidationMeasureRequest } from '../../../models/create-validation-measure.dto';

    @Component({
      selector: 'app-add-measure-dialog',
      templateUrl: './add-measure-dialog.component.html',
      styleUrls: ['./add-measure-dialog.component.scss'],
      standalone: false
    })
    export class AddMeasureDialogComponent implements OnChanges {
      @Input() visible = false;
      @Input() validationId!: number;
      @Input() posteType: string | null = null;
      @Output() visibleChange = new EventEmitter<boolean>();
      @Output() created = new EventEmitter<void>();

      templates: PosteMeasureCatalog[] = [];
      loadingTemplates = false;
      submitting = false;

      form: FormGroup = this.fb.group({
        templateId: [null, Validators.required],
        measuredValue: [null, Validators.required],
      });

      selectedTemplate: PosteMeasureCatalog | null = null;

      constructor(
        private fb: FormBuilder,
        private posteCatalogService: PosteCatalogService,
        private measureService: ValidationMeasureService,
        private messageService: MessageService
      ) {}

      ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible'] && this.visible) {
          this.reset();
          if (this.posteType) this.loadTemplates(this.posteType);
        }
      }

      private reset(): void {
        this.form.reset();
        this.selectedTemplate = null;
        this.submitting = false;
      }

      private loadTemplates(posteType: string): void {
        this.loadingTemplates = true;
        this.posteCatalogService.getMeasuresByPosteType(posteType as any).subscribe({
          next: (data) => { this.templates = data; this.loadingTemplates = false; },
          error: () => { this.loadingTemplates = false; this.templates = []; }
        });
      }

      onTemplateChange(id: number | null): void {
        this.selectedTemplate = this.templates.find(t => t.id === id) ?? null;
      }

      submit(): void {
        if (this.form.invalid) return;
        const { templateId, measuredValue } = this.form.value;
        const dto: CreateValidationMeasureRequest = { catalogTemplateId: templateId, measuredValue };
        this.submitting = true;
        this.measureService.create(this.validationId, dto).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Mesure ajoutée', detail: 'La mesure a été enregistrée.' });
            this.submitting = false;
            this.close();
            this.created.emit();
          },
          error: (err) => {
            this.submitting = false;
            this.messageService.add({ severity: 'error', summary: 'Erreur', detail: err?.error?.message ?? 'Échec de l\\'ajout.' });
          }
        });
      }

      close(): void {
        this.visible = false;
        this.visibleChange.emit(false);
      }
    }
    ```
  - `add-measure-dialog.component.html`:
    ```html
    <p-dialog header="Ajouter une mesure" [(visible)]="visible" [modal]="true" [style]="{ width: '32rem' }" (onHide)="close()">
      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="field">
          <label>Modèle de mesure</label>
          <p-dropdown [options]="templates" optionLabel="measureCode" optionValue="id" placeholder="Sélectionner un modèle"
            [filter]="true" filterBy="measureCode,measureLabel"
            formControlName="templateId" (onChange)="onTemplateChange($event.value)"></p-dropdown>
        </div>

        <ng-container *ngIf="selectedTemplate as t">
          <div class="readonly-grid">
            <div><label>Catégorie</label><div>{{ t.category }}</div></div>
            <div><label>Unité</label><div>{{ t.defaultUnit }}</div></div>
            <div><label>Borne basse</label><div>{{ t.defaultLowerBound }}</div></div>
            <div><label>Borne haute</label><div>{{ t.defaultUpperBound }}</div></div>
            <div *ngIf="t.antenna"><label>Antenne</label><div>{{ t.antenna }}</div></div>
            <div *ngIf="t.frequencyMhz"><label>Fréquence (MHz)</label><div>{{ t.frequencyMhz }}</div></div>
          </div>
          <div class="field">
            <label>Valeur mesurée</label>
            <p-inputNumber formControlName="measuredValue" mode="decimal" [minFractionDigits]="0" [maxFractionDigits]="4"></p-inputNumber>
          </div>
        </ng-container>

        <div class="dialog-footer">
          <button pButton type="button" label="Annuler" class="p-button-text" (click)="close()"></button>
          <button pButton type="submit" label="Enregistrer" [disabled]="form.invalid || submitting" [loading]="submitting"></button>
        </div>
      </form>
    </p-dialog>
    ```
  - `add-measure-dialog.component.scss`:
    ```scss
    .field { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 0.75rem; }
    .field label { font-size: 0.75rem; opacity: 0.8; }
    .readonly-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem 1rem; margin: 0.5rem 0; padding: 0.5rem; background: var(--surface-100, rgba(255,255,255,0.04)); border-radius: 4px; }
    .readonly-grid label { font-size: 0.7rem; opacity: 0.7; }
    .dialog-footer { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.5rem; }
    ```

### Wire dialog into MeasurePanel with role gate

- [x] T021 [US2] Edit `src/app/pages/Ticket/measure-panel/measure-panel.component.ts`:
  - Add imports at the top:
    ```ts
    import { AuthService } from '../../../services/auth.service';
    import { Role } from '../../../shared/enums/role.enum';
    ```
    (If `auth.service.ts` lives at a different path, search the codebase once for `class AuthService` to confirm; do not invent a path.)
  - Add this getter to the class:
    ```ts
    get canMutate(): boolean {
      const roles = this.authService.getRoles() ?? [];
      return [Role.TECH_VAL, Role.TECH_PREP, Role.CHEF_SECTEUR, Role.ADMIN_IT].some(r => roles.includes(r));
    }
    ```
  - Add this field to the class: `addMeasureVisible = false;`
  - Inject `AuthService` in the constructor: add `, private authService: AuthService` after the existing `messageService`.
  - Add a public method:
    ```ts
    openAddMeasure(): void { this.addMeasureVisible = true; }
    onMeasureCreated(): void { this.refresh(); }
    ```

- [x] T022 [US2] Edit `src/app/pages/Ticket/measure-panel/measure-panel.component.html`:
  - In the `.panel-header` div, append (just after the `<p-dropdown>`):
    ```html
    <button pButton *ngIf="canMutate" type="button" label="Ajouter mesure" icon="pi pi-plus" (click)="openAddMeasure()"></button>
    ```
  - At the bottom of the template (after the `</p-table>`), append:
    ```html
    <app-add-measure-dialog [(visible)]="addMeasureVisible" [validationId]="validationId" [posteType]="posteType" (created)="onMeasureCreated()"></app-add-measure-dialog>
    ```

- [x] T023 [US2] Edit `src/app/app.module.ts`:
  - Add `import { AddMeasureDialogComponent } from './pages/Ticket/add-measure-dialog/add-measure-dialog.component';`
  - Add `AddMeasureDialogComponent` to `declarations: [...]`.
  - Save and `ng build`.

---

## Phase 5 — User Story 3 (P2): Seed the ticket with all template measures as NOT_EXECUTED

**Story goal**: One click populates the empty ticket with every template from the zone's catalog as `NOT_EXECUTED` rows. Also auto-seed on ticket creation.

**Independent test**: As `TECH_VAL`, open a ticket with zero measures whose zone has 16 templates. Click "Instancier toutes les mesures". 16 NOT_EXECUTED rows appear. Button is hidden on subsequent visits.

### "Instantiate all" button

- [x] T024 [US3] Edit `src/app/pages/Ticket/measure-panel/measure-panel.component.ts`:
  - Add field: `seeding = false;`
  - Add method:
    ```ts
    instantiateAll(): void {
      if (!this.canMutate || this.measures.length > 0) return;
      this.seeding = true;
      this.measureService.fromCatalog(this.validationId).subscribe({
        next: () => { this.seeding = false; this.refresh();
          this.messageService.add({ severity: 'success', summary: 'Modèles instanciés', detail: 'Les mesures du catalogue ont été ajoutées.' });
        },
        error: (err) => {
          this.seeding = false;
          this.messageService.add({ severity: 'error', summary: 'Erreur', detail: err?.error?.message ?? 'Échec de l\\'instanciation.' });
        }
      });
    }
    get canInstantiate(): boolean { return this.canMutate && this.measures.length === 0 && !this.loading; }
    ```

- [x] T025 [US3] Edit `src/app/pages/Ticket/measure-panel/measure-panel.component.html`. In `.panel-header`, just BEFORE the "Ajouter mesure" button, append:
  ```html
  <button pButton *ngIf="canInstantiate" type="button" label="Instancier toutes les mesures" icon="pi pi-list" [loading]="seeding" (click)="instantiateAll()"></button>
  ```

### Auto-seed on ticket creation

- [x] T026 [US3] Edit `src/app/pages/Ticket/ticket-create/ticket-create.component.ts`. Locate `submit()` (around line 298) and the success branch `this.ticketService.create(dto).subscribe({ next: (result) => { ... } })`:
  - Add import at the top: `import { ValidationMeasureService } from '../../../services/validation-measure.service';`
  - Inject in the constructor: `, private measureService: ValidationMeasureService`
  - Inside the success branch (before `setTimeout(() => this.router.navigate(...))`), insert:
    ```ts
    this.measureService.fromCatalog(result.id).subscribe({
      next: () => { /* seeded */ },
      error: () => { /* non-blocking; user can still seed manually */ }
    });
    ```
  - Keep the existing `setTimeout` navigation as-is.

---

## Phase 6 — User Story 4 (P2): Bulk-edit several measure values

**Story goal**: Toggle bulk-edit mode; inline-edit several `measuredValue` cells; submit; partial-success UX reports `X saved, Y failed`.

**Independent test**: As `TECH_VAL`, open a ticket with ≥ 3 NOT_EXECUTED measures. Click "Édition groupée". Inputs replace value cells. Edit 3 values (one valid, one out-of-range, one nonsensical e.g. extreme value the backend rejects). Click "Enregistrer tout". Toast reports counts. Failing row stays in edit mode with inline error.

### Component — `BulkEditMeasureDialog` (in-table mode)

> For Haiku-friendliness this user story does **not** use a modal — it adds a row-mode toggle to the existing `MeasurePanel` table. No new component file needed.

- [x] T027 [US4] Edit `src/app/pages/Ticket/measure-panel/measure-panel.component.ts`:
  - Add imports:
    ```ts
    import { BatchUpdateValidationMeasureItem, BatchValidationMeasureResponse } from '../../../models/batch-validation-measure.model';
    ```
  - Add fields:
    ```ts
    bulkEditMode = false;
    drafts: Record<number, number | null> = {};
    rowErrors: Record<number, string> = {};
    savingBatch = false;
    ```
  - Add methods:
    ```ts
    enterBulkEdit(): void {
      if (!this.canMutate) return;
      this.bulkEditMode = true;
      this.rowErrors = {};
      this.drafts = {};
      for (const m of this.measures) this.drafts[m.id] = m.measuredValue;
    }

    cancelBulkEdit(): void {
      this.bulkEditMode = false;
      this.drafts = {};
      this.rowErrors = {};
    }

    saveBulk(): void {
      const items: BatchUpdateValidationMeasureItem[] = this.measures
        .filter(m => this.drafts[m.id] !== m.measuredValue)
        .map(m => ({ id: m.id, measuredValue: this.drafts[m.id] }));
      if (items.length === 0) { this.cancelBulkEdit(); return; }
      this.savingBatch = true;
      this.rowErrors = {};
      this.measureService.updateBatch(this.validationId, { items }).subscribe({
        next: (resp: BatchValidationMeasureResponse) => {
          this.savingBatch = false;
          for (const r of resp.results) {
            if (r.status === 'error') {
              const id = items[r.index].id;
              this.rowErrors[id] = r.error?.message ?? 'Erreur';
            }
          }
          this.messageService.add({
            severity: resp.summary.failed > 0 ? 'warn' : 'success',
            summary: 'Lot enregistré',
            detail: `${resp.summary.succeeded} enregistrée(s), ${resp.summary.failed} en échec.`
          });
          if (resp.summary.failed === 0) this.cancelBulkEdit();
          this.refresh();
        },
        error: () => {
          this.savingBatch = false;
          this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Le lot a été rejeté.' });
        }
      });
    }
    ```

- [x] T028 [US4] Edit `src/app/pages/Ticket/measure-panel/measure-panel.component.html`:
  - In `.panel-header`, add a toggle button just BEFORE the "Ajouter mesure" button:
    ```html
    <ng-container *ngIf="canMutate">
      <button pButton *ngIf="!bulkEditMode" type="button" label="Édition groupée" icon="pi pi-pencil" (click)="enterBulkEdit()"></button>
      <button pButton *ngIf="bulkEditMode" type="button" label="Enregistrer tout" icon="pi pi-check" [loading]="savingBatch" (click)="saveBulk()"></button>
      <button pButton *ngIf="bulkEditMode" type="button" label="Annuler" class="p-button-text" (click)="cancelBulkEdit()"></button>
    </ng-container>
    ```
  - In the `<td>` that renders `m.measuredValue | measureUnit:m.unit`, replace the cell contents with:
    ```html
    <ng-container *ngIf="!bulkEditMode">{{ m.measuredValue | measureUnit:m.unit }}</ng-container>
    <ng-container *ngIf="bulkEditMode">
      <p-inputNumber [(ngModel)]="drafts[m.id]" mode="decimal" [minFractionDigits]="0" [maxFractionDigits]="4" [size]="8"></p-inputNumber>
      <div class="row-error" *ngIf="rowErrors[m.id]">{{ rowErrors[m.id] }}</div>
    </ng-container>
    ```
  - Add to `measure-panel.component.scss`:
    ```scss
    .row-error { color: var(--red-500, #ef4444); font-size: 0.75rem; margin-top: 0.25rem; }
    ```

---

## Phase 7 — User Story 5 (P3): Add an ad-hoc measure outside the catalog

**Story goal**: `CHEF_SECTEUR` / `ADMIN_IT` only. Open advanced dialog. Manually enter code, label, category, unit, lower, upper, value (+ optional antenna/frequency/modulation). Submit. New row appears marked ad-hoc.

**Independent test**: As `CHEF_SECTEUR`, click "Ajouter mesure ad-hoc". Fill all required fields. Submit. The new row appears with no `catalogTemplateId` and an "ad-hoc" marker. As `TECH_VAL`, the button is not visible.

### Dialog — `AddAdhocMeasureDialog`

- [x] T029 [US5] Create folder `src/app/pages/Ticket/add-adhoc-measure-dialog/` with three files. Use `AddMeasureDialogComponent` (T020) as the structural reference but with a richer form.
  - `add-adhoc-measure-dialog.component.ts`: same skeleton as T020 with the following differences:
    - Form definition:
      ```ts
      form: FormGroup = this.fb.group({
        measureCode: ['', Validators.required],
        measureLabel: ['', Validators.required],
        category: ['OTHER', Validators.required],
        unit: ['', Validators.required],
        lowerBound: [null, Validators.required],
        upperBound: [null, Validators.required],
        antenna: [null],
        frequencyMhz: [null],
        modulationScheme: [null],
        measuredValue: [null, Validators.required],
      }, { validators: this.boundsValidator });
      ```
    - Add this method to the class:
      ```ts
      private boundsValidator(group: FormGroup) {
        const lo = group.get('lowerBound')?.value;
        const hi = group.get('upperBound')?.value;
        if (lo !== null && hi !== null && lo >= hi) return { bounds: true };
        return null;
      }
      ```
    - `submit()` builds the full ad-hoc DTO (omit `catalogTemplateId`); same success/error flow as T020. Use `MEASURE_CATEGORY_LABELS` to populate the category dropdown options.
  - `add-adhoc-measure-dialog.component.html`: a `<p-dialog header="Ajouter une mesure ad-hoc" ...>` containing a reactive form with one PrimeNG control per field. Use `<p-dropdown>` for `category` (options = entries of `MEASURE_CATEGORY_LABELS`), `<p-inputNumber>` for numeric fields, `<input pInputText>` for strings. Show an inline error `<small *ngIf="form.errors?.['bounds']" class="p-error">La borne basse doit être strictement inférieure à la borne haute.</small>` below the bounds row.
  - `add-adhoc-measure-dialog.component.scss`: copy `add-measure-dialog.component.scss`.

### Role-gated entry point

- [x] T030 [US5] Edit `src/app/pages/Ticket/measure-panel/measure-panel.component.ts`:
  - Add getter:
    ```ts
    get canAddAdhoc(): boolean {
      const roles = this.authService.getRoles() ?? [];
      return [Role.CHEF_SECTEUR, Role.ADMIN_IT].some(r => roles.includes(r));
    }
    ```
  - Add field: `addAdhocVisible = false;`
  - Add method: `openAddAdhoc(): void { this.addAdhocVisible = true; }`

- [x] T031 [US5] Edit `src/app/pages/Ticket/measure-panel/measure-panel.component.html`:
  - In `.panel-header`, just AFTER the "Ajouter mesure" button, append:
    ```html
    <button pButton *ngIf="canAddAdhoc" type="button" label="Ajouter mesure ad-hoc" icon="pi pi-plus-circle" class="p-button-secondary" (click)="openAddAdhoc()"></button>
    ```
  - At the bottom of the template (next to the existing add-measure-dialog), append:
    ```html
    <app-add-adhoc-measure-dialog [(visible)]="addAdhocVisible" [validationId]="validationId" (created)="onMeasureCreated()"></app-add-adhoc-measure-dialog>
    ```
  - In the table body row, after the measure-badge cell, append a small visual marker for ad-hoc rows in the same `<td>`:
    ```html
    <span *ngIf="!m.catalogTemplateId" class="adhoc-tag" title="Mesure ad-hoc">ad-hoc</span>
    ```
  - Append to the SCSS:
    ```scss
    .adhoc-tag { margin-left: 0.5rem; padding: 0.1rem 0.4rem; font-size: 0.65rem; background: var(--surface-300, #555); border-radius: 4px; }
    ```

- [x] T032 [US5] Edit `src/app/app.module.ts`:
  - Add `import { AddAdhocMeasureDialogComponent } from './pages/Ticket/add-adhoc-measure-dialog/add-adhoc-measure-dialog.component';`
  - Add `AddAdhocMeasureDialogComponent` to `declarations: [...]`.
  - Save and `ng build`.

---

## Phase 8 — Polish & Cross-cutting

- [x] T033 [P] Run `npm test -- --watch=false --browsers=ChromeHeadless` (or `ng test --watch=false --browsers=ChromeHeadless`). All specs created in this phase must pass:
  - `src/app/services/validation-measure.service.spec.ts`
  - `src/app/shared/pipes/measure-unit.pipe.spec.ts`
  - `src/app/shared/components/measure-status-badge/measure-status-badge.component.spec.ts`
  - `src/app/shared/components/deviation-progress/deviation-progress.component.spec.ts`
  - `src/app/pages/Ticket/measure-panel/measure-panel.component.spec.ts`
  If a spec fails, fix the spec or the source until it passes. Do not skip or comment out failing tests.

- [x] T034 [P] From `sageline-frontend/`, run `ng build` and verify zero TypeScript errors and zero unused-import warnings in files touched by this phase. If unused-import warnings appear in files modified by tasks T009, T019, T021, T024, T026, T027, T030, fix them.

- [x] T035 Manual walkthrough following `spec-RealMesure/specs/002-validation-measure-frontend/quickstart.md` end-to-end. Run `ng serve`. Log in as `TECH_VAL`, then `CHEF_SECTEUR`, then `RESPONSABLE`. Verify all 9 walkthrough steps and the 8 acceptance-checklist items pass. Capture screenshots of: empty panel, seeded panel, OK row, OUT_OF_RANGE row, NOT_EXECUTED row, bulk-edit mode mid-edit, partial-success toast, RESPONSABLE view with hidden actions. Save them under `spec-RealMesure/specs/002-validation-measure-frontend/screenshots/` (create the folder).

- [x] T036 Update `spec-RealMesure/specs/002-validation-measure-frontend/checklists/requirements.md`: mark every item `[x]` and add a short closing note `Phase 002 frontend deliverables complete on YYYY-MM-DD.` (use today's date).

---

## Dependencies

```
Phase 1 (T001..T002)                              # baseline
   └─ Phase 2 (T003..T015)                        # foundational — must complete before any user story
         ├─ Phase 3 / US1 (T016..T019)            # read-only panel + replace legacy
         │     └─ Phase 4 / US2 (T020..T023)      # add catalog-backed measure
         │           ├─ Phase 5 / US3 (T024..T026) # seed all + auto-seed on create
         │           ├─ Phase 6 / US4 (T027..T028) # bulk edit
         │           └─ Phase 7 / US5 (T029..T032) # ad-hoc measure
         └─ Phase 8 (T033..T036)                  # polish — runs last
```

User stories US3, US4, US5 are independent of each other (they all depend on US2). They can be implemented in any order, or in parallel by independent executors.

## Parallelism

Tasks marked `[P]` operate on distinct files with no cross-dependencies and can run concurrently:

- T003, T004, T005, T006 — four model files, independent.
- T008, T010, T011, T012, T013 — service spec, pipe + spec, two shared components — five independent file trees.
- T033, T034 — final test run and build can run concurrently.

Within a user-story phase the tasks are intentionally **sequential** because they each edit `measure-panel.component.ts` / `.html`; do not attempt to parallelize them.

## MVP scope

Implementing **only Phase 1 + Phase 2 + Phase 3 (US1)** delivers a working read-only refactor: every existing ticket renders the new panel correctly, the legacy panel is gone, the shim warns on legacy calls. This is the smallest demonstrable slice and satisfies SC-001, SC-005, SC-006, SC-007 (read-only path) and SC-008.

## Independent test criteria (recap)

| Story | Independent test |
|---|---|
| US1 | Open any seeded ticket as `TECH_VAL`; see the new panel with correct badges, bounds, and deviation bars. Legacy "Results" section is gone. |
| US2 | As `TECH_VAL`, "Ajouter mesure" → pick template → enter value → submit → row appears. As `RESPONSABLE`, the button is hidden. |
| US3 | As `TECH_VAL`, on empty ticket, click "Instancier toutes les mesures" → all catalog templates appear as `NOT_EXECUTED`. After ticket-create, the detail page already has them. |
| US4 | As `TECH_VAL`, toggle "Édition groupée" → edit ≥ 2 rows → "Enregistrer tout" → toast `X saved, Y failed`; failed row stays in edit mode. |
| US5 | As `CHEF_SECTEUR`, "Ajouter mesure ad-hoc" button is visible and the dialog works. As `TECH_VAL`, the button is not present. Submitted ad-hoc rows render with the "ad-hoc" tag. |

## Format validation

All tasks above follow the required format: `- [ ] T### [P?] [Story?] description with file path`. Setup phase (T001–T002), foundational phase (T003–T015), and polish phase (T033–T036) carry no `[Story]` label. User-story phases carry `[US1]…[US5]`.
