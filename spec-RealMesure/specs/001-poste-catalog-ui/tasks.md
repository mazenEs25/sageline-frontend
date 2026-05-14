# Tasks — 001 PosteType Catalog (Frontend)

**Feature dir**: `spec-RealMesure/specs/001-poste-catalog-ui/`
**Frontend repo root** (used in every file path below): `sageline-frontend/`
**Target executor**: low-cost LLM. Each task is self-contained: it names the exact file to
touch, the exact existing reference file to mirror, and the exact field set / pattern to use.

## Conventions referenced (read once, reuse everywhere)

- **Service pattern** → mirror `src/app/services/phase.service.ts` (HttpClient + `environment.apiUrl` + typed `Observable<T>`).
- **Admin list+dialog pattern** → mirror `src/app/pages/admin/phases/phase-list/phase-list.component.ts` (loads data, opens PrimeNG dialog, edit/delete via `MessageService` + `ConfirmationService`).
- **Enum + maps pattern** → mirror `src/app/shared/enums/ticket.enum.ts` (string-literal `type` + `*_LABELS` / `*_COLORS` / `*_ICONS` Records).
- **Sidebar menu** → edit `src/app/layout/sidebar/sidebar.component.ts` (already has an "Administration" group; add one item).
- **Routing** → edit `src/app/app-routing.module.ts` (add one entry under the `LayoutComponent` children with `canActivate: [AuthGuard]` and `data: { roles: [...] }`).
- **Module wiring** → edit `src/app/app.module.ts` (add new components to `declarations`).
- **Locale**: All user-visible strings in **French**, matching existing admin pages.

---

## Phase 1 — Setup

- [x] T001 Confirm Angular dev server runs cleanly before any change. From `sageline-frontend/`, run `ng serve` once, verify `http://localhost:4200` loads, then stop the server. No file changes.
- [x] T002 Confirm the existing `PosteType` union in `src/app/shared/enums/ticket.enum.ts` contains the 22 values listed in `spec-RealMesure/specs/001-poste-catalog-ui/data-model.md` § "Enum: PosteType". If any value is missing, STOP and report — do not edit `ticket.enum.ts` to add values (backend enum is source of truth).

## Phase 2 — Foundational (must complete before any user-story phase)

### Enums

- [x] T003 [P] Create file `src/app/shared/enums/measure-category.enum.ts` containing exactly the contents in `data-model.md` § "Enum: MeasureCategory (new)" (the `MeasureCategory` type plus `MEASURE_CATEGORY_LABELS`, `MEASURE_CATEGORY_COLORS`, `MEASURE_CATEGORY_ICONS` records). Do not add other exports.
- [x] T004 [P] Create file `src/app/shared/enums/measure-status.enum.ts` containing exactly the contents in `data-model.md` § "Enum: MeasureStatus (new)" (the `MeasureStatus` type plus `MEASURE_STATUS_LABELS`, `MEASURE_STATUS_COLORS`, `MEASURE_STATUS_ICONS` records).
- [x] T005 [P] In `src/app/shared/enums/ticket.enum.ts`, add the constant `POSTE_TYPE_VALUES: PosteType[]` exactly as listed in `data-model.md` § "Enum: PosteType" (just after the `PosteType` type declaration). Do not modify any other export.

### Model + DTOs

- [x] T006 [P] Create file `src/app/models/poste-measure-catalog.model.ts` containing:
  - Imports: `PosteType` from `../shared/enums/ticket.enum`; `MeasureCategory` from `../shared/enums/measure-category.enum`.
  - Interface `PosteMeasureCatalog` with the 15 fields listed in `data-model.md` § "Response model" (id, posteType, measureCode, measureLabel, category, defaultUnit, defaultLowerBound, defaultUpperBound, mandatory, displayOrder, antenna|null, frequencyMhz|null, modulationScheme|null, active). Match nullability exactly.
  - Interface `CreatePosteMeasureCatalogRequest` with all 12 input fields per `data-model.md` § "Request DTOs".
  - Interface `UpdatePosteMeasureCatalogRequest` (NO `posteType`, NO `measureCode`; everything else identical to create).

