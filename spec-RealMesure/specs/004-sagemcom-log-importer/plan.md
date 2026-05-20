# Implementation Plan: Sagemcom Log Importer — Frontend

**Branch**: `004-sagemcom-log-importer` | **Date**: 2026-05-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/004-sagemcom-log-importer/spec.md`

## Summary

Deliver the Angular 17 frontend for **Phase 004 — Sagemcom Log Importer** (backend track handled in the sibling Spring Boot project). The dialog is the defense-demo highlight: a `TECH_VAL` / `TECH_PREP` / `ADMIN_IT` user drag-drops a `.log` or `.txt` Sagemcom log into a ticket, the dialog calls `previewLog` (multipart, dry-run), renders four accordions (**Matched**, **Skipped (already present)**, **Unmatched**, **Warnings**) with a detected-format chip, then calls `importLog` on confirm. On success the dialog emits `(importSucceeded)` and the ticket-detail page calls `reload()` on its `MeasurePanel` and `WorkflowReadinessBar` child references — the same parent-driven reload pattern already used elsewhere in the app (no new global store, no RxJS subject, no full-page reload). Each imported measure in `MeasurePanel` gains a paperclip icon (`sourceLogFile`); clicking it opens a new `LogSourceDialog` showing the original filename and the snippet returned by the backend. Strict reuse of `ValidationMeasureService`, `MeasurePanel`, `WorkflowReadinessBar` (Phase 003), the existing PrimeNG module, and the existing app shell. No new dependencies, no new feature module, no new routes. ZIP is out of scope; client-side cap is 10 MB.

## Technical Context

**Language/Version**: TypeScript ~5.4 on Angular 17.3 (NgModule mode, `standalone: false`).
**Primary Dependencies**: `primeng@17.18` (`FileUpload`, `Dialog`, `Accordion`, `Table`, `Button`, `Toast`, `Tooltip`, `Skeleton`, `Badge`, `Tag`), `primeicons@7`, `primeflex@4`, `keycloak-angular@15`, RxJS ~7.8. No new dependencies.
**Storage**: N/A on the frontend. The file is held only in component memory during the preview→confirm lifecycle (so "Re-preview" can re-call without re-dropping). The backend persists the file and the matched measures; nothing is cached on the client.
**Testing**: Karma + Jasmine. Mandatory coverage: (a) `ValidationMeasureService.previewLog` and `importLog` — correct URL, multipart body, error propagation; (b) `LogImportDialog` for the three fixture formats (BNFT, BWC, BTF) using mocked HTTP, asserting matched / skipped / unmatched / warning counts and the confirm flow; (c) `LogImportDialog` rejects non-`.log`/`.txt` files and files >10 MB **before** any HTTP call; (d) `LogImportDialog` emits `(importSucceeded)` exactly once on a successful `importLog`; (e) `MeasurePanel` paperclip visibility wired to `sourceLogFile != null`; (f) `LogSourceDialog` renders snippet in monospace and surfaces error states. HTTP spec uses `HttpClientTestingModule`.
**Target Platform**: Modern evergreen browsers (Chrome / Edge / Firefox) — existing app support matrix.
**Project Type**: Web frontend — Angular SPA, talks to Spring Boot `http://localhost:8089/api`.
**Performance Goals**: End-to-end demo flow (drop → preview → confirm → MeasurePanel + readiness bar refreshed) **≤ 30 s** on local backend (SC-001). Source-snippet dialog opens **≤ 1 s** after click (SC-004). Corrupted-file error toast surfaces **≤ 2 s** (SC-007). `previewLog` against a 1 MB BWC fixture renders the preview in **≤ 1.5 s** on local backend (P0 budget for the demo). Re-preview without re-drop reuses the in-memory `File` reference (no second `FileReader` read).
**Constraints**: Reuse existing app shell (`LayoutComponent`). Reuse centralized PrimeNG module (`src/app/shared/primeng/primeng.module.ts`). Reuse `lara-dark-blue` theme, `--sage-*` tokens, DM Sans / JetBrains Mono fonts, `app` selector prefix. No new dependencies. No standalone components. No new feature modules. No new routes. Client-side enforcement of: extension (`.log` / `.txt`), max size (10 MB). Re-preview re-uses the in-memory file (no re-drop required). The dialog never persists conflicting measures (Skipped section is informational; backend honors skip-on-conflict). `MeasurePanel` reload is invoked **only by the ticket-detail page**, not by the dialog directly — preserves single-source-of-truth ownership. Role gating is enforced by **hiding** the import button (not just disabling) per Constitution XII.
**Scale/Scope**: 4 new model files, 1 service extension (3 new methods on `ValidationMeasureService`), 1 new `LogImportDialog` component (4 files), 1 new `LogSourceDialog` component (4 files), ~3 modified files on `TicketDetailComponent` (TS + HTML + spec), ~2 modified files on `MeasurePanel` (HTML + spec) for the paperclip column, `app.module.ts` declarations expanded by 2, ~50–80 LOC SCSS for the pulse animation and accordion theming. Estimated ~1100–1400 LOC including templates and specs. Three Karma fixture JSON files (`bnft-report.fixture.json`, `bwc-report.fixture.json`, `btf-report.fixture.json`) under `src/app/pages/Ticket/log-import-dialog/__fixtures__/`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

