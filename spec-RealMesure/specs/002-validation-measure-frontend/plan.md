# Implementation Plan: ValidationMeasure Refactor — Frontend

**Branch**: `002-validation-measure-frontend` | **Date**: 2026-05-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/002-validation-measure-frontend/spec.md`

## Summary

Deliver the Angular 17 frontend for **Phase 002 — ValidationMeasure Refactor** (backend track handled in the sibling Spring Boot project). Replace the legacy generic "Results" panel on the ticket detail page with a new `MeasurePanel` driven by the bounded-tolerance, status-aware `ValidationMeasure` schema introduced by the backend. Ship one new service, one new pipe, two new shared components (`MeasureStatusBadge`, `DeviationProgress`), three new dialogs (Add catalog-backed, Add ad-hoc, Bulk edit), one panel container, the new model + DTOs, and the legacy compatibility shim that downgrades `ValidationResultService` to a deprecation-warning passthrough. Strict reuse of Phase 001 deliverables (`PosteCatalogService`, `MeasureBadge`, `MeasureCategory`, `MeasureStatus` enums) and existing app conventions (PrimeNG via shared module, `lara-dark-blue`, `--sage-*` tokens, NgModule mode, role gating via `Role` enum).

## Technical Context

**Language/Version**: TypeScript ~5.4 on Angular 17.3 (NgModule mode, `standalone: false`)
**Primary Dependencies**: `primeng@17.18`, `primeicons@7`, `primeflex@4`, `keycloak-angular@15`, RxJS ~7.8, `@angular/forms` (reactive forms for the three dialogs). No new dependencies added.
**Storage**: N/A on the frontend. The backend persists `ValidationMeasure` rows (out of scope here). Frontend state is local-component RxJS only — no NgRx, no Akita.
**Testing**: Karma + Jasmine. This phase carries the verdict/status rendering surface, so per constitution III + IX the bar is raised vs Phase 001: every status badge color/icon path tested, every deviation-band threshold tested, every role-gated action visibility tested. HTTP service spec uses `HttpClientTestingModule` with mocked `Deprecation` header handling.
**Target Platform**: Modern evergreen browsers (Chrome/Edge/Firefox) — existing app support matrix.
**Project Type**: Web frontend — Angular SPA, talks to Spring Boot `http://localhost:8089/api`.
**Performance Goals**: Single ticket detail page interactive < 1s on warm cache; measure panel renders ≤ 100 rows without virtualization (PrimeNG table built-in scrolling, no virtual-scroll needed for typical catalogs of ≤ 30 measures); bulk-edit submit round-trip < 3s for 10+ rows over LAN (matches SC-004).
**Constraints**: Reuse existing app shell (`LayoutComponent` + sidebar). Reuse centralized PrimeNG module. Reuse `lara-dark-blue` theme, `--sage-*` tokens, DM Sans / JetBrains Mono fonts, `app` selector prefix. No new dependencies. No standalone components. No new feature modules. No NgRx. No WebSocket subscription for measures (deferred to Phase 003 readiness bar). Backward-compat shim MUST stay until Phase 005 closes (Constitution VIII).
**Scale/Scope**: 1 panel container, 3 dialog components, 2 new shared components, 1 pipe, 1 service, 1 shim downgrade, ~3 new model files (response model + 2 request DTOs), `app.module.ts` declarations expanded by ~7, `app-routing.module.ts` unchanged. Estimated ~1100-1400 LOC including templates and specs.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

Constitution: `.specify/memory/constitution.md` — v1.0.0.

