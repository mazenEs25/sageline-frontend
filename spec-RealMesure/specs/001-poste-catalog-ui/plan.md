# Implementation Plan: PosteType Catalog — Frontend

**Branch**: `001-poste-catalog-ui` | **Date**: 2026-05-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/001-poste-catalog-ui/spec.md`

## Summary

Deliver the Angular 17 frontend for **Phase 001 — PosteType Catalog** (backend track in a sibling
Spring Boot repo). Add a new admin page at `/admin/poste-catalog` letting `ADMIN_IT` and
`CHEF_SECTEUR` browse, create, edit, soft-delete, and bulk-import per-poste measure templates that
mirror the Sagemcom industrial measurement nomenclature. The page consumes 6 stable backend
endpoints under `/api/poste-catalog`, surfaces a new shared `MeasureBadge` component reused by
phases 002-004, and seeds two new enums (`MeasureCategory`, `MeasureStatus`) with the project's
standard `*_LABELS`/`*_COLORS`/`*_ICONS` companion maps. Strict reuse of existing PrimeNG theme,
shared layout, `--sage-*` tokens, and NgModule conventions.

## Technical Context

**Language/Version**: TypeScript ~5.4 on Angular 17.3 (NgModule mode, `standalone: false`)
**Primary Dependencies**: `primeng@17.18`, `primeicons@7`, `primeflex@4`, `keycloak-angular@15`,
RxJS ~7.8 (existing), `@angular/forms` reactive forms (existing)
**Storage**: N/A on the frontend; backend persists `PosteMeasureCatalog` rows (out of scope here)
**Testing**: Karma + Jasmine — **deliberately minimal for this phase** per user direction; one
service-level HTTP wiring spec, no component-level UI tests (deferred to Phase 002 where they
protect verdict rendering)
**Target Platform**: Modern evergreen browsers (Chrome/Edge/Firefox); the existing app's support
matrix
**Project Type**: Web frontend — Angular SPA, talks to Spring Boot `http://localhost:8089/api`
**Performance Goals**: Catalog page interactive < 1s on a warm cache; table renders ≤ a few
hundred rows without virtualization (PrimeNG paginator, 25 rows per page default)
**Constraints**: Must reuse existing app shell (LayoutComponent + sidebar), centralized PrimeNG
module, `lara-dark-blue` theme, `--sage-*` tokens, DM Sans / JetBrains Mono fonts, `app` selector
prefix. No new dependencies. No standalone components. No new feature modules.
**Scale/Scope**: 1 page, 2 dialogs, 1 service, 1 shared component, 2 new enums, ~3 new models, 1
route, 1 sidebar entry. Estimated ~600-900 LOC including templates.

## Constitution Check

*GATE: Must pass before Phase 0. Re-checked after Phase 1 design.*

Constitution: `.specify/memory/constitution.md` — v1.0.0.

| Principle | Status | Evidence / Notes |
|---|---|---|
| I. Industrial Fidelity | PASS | Seeded codes/units/bounds come from supervisor logs; no invented terminology. |
| II. Bounded Tolerance, Not Target | PASS | Model uses `defaultLowerBound`/`defaultUpperBound`; no `expectedValue` introduced. |
| III. Three-Valued Measure Status | PASS | `MeasureStatus` enum declared here with `*_LABELS`/`*_COLORS`/`*_ICONS`; reused by Phase 002. |
| IV. Guarded Transitions | N/A | No ticket-status transitions in this phase. |
| V. Traceability From Log to Verdict | N/A | No measure data created here; only templates. |
| VI. DTO / Entity Separation & Mirroring | PASS | Frontend models mirror backend response DTOs 1:1; no field renames. |
| VII. Real-Log Test Fixtures | N/A | No parser in this phase. |
| VIII. Backward Compatibility | N/A | New feature; nothing deprecated. |
| IX. Auditability of Overrides | N/A | No verdicts in this phase. |
| X. No Premature AI Integration | PASS | Zero AI calls. |
| XI. Frontend Stack Consistency | PASS | NgModule-based, declared in `app.module.ts`; PrimeNG via shared module; `lara-dark-blue`; `--sage-*` tokens; DM Sans/JetBrains Mono; `app` prefix. |
| XII. Role-Gated UI | PASS | Route declares `data: { roles: ['ADMIN_IT', 'CHEF_SECTEUR'] }`; sidebar entry + mutating buttons hidden for other roles; roles imported from `shared/enums/role.enum.ts`. |

**Result**: PASS, no deviations. Complexity Tracking section empty.

## Project Structure

### Documentation (this feature)

```text
specs/001-poste-catalog-ui/
├── spec.md
├── plan.md                    # this file
├── research.md                # Phase 0 output
├── data-model.md              # Phase 1 output
├── contracts/
│   └── poste-catalog-api.md   # frozen backend contract this feature consumes
├── quickstart.md              # how to run/verify the page locally
└── checklists/
    └── requirements.md
```

### Source Code (frontend repo)

Repo root: `sageline-frontend/`. New files (in the frontend project, **not** under
`spec-RealMesure/`):

```text
src/app/
├── pages/
│   └── admin/
│       └── poste-catalog/                     # new
│           ├── poste-catalog-list/            # main page
│           ├── poste-catalog-form/            # create/edit dialog component
│           └── poste-catalog-bulk-import/     # bulk-import dialog component
├── services/
│   ├── poste-catalog.service.ts               # new
│   └── poste-catalog.service.spec.ts          # smoke HTTP wiring only
├── models/
│   └── poste-measure-catalog.model.ts         # new (types + request DTOs)
├── shared/
│   ├── enums/
│   │   ├── measure-category.enum.ts           # new (type + LABELS + COLORS + ICONS)
│   │   └── measure-status.enum.ts             # new (type + LABELS + COLORS + ICONS)
│   └── components/
│       └── measure-badge/                     # new shared chip
├── app.module.ts                              # add 4 new declarations
└── app-routing.module.ts                      # add 1 new route
```

Sidebar entry: one new item under the existing "Administration" group, role-gated to
`ADMIN_IT` + `CHEF_SECTEUR`.

**Structure Decision**: Mirrors the existing `pages/admin/lines/` layout (list / form
sub-components). Lowercase `admin` matches the actual filesystem casing (spec.md said `Admin/` —
corrected here). No feature module; flat declarations in `app.module.ts` per constitution XI.

## Phase 0 — Research

See [research.md](./research.md). All open questions resolved during `/speckit-clarify`; this
phase has zero NEEDS CLARIFICATION markers.

## Phase 1 — Design & Contracts

See [data-model.md](./data-model.md), [contracts/poste-catalog-api.md](./contracts/poste-catalog-api.md),
and [quickstart.md](./quickstart.md).

## Post-Design Constitution Re-check

| Principle | Status | Notes |
|---|---|---|
| VI (Mirroring) | PASS | `data-model.md` field list = backend response DTO field list (verified against `contracts/poste-catalog-api.md`). |
| XI (Stack) | PASS | `quickstart.md` shows only existing dependencies; no new package install steps. |
| XII (Role gating) | PASS | Contracts doc + data-model both anchor on the agreed `ADMIN_IT`/`CHEF_SECTEUR` role set, matching the routing entry plan. |
| Others | Unchanged from pre-design check. | |

**Result**: PASS — proceed to `/speckit-tasks`.

## Complexity Tracking

> No constitution deviations. Section intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| — | — | — |