Constitution: `.specify/memory/constitution.md` — v1.0.0.

| Principle | Status | Evidence / Notes |
|---|---|---|
| I. Industrial Fidelity | PASS | All measure codes shown in the preview (matched / skipped / unmatched) originate from the backend parser, which is itself driven by the Phase 001 catalog seeded from real supervisor logs. The frontend invents no codes, units, or status vocabulary. Detected-format chip values come from the backend (`BNFT` / `BWC` / `BTF`). |
| II. Bounded Tolerance, Not Target | PASS | Matched rows render `value`, `unit`, `[lower, upper]`, and computed status. The frontend never reads or shows a legacy `expectedValue`. |
| III. Three-Valued Measure Status | PASS | Matched-table status column reuses the existing `MeasureStatusBadge` (`OK` / `OUT_OF_RANGE` / `NOT_EXECUTED`). No boolean `conform` is introduced. The skipped section shows the **existing** measure's status pulled from the current `MeasurePanel` rows (not recomputed client-side). |
| IV. Guarded Transitions | PASS (indirect) | The importer mutates measures, not status. After import succeeds, the dialog event triggers `WorkflowReadinessBar.reload()`; the Phase 003 guard then governs the next transition. Confirm-import never bypasses the workflow guard. |
| V. Traceability From Log to Verdict | PASS (centerpiece) | This phase **delivers** the log-side of principle V: each imported `ValidationMeasure` carries `sourceLogFile`; `MeasurePanel` renders a paperclip icon; `LogSourceDialog` exposes the raw source snippet for the measure. Manual entries continue to expose "entered by" tooltip (unchanged from Phase 002). |
| VI. DTO / Entity Separation & Mirroring | PASS | `log-import-report.model.ts`, `matched-measure.model.ts`, `unmatched-measure.model.ts`, `skipped-measure.model.ts`, and `log-source-snippet.model.ts` each mirror the backend `LogImportReportDTO` / `MatchedMeasureDTO` / `UnmatchedMeasureDTO` / `SkippedMeasureDTO` / `LogSourceSnippetDTO` field-for-field. No renames. |
| VII. Real-Log Test Fixtures | PASS | Karma fixtures are JSON captures of the backend `LogImportReportDTO` produced from the three supervisor logs (`bnft-decoder-M393.txt`, `bwc-gateway-safran-wifi5g.log`, `btf-gateway-fb107-wifi7.log`). Frontend tests consume these captures rather than fabricating mini-reports — same provenance discipline as Principle VII demands on the backend side. |
| VIII. Backward Compatibility | N/A | This phase introduces net-new endpoints (`/preview-log`, `/import-log`, `/measures/{id}/source-snippet`). Nothing is being deprecated. |
| IX. Auditability of Overrides | N/A | Conformity verdict arrives in Phase 005. No verdict UI in this phase. |
| X. No Premature AI Integration | PASS | Zero AI calls. The dialog is a deterministic readout of the backend's parser report. |
| XI. Frontend Stack Consistency | PASS | All new components NgModule-based, declared in `app.module.ts`. PrimeNG imports via `shared/primeng/primeng.module.ts`. `lara-dark-blue` theme. `--sage-*` tokens. DM Sans / JetBrains Mono. `app` selector prefix. No new UI library. No standalone components. No feature modules. No new routes. Pulse animation is plain SCSS keyframes on the existing button — no animation library. |
| XII. Role-Gated UI | PASS | The "Import Sagemcom log" button is **hidden** (not just disabled) for users outside `TECH_VAL` / `TECH_PREP` / `ADMIN_IT`. Roles come from `src/app/shared/enums/role.ts`. The "Add to catalog" inline action on Unmatched rows is hidden for roles other than `ADMIN_IT` / `CHEF_SECTEUR`. The button transitions to a **disabled-with-tooltip** state only when the ticket status forbids edits (`CONFORME` / `NON_CONFORME` / `ANNULE`) — that is a workflow constraint, not a role constraint, so the button remains visible to authorized roles for transparency. |

**Result**: PASS, no deviations. Complexity Tracking section empty.

## Project Structure

### Documentation (this feature)