| Principle | Status | Evidence / Notes |
|---|---|---|
| I. Industrial Fidelity | PASS | Measure codes, units, bounds, antenna/frequency context all come from the backend catalog seeded in Phase 001 from supervisor logs. UI never invents codes. |
| II. Bounded Tolerance, Not Target | PASS | `MeasurePanel` renders `[lowerBound, upperBound]` next to every measure value. `measuredValue` is never displayed without its bounds. No `expectedValue` field is read or shown anywhere. |
| III. Three-Valued Measure Status | PASS | `MeasureStatus` enum from Phase 001 is the sole source of status. `MeasureStatusBadge` consumes `MEASURE_STATUS_LABELS` / `_COLORS` / `_ICONS`. No inline color tables; no boolean `conform` is reintroduced anywhere. |
| IV. Guarded Transitions | N/A | Workflow guard arrives in Phase 003; this phase only renders measures. The phase does not add or alter any ticket-status transition button. |
| V. Traceability From Log to Verdict | PASS (forward-ready) | The model includes `sourceLogFile?` and `enteredBy` fields. `MeasurePanel` already renders an "entered by <user>" tooltip per row; the paperclip log-source icon ships hidden behind a feature check (`hasSourceLog`) so Phase 004 lights it up without rework. |
| VI. DTO / Entity Separation & Mirroring | PASS | `validation-measure.model.ts` mirrors the backend `ValidationMeasureResponse` DTO field-for-field. `CreateValidationMeasureRequest` / `UpdateValidationMeasureRequest` mirror backend request DTOs. No renames. |
| VII. Real-Log Test Fixtures | N/A | No parser in this phase. Importer arrives in Phase 004. |
| VIII. Backward Compatibility | PASS | `ValidationResultService` is downgraded to a thin shim that emits `console.warn` on every call and tries the new endpoint first, falling back on 404. The shim removal is filed as a dated task on the Phase 005 plan, not done here. |
| IX. Auditability of Overrides | N/A | Conformity verdict + override arrive in Phase 005. No verdict UI in this phase. |
| X. No Premature AI Integration | PASS | Zero AI calls. The measure panel reserves no AI-specific slots in this phase; the risk-badge placeholder remains where Phase 001 left it. |
| XI. Frontend Stack Consistency | PASS | All new components NgModule-based, declared in `app.module.ts`. PrimeNG imports via `shared/primeng/primeng.module.ts`. `lara-dark-blue` theme. `--sage-*` tokens. DM Sans / JetBrains Mono. `app` selector prefix. No new UI library. No standalone components. No feature modules. |
| XII. Role-Gated UI | PASS | Mutating actions (Add catalog-backed, Add ad-hoc, Bulk edit, Delete row, Instantiate all) are `*ngIf`-hidden — not disabled — for unauthorized roles. The "Add ad-hoc" entry point is further restricted to `CHEF_SECTEUR` + `ADMIN_IT` per spec clarification. Roles imported from `src/app/shared/enums/role.ts` — no string literals. |

**Result**: PASS, no deviations. Complexity Tracking section empty.

## Project Structure

### Documentation (this feature)

```text
specs/002-validation-measure-frontend/
├── spec.md
├── plan.md                              # this file
├── research.md                          # Phase 0 output
├── data-model.md                        # Phase 1 output
├── contracts/
│   └── validation-measure-api.md        # frozen backend contract this feature consumes
├── quickstart.md                        # how to run/verify the refactored panel locally
└── checklists/
    └── requirements.md
```

### Source Code (frontend repo)

Repo root: `sageline-frontend/`. New / modified files (in the frontend project, **not** under `spec-RealMesure/`):

