# Phase 0 — Research

**Feature**: 001-poste-catalog-ui
**Date**: 2026-05-13

All material unknowns were resolved during `/speckit-clarify` (see `spec.md › Clarifications`).
The remaining "research" entries below pin down convention reuse decisions so Phase 1 can name
exact existing artifacts to mirror.

---

## R-1. Admin page layout convention

**Decision**: Mirror `src/app/pages/admin/lines/`: a `*-list` parent component holds the PrimeNG
table, filters, toolbar, and confirmation dialogs; create/edit lives in a sibling `*-form`
component opened as a PrimeNG `p-dialog`. Bulk-import is its own sibling dialog component.

**Rationale**: Same pattern used by `lines`, `zones`, `secteurs`, `phases`. Sticking with it gives
the user-familiar UX, keeps the file tree consistent, and avoids inventing a new pattern.

**Alternatives considered**:
- *Single monolithic component* — rejected; templates become unmaintainable above ~3 dialogs.
- *Feature module* — rejected by constitution XI (flat declarations only).

---

## R-2. PrimeNG components to use

**Decision**:
- `p-table` (filterable, paginated) — list view.
- `p-dialog` — create/edit + bulk-import shells.
- `p-dropdown` — poste-type filter & form field.
- `p-inputNumber` — `defaultLowerBound`, `defaultUpperBound`, `frequencyMhz`, `displayOrder`.
- `p-inputText`, `p-checkbox`, `p-inputTextarea` — remaining form fields and JSON paste.
- `p-confirmDialog` (singleton in layout) — soft-delete confirmation.
- `p-toast` (singleton in layout) — success/error toasts.
- `p-tag` — category & "Inactive" chips.

**Rationale**: All already imported via `src/app/shared/primeng/primeng.module.ts`; zero
dependency churn.

**Alternatives considered**:
- *PrimeNG `p-treeTable`* for grouping by poste-type — rejected; the filter selector already
  scopes the view to one poste type.

---

## R-3. Enum + companion-map convention

**Decision**: Follow exact shape of `shared/enums/ticket.enum.ts` — each enum is exported as a
TypeScript `type` (union of string literals) plus `*_LABELS`, `*_COLORS`, `*_ICONS`
`Record<EnumType, string>` maps. Templates read directly from those maps; no inline `ngSwitch`
color tables.

**Rationale**: Matches existing `TicketStatus`, `Priority`, `AssignmentRole`, etc. Honors
constitution XI (stack consistency) and constitution III (status visual encoding centralized in
shared/enums).

**Alternatives considered**:
- *TypeScript `enum`* — rejected; project already standardized on string-literal union types.

---

## R-4. Reuse of existing `PosteType`

**Decision**: Import the existing `PosteType` type from
`src/app/shared/enums/ticket.enum.ts` (already declared as a union of 22 string literals
matching the backend enum). Do **not** redeclare it.

**Rationale**: Source-of-truth principle (VI); avoids divergence.

**Alternatives considered**:
- *Local copy in `poste-measure-catalog.model.ts`* — rejected; duplication risk if the backend
  enum grows.

---

## R-5. Filter dropdown population (resolved in /clarify)

**Decision**: Dropdown lists every `PosteType` enum value unconditionally (clarification A1).
Source: the `PosteType` union imported from `shared/enums/ticket.enum.ts`, iterated via a static
constant `POSTE_TYPE_VALUES: PosteType[]`. Empty poste types render the empty-state per FR-011.

**Rationale**: Admins must be able to seed the first measure of a new poste type. See spec.md §
Clarifications Q1.

**Alternatives considered**: Listed in spec clarification options B & C — both rejected.

---

## R-6. Inactive-row fetching (resolved in /clarify)

**Decision**: Backend `GET /api/poste-catalog` and `GET /api/poste-catalog/{posteType}/measures`
accept a `?includeInactive=true` query parameter (clarification A3). Toggle change triggers a
re-fetch with the new param; no client-side filtering.

**Rationale**: Cleaner contract; aligns with constitution VI; scales if catalogs grow.

**Alternatives considered**: Frontend client-side filtering and "always return both" responses
both rejected as either inconsistent with VI or wasteful of payload.

---

## R-7. Soft-delete authorization (resolved in /clarify)

**Decision**: `ADMIN_IT` **and** `CHEF_SECTEUR` may soft-delete (clarification A2). The
backend's `DELETE /api/poste-catalog/measures/{id}` endpoint MUST enforce the same set.

**Rationale**: Symmetry with create/edit; avoids the "can add a row, cannot remove my mistake"
UX trap.

**Alternatives considered**: ADMIN_IT-only — rejected as needlessly restrictive for this admin
surface.

---

## R-8. Form validation strategy

**Decision**: Reactive forms (`FormGroup` + `Validators`) with cross-field validator for
`lowerBound < upperBound`. Inline field-level errors via `<small class="p-error">`. Submit
disabled while invalid or pending; on backend `409`, set a `measureCode` form-error key and
re-mark the field. Pattern lifted from `pages/admin/lines/line-form/`.

**Rationale**: Existing project standard.

**Alternatives considered**: Template-driven forms — rejected; rest of admin uses reactive forms.

---

## R-9. Bulk-import transactional semantics

**Decision**: Best-effort, per-row. The dialog parses JSON client-side, then dispatches one POST
per entry sequentially (small N, < ~50 rows), accumulating outcomes into a `{ created: [],
failed: [{ index, code, reason }] }` report shown when complete. No backend bulk endpoint in
this phase.

**Rationale**: Matches spec FR-017 and the "Add to catalog without code change" goal; avoids
introducing a transactional bulk endpoint backend wasn't asked for.

**Alternatives considered**:
- *Add bulk endpoint to backend* — rejected; out of scope (Phase 001 backend contract is frozen).
- *Parallel `forkJoin`* — rejected; sequential keeps per-row error reporting readable and avoids
  flooding the backend.

---

## R-10. Locale / copy

**Decision**: French UI strings, matching existing admin pages (`Tickets`, `Lignes`, `Secteurs`).
Working titles in spec.md are English; final component templates render French copy.

**Rationale**: Project standard.

**Alternatives considered**: i18n via `@angular/localize` — out of scope; no i18n infrastructure
currently in the project.