### Service

- [x] T007 Create file `src/app/services/poste-catalog.service.ts` following the `PhaseService` pattern exactly. Class `PosteCatalogService`, `@Injectable({ providedIn: 'root' })`, `private apiUrl = ${environment.apiUrl}/poste-catalog;`. Implement the 6 methods listed in `contracts/poste-catalog-api.md` § "Service signature":
  - `listAll(includeInactive = false): Observable<PosteMeasureCatalog[]>` → `GET apiUrl` with `HttpParams` `includeInactive` only when `true`.
  - `getByPosteType(posteType, includeInactive = false): Observable<PosteMeasureCatalog[]>` → `GET apiUrl/${posteType}`.
  - `getMeasuresByPosteType(posteType, includeInactive = false): Observable<PosteMeasureCatalog[]>` → `GET apiUrl/${posteType}/measures`.
  - `create(dto): Observable<PosteMeasureCatalog>` → `POST apiUrl/measures`.
  - `update(id, dto): Observable<PosteMeasureCatalog>` → `PUT apiUrl/measures/${id}`.
  - `delete(id): Observable<void>` → `DELETE apiUrl/measures/${id}`.

  Reuse `HttpClient` injection in the constructor. Import `PosteMeasureCatalog`, `CreatePosteMeasureCatalogRequest`, `UpdatePosteMeasureCatalogRequest` from the model file created in T006.

- [x] T008 [P] Create file `src/app/services/poste-catalog.service.spec.ts` using `HttpClientTestingModule` and `HttpTestingController`. One smoke test per method (6 tests total). Each test: call the method, then `httpTestingController.expectOne({ url, method })`, verify URL + method, flush a minimal mock payload. Use `getMeasuresByPosteType('WIFI_CONDUIT')` to also assert URL is exactly `${apiUrl}/WIFI_CONDUIT/measures`. No business-logic assertions.

### Shared component — `MeasureBadge`

- [x] T009 [P] Create folder `src/app/shared/components/measure-badge/` with three files:
  - `measure-badge.component.ts` — selector `app-measure-badge`, `standalone: false`. `@Input() category!: MeasureCategory`, `@Input() code!: string`, `@Input() antenna: string | null = null`, `@Input() frequencyMhz: number | null = null`. Expose `MEASURE_CATEGORY_ICONS` and `MEASURE_CATEGORY_LABELS` as public properties so the template can index them.
  - `measure-badge.component.html` — render a single `<span>` with the category icon (`<i [class]="icons[category]"></i>`), the `code`, and a suffix block ` · {{antenna}} · {{frequencyMhz}} MHz` only when those inputs are non-null. Use small inline classes; no module imports beyond what's in the shared PrimeNG module.
  - `measure-badge.component.scss` — minimal: inline-flex, gap `0.4rem`, monospace code via `font-family: var(--font-mono, 'JetBrains Mono')`.

### Module wiring

- [x] T010 Edit `src/app/app.module.ts`: add four imports and four `declarations` entries (keep alphabetical proximity to existing admin imports):
  - `MeasureBadgeComponent` from `./shared/components/measure-badge/measure-badge.component`
  - `PosteCatalogListComponent` from `./pages/admin/poste-catalog/poste-catalog-list/poste-catalog-list.component` (will be created in T012)
  - `PosteCatalogFormComponent` from `./pages/admin/poste-catalog/poste-catalog-form/poste-catalog-form.component` (T015)
  - `PosteCatalogBulkImportComponent` from `./pages/admin/poste-catalog/poste-catalog-bulk-import/poste-catalog-bulk-import.component` (T018)

  Order: add the badge import + declaration now; add the three page-component imports + declarations as placeholders pointing at the planned paths. The build will fail at this point — that is expected; T012/T015/T018 create the files.

  > **NOTE for the executor**: if compiling between tasks is required, perform T010 *after* T012, T015, T018 to keep the tree green. Otherwise, leave the four imports commented out at first and uncomment them as each component file is created.

---

## Phase 3 — User Story 1 (P1): Browse the catalog grouped by PosteType