```text
src/app/
├── pages/
│   └── Ticket/
│       ├── ticket-detail/
│       │   ├── ticket-detail.component.ts      # MODIFIED — embed <app-measure-panel>; remove legacy <app-results-panel>
│       │   └── ticket-detail.component.html    # MODIFIED — replace Results section markup
│       ├── measure-panel/                      # NEW — panel container with filter + sort + role-gated actions
│       │   ├── measure-panel.component.ts
│       │   ├── measure-panel.component.html
│       │   ├── measure-panel.component.scss
│       │   └── measure-panel.component.spec.ts
│       ├── add-measure-dialog/                 # NEW — catalog-backed entry
│       │   ├── add-measure-dialog.component.ts
│       │   ├── add-measure-dialog.component.html
│       │   └── add-measure-dialog.component.scss
│       ├── add-adhoc-measure-dialog/           # NEW — ad-hoc entry, gated CHEF_SECTEUR + ADMIN_IT
│       │   └── ...
│       └── bulk-edit-measure-dialog/           # NEW — inline batch edit with partial-success UX
│           └── ...
├── services/
│   ├── validation-measure.service.ts           # NEW — list / create / batch / update / delete / fromTemplate
│   ├── validation-measure.service.spec.ts      # NEW — HttpClientTestingModule + Deprecation header path
│   └── validation-result.service.ts            # MODIFIED — downgraded to shim: warn + try-new-first / fallback-on-404
├── models/
│   ├── validation-measure.model.ts             # NEW — response model (mirrors backend DTO)
│   ├── create-validation-measure.dto.ts        # NEW
│   └── update-validation-measure.dto.ts        # NEW
├── shared/
│   ├── components/
│   │   ├── measure-status-badge/               # NEW — chip using MEASURE_STATUS_COLORS / _ICONS
│   │   │   ├── measure-status-badge.component.ts
│   │   │   ├── measure-status-badge.component.html
│   │   │   ├── measure-status-badge.component.scss
│   │   │   └── measure-status-badge.component.spec.ts
│   │   └── deviation-progress/                 # NEW — green/amber/red banded progress bar
│   │       ├── deviation-progress.component.ts
│   │       ├── deviation-progress.component.html
│   │       ├── deviation-progress.component.scss
│   │       └── deviation-progress.component.spec.ts
│   └── pipes/
│       ├── measure-unit.pipe.ts                # NEW — formats "15.52 dBm"
│       └── measure-unit.pipe.spec.ts           # NEW
├── app.module.ts                               # MODIFIED — declare 7 new symbols (1 panel + 3 dialogs + 2 components + 1 pipe)
└── app-routing.module.ts                       # UNCHANGED (no new route in this phase)
```

**Structure Decision**: Mirrors the existing `pages/Ticket/` casing (the frontend uses capitalized `Ticket/` per `CLAUDE.md`). The new components live next to `ticket-detail/` rather than under a "measures" subfolder to keep the per-page co-location pattern used elsewhere. The two shared components (`MeasureStatusBadge`, `DeviationProgress`) intentionally live under `shared/components/` because Phase 003 (readiness bar) and Phase 005 (conformity panel) will reuse them. No new feature module — flat declarations in `app.module.ts` per Constitution XI.

## Phase 0 — Research

See [research.md](./research.md). The clarification session resolved 4 of 5 candidate ambiguities; the remaining low-impact item (filter/sort persistence across navigation) is settled in research.md as a non-blocking design decision. Zero `NEEDS CLARIFICATION` markers remain.

## Phase 1 — Design & Contracts

See [data-model.md](./data-model.md), [contracts/validation-measure-api.md](./contracts/validation-measure-api.md), and [quickstart.md](./quickstart.md).

Agent-context update: this plan's location is recorded between the `<!-- SPECKIT START -->` / `<!-- SPECKIT END -->` markers in the frontend root `CLAUDE.md` (added if absent — see step in `/speckit-plan` post-design step 3).

## Post-Design Constitution Re-check

| Principle | Status | Notes |
|---|---|---|
| II (Bounded tolerance) | PASS | Data-model lists `lowerBound`/`upperBound` as non-null on response, never an `expectedValue`. Contracts doc confirms. |
| III (Three-valued status) | PASS | Data-model `status` is the `MeasureStatus` enum imported from Phase 001 shared enum. Contracts doc enumerates the three values verbatim. |
| VI (Mirroring) | PASS | data-model.md field list matches the backend `ValidationMeasureResponse` DTO field list captured in contracts/validation-measure-api.md, including nullability. |
| VIII (Backward compat) | PASS | Contracts doc covers both new `/api/validations/{id}/measures` and the deprecated `/api/validation-results` endpoints, including the `Deprecation: true` header semantics consumed by the shim. |
| XI (Stack) | PASS | quickstart.md shows only existing dependencies; no new package install steps. |
| XII (Role gating) | PASS | data-model + contracts both anchor on the `Role` enum (`TECH_VAL`, `TECH_PREP`, `CHEF_SECTEUR`, `ADMIN_IT` for mutate; `EXPERT`, `RESPONSABLE` read-only; ad-hoc creation restricted to `CHEF_SECTEUR`, `ADMIN_IT`). |
| Others | Unchanged from pre-design check. | |

**Result**: PASS — proceed to `/speckit-tasks`.

## Complexity Tracking

> No constitution deviations. Section intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| — | — | — |