```text
specs/004-sagemcom-log-importer/
├── spec.md
├── plan.md                              # this file
├── research.md                          # Phase 0 output
├── data-model.md                        # Phase 1 output
├── contracts/
│   └── log-importer-api.md              # frozen backend contract this feature consumes
├── quickstart.md                        # how to run/verify the importer locally
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
│       │   ├── ticket-detail.component.ts          # MODIFIED — host import button, open dialog, handle (importSucceeded), call reload()
│       │   ├── ticket-detail.component.html        # MODIFIED — render <button> + pulse class, embed <app-log-import-dialog>
│       │   ├── ticket-detail.component.scss        # MODIFIED — pulse keyframes scoped to the import button
│       │   └── ticket-detail.component.spec.ts     # MODIFIED — assert button visibility per role + ticket status, event wiring
│       ├── measure-panel/
│       │   ├── measure-panel.component.html        # MODIFIED — add paperclip cell, click opens LogSourceDialog
│       │   ├── measure-panel.component.ts          # MODIFIED — manage LogSourceDialog open state
│       │   └── measure-panel.component.spec.ts     # MODIFIED — paperclip visibility wired to sourceLogFile
│       ├── log-import-dialog/                      # NEW
│       │   ├── log-import-dialog.component.ts
│       │   ├── log-import-dialog.component.html
│       │   ├── log-import-dialog.component.scss
│       │   ├── log-import-dialog.component.spec.ts
│       │   └── __fixtures__/
│       │       ├── bnft-report.fixture.json
│       │       ├── bwc-report.fixture.json
│       │       └── btf-report.fixture.json
│       └── log-source-dialog/                      # NEW
│           ├── log-source-dialog.component.ts
│           ├── log-source-dialog.component.html
│           ├── log-source-dialog.component.scss
│           └── log-source-dialog.component.spec.ts
├── services/
│   ├── validation-measure.service.ts               # MODIFIED — add previewLog, importLog, getSourceSnippet
│   └── validation-measure.service.spec.ts          # MODIFIED — cover the three new methods (multipart bodies, error paths)
├── models/
│   ├── log-import-report.model.ts                  # NEW — mirrors LogImportReportDTO
│   ├── matched-measure.model.ts                    # NEW — mirrors MatchedMeasureDTO
│   ├── unmatched-measure.model.ts                  # NEW — mirrors UnmatchedMeasureDTO
│   ├── skipped-measure.model.ts                    # NEW — mirrors SkippedMeasureDTO
│   └── log-source-snippet.model.ts                 # NEW — mirrors LogSourceSnippetDTO
├── app.module.ts                                   # MODIFIED — declare LogImportDialog + LogSourceDialog
└── app-routing.module.ts                           # UNCHANGED (no new route)
```

**Structure Decision**: Both new dialog components live under `pages/Ticket/` because they are conceptually tied to the ticket-detail page lifecycle and not (yet) reused elsewhere. The five new models live alongside existing model files in `src/app/models/`. No new shared component is created — the paperclip icon column is a lightweight HTML/SCSS addition to `MeasurePanel`, not a separate component (Constitution XI's "reuse shared primitives before authoring new equivalents"). No new feature module — flat declarations in `app.module.ts` per Constitution XI.

## Phase 0 — Research

See [research.md](./research.md). All clarifications from `/speckit-clarify` (session 2026-05-15) are encoded in the spec; the research notes resolve the remaining design decisions (PrimeNG primitive choices, drag-drop wiring, multipart body shape, re-preview file-retention strategy, paperclip column placement, pulse animation tokens, accordion empty-state handling). Zero `NEEDS CLARIFICATION` markers remain.

## Phase 1 — Design & Contracts

See [data-model.md](./data-model.md), [contracts/log-importer-api.md](./contracts/log-importer-api.md), and [quickstart.md](./quickstart.md).

Agent-context update: the `<!-- SPECKIT START -->` / `<!-- SPECKIT END -->` block in the frontend root `CLAUDE.md` is repointed at this plan.

## Post-Design Constitution Re-check

| Principle | Status | Notes |
|---|---|---|
| V (Traceability) | PASS | Contract enumerates the `sourceLogFile` field on every persisted measure and the dedicated source-snippet endpoint; data model reflects the same. `LogSourceDialog` is the visual surface. |
| VI (Mirroring) | PASS | All five new models match their DTOs field-for-field; data-model encodes nullability explicitly (`templateId?`, `lineRange?`). |
| VII (Real-log fixtures) | PASS | Karma fixtures are JSON captures of the backend report against the three real logs — discipline enforced via a one-page README in `__fixtures__/`. |
| XI (Stack) | PASS | quickstart.md shows only existing dependencies; no new package install steps. |
| XII (Role gating) | PASS | Contract makes role policy explicit; component spec assertions cover both the role-gated button visibility and the role-gated unmatched action. |
| Others | Unchanged from pre-design check. | |

**Result**: PASS — proceed to `/speckit-tasks`.

## Complexity Tracking

> No constitution deviations. Section intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| — | — | — |