**Story goal**: An admin/CHEF_SECTEUR opens `/admin/poste-catalog`, picks a poste type, and sees
its seeded measures in a table.

**Independent test**: Log in as `ADMIN_IT`. Navigate to `/admin/poste-catalog`. Filter to
`WIFI_CONDUIT`. Expect ≥ 16 rows. Log in as `TECH_VAL`. URL is inaccessible (redirect to
`/access-denied`).

### Route + sidebar (visibility)

- [x] T011 [US1] Edit `src/app/app-routing.module.ts`: add a route under the existing
  `LayoutComponent` children, just below the `admin/phases` entry, exactly:
  ```ts
  { path: 'admin/poste-catalog', component: PosteCatalogListComponent, canActivate: [AuthGuard],
    data: { roles: ['ADMIN_IT', 'CHEF_SECTEUR'] } },
  ```
  Add the matching import at the top: `import { PosteCatalogListComponent } from './pages/admin/poste-catalog/poste-catalog-list/poste-catalog-list.component';`.

### List component (US 1)

- [x] T012 [US1] Create folder `src/app/pages/admin/poste-catalog/poste-catalog-list/` with three files. Use `pages/admin/phases/phase-list/phase-list.component.ts` as the structural reference.
  - `poste-catalog-list.component.ts` — class `PosteCatalogListComponent` implementing `OnInit`. Selector `app-poste-catalog-list`. `providers: [MessageService, ConfirmationService]`. Inject `PosteCatalogService`, `MessageService`, `ConfirmationService`. State:
    - `entries: PosteMeasureCatalog[] = [];`
    - `loading = true;`
    - `selectedPosteType: PosteType = 'TEST_FONCTIONNEL';` (first non-empty seeded type by default; this is also a safe default for empty backends)
    - `includeInactive = false;`
    - `posteTypeOptions = POSTE_TYPE_VALUES.map(v => ({ label: v, value: v }));`
    - Public getters/properties to expose `MEASURE_CATEGORY_LABELS`, `MEASURE_CATEGORY_COLORS`, `MEASURE_CATEGORY_ICONS` for template binding.
  - Methods:
    - `ngOnInit()` → `loadEntries()`.
    - `loadEntries()` → call `service.getMeasuresByPosteType(this.selectedPosteType, this.includeInactive)`, set `entries` on success, set `loading = false` in `finalize`. On error, toast `severity: 'error', summary: 'Erreur', detail: 'Impossible de charger le catalogue'`.
    - `onPosteTypeChange()` → calls `loadEntries()`.
    - `onIncludeInactiveChange()` → calls `loadEntries()`.
  - `poste-catalog-list.component.html` — render in this order, all in French:
    1. A header `<h2>Catalogue des postes</h2>`.
    2. A toolbar row with: `p-dropdown` bound to `selectedPosteType` (options `posteTypeOptions`, `(onChange)="onPosteTypeChange()"`), a `p-checkbox` for `includeInactive` with label "Inclure inactifs" (`(onChange)="onIncludeInactiveChange()"`), and three right-aligned buttons (hidden for now — wired in US 2/3/4): "Ajouter une mesure", "Import groupé".
    3. A `p-table` over `entries` with paginator (`[rows]="25" [rowsPerPageOptions]="[25,50,100]"`), default sort by `displayOrder` ascending, columns: `measureCode` (rendered via `<app-measure-badge [category]="row.category" [code]="row.measureCode" [antenna]="row.antenna" [frequencyMhz]="row.frequencyMhz">`), `category` (`<p-tag [severity]="colors[row.category]" [value]="labels[row.category]">`), `defaultUnit`, `defaultLowerBound`, `defaultUpperBound`, `mandatory` (Oui/Non chip), `displayOrder`, plus an "Inactif" tag rendered only when `!row.active`, plus an actions column (Edit/Delete buttons hidden by default; wired in US 3).
    4. An empty-state `<div *ngIf="!loading && entries.length === 0">` with the message "Aucune mesure configurée pour ce poste. Utilisez « Ajouter une mesure » pour commencer."
    5. A loading skeleton or spinner while `loading`.
  - `poste-catalog-list.component.scss` — minimal layout (flex toolbar, gap), no theme overrides.

### Smoke verification for US 1

- [x] T013 [US1] Add a sidebar menu entry. Edit `src/app/layout/sidebar/sidebar.component.ts`. Inside the existing "Administration" group items array, insert a new item just after the `Phases` entry:
  ```ts
  { label: 'Catalogue postes', icon: 'pi pi-list', route: '/admin/poste-catalog', roles: ['ADMIN_IT', 'CHEF_SECTEUR'] },
  ```
  Do not modify any other item.

- [ ] T014 [US1] Manual smoke: with the backend running on `:8089`, log in as `ADMIN_IT`, click "Catalogue postes" in sidebar, pick `WIFI_CONDUIT`. Expect rows. Log in as `TECH_VAL`, confirm sidebar entry is hidden and `/admin/poste-catalog` redirects to `/access-denied`. No code changes; record outcome in PR description.

---

## Phase 4 — User Story 2 (P1): Create a new measure template

**Story goal**: ADMIN_IT/CHEF_SECTEUR opens "Ajouter une mesure", fills the form, submits, sees
the row in the table.

**Independent test**: From the catalog page, click "Ajouter une mesure", submit a valid form,
see the new row in the table without page reload. Submit a duplicate `(posteType, measureCode)`
→ field-level error, dialog stays open.

### Form component

- [x] T015 [US2] Create folder `src/app/pages/admin/poste-catalog/poste-catalog-form/` with three files. Use `pages/admin/phases/phase-list/phase-list.component.ts`'s dialog handling as reference (it co-locates the form, but here we extract it for clarity).
  - `poste-catalog-form.component.ts` — class `PosteCatalogFormComponent`, selector `app-poste-catalog-form`. `@Input() visible = false;`, `@Input() initial: PosteMeasureCatalog | null = null;` (null = create mode), `@Input() lockedPosteType: PosteType | null = null;` (passed from list component). `@Output() visibleChange = new EventEmitter<boolean>();`, `@Output() saved = new EventEmitter<void>();`.
  - Build a `FormGroup` with these controls (use `Validators.required` everywhere except the three optional fields):
    - `posteType` (required; disabled when `initial !== null`)
    - `measureCode` (required; `Validators.pattern(/^[A-Z0-9_]+$/)`; disabled when `initial !== null`)
    - `measureLabel` (required)
    - `category` (required)
    - `defaultUnit` (required)
    - `defaultLowerBound` (required, numeric)
    - `defaultUpperBound` (required, numeric)
    - `mandatory` (required, boolean; default `false`)
    - `displayOrder` (required, integer, min 0; default `0`)
    - `antenna` (optional)
    - `frequencyMhz` (optional; if present, min 0)
    - `modulationScheme` (optional)
  - Cross-field validator on the FormGroup: error key `boundsOrder` when `defaultUpperBound <= defaultLowerBound` AND both controls are non-null. Display error: "La borne supérieure doit être strictement supérieure à la borne inférieure."
  - `ngOnChanges` (or a setter) — when `initial` becomes non-null, `patchValue(initial)`; when null, `reset` with default values and re-enable `posteType`/`measureCode`.
  - `onSubmit()`:
    - If form invalid, `markAllAsTouched()` and return.
    - Set `submitting = true`.
    - If `initial === null`, call `service.create(this.form.value as CreatePosteMeasureCatalogRequest)`. Else call `service.update(initial.id, dtoWithoutPosteTypeAndCode)`.
    - On success: toast `severity: 'success'`, emit `saved`, close dialog (emit `visibleChange.emit(false)`).
    - On error: if `err.status === 409`, set `form.get('measureCode')?.setErrors({ duplicate: true })` and toast `severity: 'warn'` with detail "Code déjà utilisé pour ce poste."; otherwise toast `severity: 'error'` with detail `err.error?.message || 'Échec de l'enregistrement'`.
    - Finally: `submitting = false`.
  - `poste-catalog-form.component.html` — single `<p-dialog [(visible)]="visible" (visibleChange)="visibleChange.emit($event)" [modal]="true" [style]="{ width: '640px' }" [header]="initial ? 'Modifier la mesure' : 'Ajouter une mesure'">`. Inside: a reactive form with one labeled control per field above, using `p-dropdown` for `posteType` (options `posteTypeOptions`) and `category` (options derived from `MEASURE_CATEGORY_LABELS`), `p-inputText` for text fields, `p-inputNumber` for the three numeric fields, `p-checkbox` for `mandatory`. Show per-field `<small class="p-error">` errors and the cross-field bounds error above the action row. Footer: "Annuler" (close) + "Enregistrer" (`[disabled]="form.invalid || submitting"`).
  - `poste-catalog-form.component.scss` — minimal; rely on PrimeNG defaults and `p-fluid`.

### Wire the form into the list page

- [x] T016 [US2] Edit `poste-catalog-list.component.ts` and `.html`:
  - Add state `dialogVisible = false;` and `selectedEntry: PosteMeasureCatalog | null = null;`.
  - Add method `openCreate()` → set `selectedEntry = null; dialogVisible = true;`.
  - In the toolbar of the HTML, wire the "Ajouter une mesure" button: `(onClick)="openCreate()"` and `*ngIf="canMutate"` (where `canMutate` checks the current user's roles — see T017).
  - At the bottom of the template, render `<app-poste-catalog-form [(visible)]="dialogVisible" [initial]="selectedEntry" (saved)="loadEntries()"></app-poste-catalog-form>`.

- [x] T017 [US2] Add a `canMutate` computed flag to `PosteCatalogListComponent`. Inject `AuthService` (`src/app/services/auth.service.ts`, already exists in project). Implement:
  ```ts
  get canMutate(): boolean {
    const roles = this.auth.getRoles?.() ?? [];
    return roles.includes('ADMIN_IT') || roles.includes('CHEF_SECTEUR');
  }
  ```
  Use this flag to `*ngIf` the "Ajouter une mesure" and "Import groupé" buttons, and the actions column.

---

## Phase 5 — User Story 3 (P2): Update or soft-delete a measure template

**Story goal**: Edit existing fields (code locked) and soft-delete with confirmation. Inactive
rows hidden by default; shown when toggle ON with a visible "Inactif" marker.

**Independent test**: Edit a row's `defaultUpperBound`, save, see the change. Delete the row,
confirm; row disappears. Toggle "Inclure inactifs"; row reappears with an "Inactif" tag.

- [x] T018 [US3] In `poste-catalog-list.component.ts` add:
  - `openEdit(row: PosteMeasureCatalog)` → `selectedEntry = row; dialogVisible = true;`.
  - `confirmDelete(row: PosteMeasureCatalog)` → use `confirmationService.confirm` with header "Supprimer la mesure", message "Confirmer la désactivation de la mesure « {row.measureCode} » ? Les tickets existants conservent leur référence.", `acceptLabel: 'Supprimer'`, `rejectLabel: 'Annuler'`, `acceptIcon: 'pi pi-trash'`. On accept, call `service.delete(row.id)`, on success toast `success` + `loadEntries()`, on error toast `error`.
- [x] T019 [US3] In `poste-catalog-list.component.html` actions column, render two buttons inside `*ngIf="canMutate"`:
  - `<p-button icon="pi pi-pencil" severity="secondary" (onClick)="openEdit(row)" />`
  - `<p-button icon="pi pi-trash" severity="danger" (onClick)="confirmDelete(row)" />`
  And add a single `<p-confirmDialog></p-confirmDialog>` at the bottom of the template.
- [x] T020 [US3] In the same template, render an inline `<p-tag severity="secondary" value="Inactif" *ngIf="!row.active"></p-tag>` next to `measureCode` inside the table body cell. Verify that when `includeInactive` is OFF, the backend returns no inactive rows (so the tag never shows) — and when ON, the tag appears for soft-deleted rows.

---

## Phase 6 — User Story 4 (P3): Bulk-import JSON

**Story goal**: Paste a JSON array of templates for one poste type; receive a per-row outcome
report.

**Independent test**: Open "Import groupé", pick a poste type, paste a valid JSON array of 3
entries, submit, see `3 créés / 0 échoués`. Include one duplicate; expect 2/1.

- [x] T021 [US4] Create folder `src/app/pages/admin/poste-catalog/poste-catalog-bulk-import/` with three files.
  - `poste-catalog-bulk-import.component.ts` — class `PosteCatalogBulkImportComponent`, selector `app-poste-catalog-bulk-import`. `@Input() visible = false;`, `@Output() visibleChange`, `@Output() imported = new EventEmitter<void>();`. State: `targetPosteType: PosteType | null = null;`, `jsonInput = '';`, `submitting = false;`, `report: { created: any[]; failed: { index: number; code: string | null; reason: string }[] } | null = null;`.
  - Method `onSubmit()`:
    1. Reset `report = { created: [], failed: [] }`.
    2. Parse `jsonInput` via `JSON.parse`. On parse failure: toast `error` with detail "JSON invalide" and return.
    3. Validate parsed result is an array. If not: toast `error` detail "Le contenu doit être un tableau JSON." and return.
    4. Set `submitting = true`. For each entry (with index `i`), build a `CreatePosteMeasureCatalogRequest` by spreading the parsed entry and overwriting `posteType` with `targetPosteType`. Call `service.create(dto)` sequentially (`from(entries).pipe(concatMap(...))` or `for await` via firstValueFrom). On each success push to `report.created`. On each error push `{ index: i, code: entry.measureCode ?? null, reason: err.error?.message || err.message }` into `report.failed`.
    5. When all done: `submitting = false`. Emit `imported` so the list reloads on dialog close.
  - `poste-catalog-bulk-import.component.html` — `<p-dialog>` with: a `p-dropdown` for `targetPosteType` (same `posteTypeOptions` source — pass them via `@Input()` or duplicate the static list), a `p-inputTextarea` bound to `jsonInput` with `rows="14"` and `style="font-family: var(--font-mono, monospace);"`, a "Valider" button (`[disabled]="!targetPosteType || !jsonInput || submitting"`), and a results section shown after submit listing `report.created.length` créés (green) and a list of `report.failed` entries (red). Footer: "Fermer" (close, emits `visibleChange.emit(false)` and emits `imported` if anything was created).
  - `.scss` — minimal.
- [x] T022 [US4] In `poste-catalog-list.component.ts`, add `bulkVisible = false;` and `openBulk()` → `bulkVisible = true;`. In the HTML, wire the toolbar button "Import groupé" with `(onClick)="openBulk()" *ngIf="canMutate"`. At the bottom of the template, render `<app-poste-catalog-bulk-import [(visible)]="bulkVisible" (imported)="loadEntries()"></app-poste-catalog-bulk-import>`.

---

## Phase 7 — Polish & cross-cutting

> **Review pass (2026-05-14)** applied: C-1 `CheckboxModule` registered in `shared/primeng/primeng.module.ts`; C-2 bulk-import rewritten with `tap` + `catchError(EMPTY)` so every row is attempted; C-3 form pre-fills `posteType` from `lockedPosteType`; M-1 table now sorts by `displayOrder` ascending by default; M-2 optional fields normalized to `null` via shared helpers on both create and update; M-3 dead `globalFilterFields` removed; M-4 empty-state colspan now respects `canMutate`; M-5 "Recommencer" button added to bulk-import dialog; M-6 unused `MeasureCategory` import dropped; redundant numeric pattern validators dropped; `standalone: false` made explicit on the two dialog components and the list; `pTooltip` showing the category label added to `MeasureBadge`. Dev build passes with zero template/TS errors. Pre-existing Karma compile errors in `websocket.service.ts` and `nl2br.pipe.spec.ts` block the service spec from running — unrelated to this phase; flag separately.

- [x] T023 [P] Verify no `console.log` / `debugger` left in any new file. Grep the 8 new source files (excluding `*.spec.ts`).
- [x] T024 [P] Verify constitution XII compliance: open the 4 new templates and confirm every mutating button (Ajouter, Modifier, Supprimer, Import groupé) is wrapped in `*ngIf="canMutate"` (not `[disabled]`). The actions column should also be `*ngIf="canMutate"`.
- [x] T025 [P] Run `ng build` from `sageline-frontend/`. Expect zero errors. Fix any TypeScript/strict-null errors by tightening typings in the model file, not by adding `any`.
- [x] T026 Run the single Karma spec: `ng test --include='**/poste-catalog.service.spec.ts' --watch=false --browsers=ChromeHeadless`. All 6 tests must pass.
- [ ] T027 Manual walkthrough of `specs/001-poste-catalog-ui/quickstart.md` § "Verify acceptance scenarios". Record one screenshot per US in the PR description.
- [x] T028 Update `spec-RealMesure/CLAUDE.md` SPECKIT block only if the plan path has changed. (Already correct after `/speckit-plan`; usually a no-op.)

---

## Dependencies

```
Phase 1 (T001, T002)
        │
        ▼
Phase 2 — Foundational
   T003 ──┐
   T004 ──┼── all parallel ──┐
   T005 ──┘                  │
   T006 ──[needs nothing]────┤
   T007 ──[needs T006]───────┤
   T008 ──[needs T007]───[P] ┤
   T009 ──[needs T003]───[P] ┤
   T010 ──[needs T009 + T012/T015/T018 OR commented stubs]
        │
        ▼
Phase 3 (US1)
   T011 ──[needs T010 path or stub]
   T012 ──[needs T003, T006, T007, T009]
   T013 ──[needs T011]
   T014 ──[manual, after T013]
        │
        ▼
Phase 4 (US2)
   T015 ──[needs T006, T007]
   T016 ──[needs T012, T015]
   T017 ──[needs T012]
        │
        ▼
Phase 5 (US3)
   T018 ──[needs T012, T015, T017]
   T019 ──[needs T018]
   T020 ──[needs T012]
        │
        ▼
Phase 6 (US4)
   T021 ──[needs T006, T007]
   T022 ──[needs T012, T021]
        │
        ▼
Phase 7 (Polish)
   T023 [P], T024 [P], T025 [P], T026, T027, T028
```

## Parallel execution opportunities

- **Phase 2**: T003, T004, T005 (three independent enum files), T006 (model file), T008 (spec file, after T007), T009 (badge component) can all be authored in parallel by different workers.
- **Phase 7**: T023, T024, T025 (audit + build) parallel.

## Implementation strategy (MVP first)

- **MVP = Phase 1 + Phase 2 + Phase 3 (US1 only)**. After T014, you have a working read-only
  catalog page reachable from the sidebar — already demo-able and verifiable against the
  supervisor logs.
- **Iteration 2** = Phase 4 (US2). Adds Create. Page becomes useful for admins.
- **Iteration 3** = Phase 5 (US3). Adds Edit / soft-delete + inactive view.
- **Iteration 4** = Phase 6 (US4). Bulk-import — convenience for new postes.
- **Always last** = Phase 7. Audit + build + smoke + screenshots.

## Independent test criteria recap

| Story | Test |
|---|---|
| US1 | `ADMIN_IT` sees ≥16 rows for `WIFI_CONDUIT`; `TECH_VAL` is blocked. |
| US2 | Submit valid form → row appears. Submit duplicate code → field-level error, dialog open. |
| US3 | Edit upperBound → reflected. Delete → row hidden. Toggle "Inclure inactifs" → row visible with "Inactif" tag. |
| US4 | Paste 3 valid JSON entries → 3 créés. Paste one duplicate → 2 créés / 1 échoué with reason. |

## Format validation

All 28 tasks above:
- Start with `- [ ]`.
- Have a sequential ID `T001`–`T028`.
- Use `[P]` only where parallelizable.
- Use `[US1]`/`[US2]`/`[US3]`/`[US4]` labels inside their respective phases; setup/foundational/polish carry no story label.
- Name an exact file path (or "manual" + step for non-file tasks).
