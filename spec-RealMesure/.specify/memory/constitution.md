<!--
SYNC IMPACT REPORT
==================
Version change: 0.0.0 (template) → 1.0.0
Bump rationale: MAJOR — first ratified constitution; template placeholders replaced with
concrete, binding principles for the SageLine RealMesure refactor (frontend track).

Modified principles: N/A (initial ratification)
Added principles (12):
  I.    Industrial Fidelity
  II.   Bounded Tolerance, Not Target
  III.  Three-Valued Measure Status
  IV.   Guarded Transitions
  V.    Traceability From Log to Verdict
  VI.   DTO / Entity Separation & Model Mirroring
  VII.  Real-Log Test Fixtures
  VIII. Backward Compatibility During Refactor
  IX.   Auditability of Overrides
  X.    No Premature AI Integration
  XI.   Frontend Stack Consistency
  XII.  Role-Gated UI

Added sections:
  - Additional Constraints (Frontend Architecture & Conventions)
  - Development Workflow & Quality Gates
  - Governance

Removed sections: none

Templates requiring updates:
  ✅ .specify/templates/plan-template.md     — Constitution Check gate placeholder is generic; no edits required (gates resolved at /speckit-plan time against this file).
  ✅ .specify/templates/spec-template.md     — Reviewed; no constitution-driven mandatory section added/removed.
  ✅ .specify/templates/tasks-template.md    — Reviewed; existing task categorization (contract / integration / unit / polish) is compatible with principles III, IV, V, VII.
  ✅ .specify/templates/checklist-template.md — Reviewed; no rewrite needed.
  ✅ CLAUDE.md (frontend root)               — Already encodes stack conventions referenced by Principle XI / XII; no edits required.
  ⚠  spec-RealMesure/CLAUDE.md               — Stub only; consider linking to this constitution in a future patch (non-blocking).

Follow-up TODOs: none deferred.
-->

# SageLine RealMesure Constitution

This constitution governs the **SageLine RealMesure refactor** — the 6-phase, full-stack realignment
of the SageLine validation platform with real Sagemcom production-line measurements. It binds the
Angular 17 frontend track in this repository and is the contract every phase's `plan.md` must satisfy
under its `Constitution Check` gate. Deviations are not implicit: they MUST be enumerated and
justified in the deviating phase's plan.

## Core Principles

### I. Industrial Fidelity
All measure nomenclature, tolerance semantics, status vocabulary, and workflow rules MUST mirror the
conventions observed in real Sagemcom production logs (`MES_*`, `M_*`, `POWER_*` codes; Status 0/1/2;
bench/poste taxonomy). Invented domain terms are PROHIBITED. When the real domain is ambiguous, the
phase spec MUST cite the source log file (path + line) before introducing terminology.

### II. Bounded Tolerance, Not Target
Measures MUST be validated against `[lowerBound, upperBound]` with an explicit unit. The legacy
single `expectedValue` field is deprecated; new components and new API consumers MUST NOT read it.
Frontend rendering MUST show the bounded range whenever the measured value is shown.

### III. Three-Valued Measure Status (NON-NEGOTIABLE)
Every measure carries `MeasureStatus ∈ {OK, OUT_OF_RANGE, NOT_EXECUTED}` aligned with Sagemcom's
Status 0/1/2. A boolean `conform` MUST NOT be reintroduced in any new model, DTO, badge, filter, or
KPI aggregation. Visual encoding (color, icon, label) for the three values MUST be centralized in
the shared enums module (`src/app/shared/enums/`) — no ad-hoc inline mappings in components.

### IV. Guarded Transitions
No ticket-status transition exists without an explicit, tested business rule encoded in a transition
guard. Frontend transition buttons MUST surface the guard's verdict (allowed / blocked + reason)
before the user clicks; a 4xx from the backend on transition is a UX bug, not an expected path.

### V. Traceability From Log to Verdict
Every `ValidationMeasure` MUST be traceable back to its source: either the imported log file
identifier (path + line range) or the operator user-id who entered it manually. The ticket detail UI
MUST expose this provenance at the per-measure level (tooltip or expand row); it is not optional
metadata.

### VI. DTO / Entity Separation & Model Mirroring
JPA entities are never exposed in REST. Backend request/response DTOs live under
`dtos/request/` and `dtos/response/` with mappers in `mappers/`. Frontend models in
`src/app/models/` MUST mirror response DTOs one-to-one — same field names, same nullability, no
field renames "for ergonomics." If a field is uncomfortable on the frontend, the fix is a backend
DTO change, not a divergent frontend type.

### VII. Real-Log Test Fixtures
The three supervisor-provided Sagemcom logs (TEST_BNFT decoder, ATR_TEST_WIFI_CONDUIT gateway,
TEST_BTF gateway) MUST live under `src/test/resources/fixtures/sagemcom-logs/` on the backend and
drive importer/parser integration tests. Frontend e2e or contract tests that exercise the import
flow MUST consume the same fixtures (via backend mock or fixture-served file) — no hand-fabricated
mini-logs.

### VIII. Backward Compatibility During Refactor
Phase 002 deprecates the legacy `ValidationResult` API. Deprecated endpoints MUST continue to
respond (with `Deprecation` HTTP header) for **at least one phase** before removal. The frontend
MUST ship a thin compatibility shim that calls the new endpoints first and falls back to the legacy
ones only on 404. Removal of the shim is its own dated task, not an opportunistic cleanup.

### IX. Auditability of Overrides
Whenever a human verdict differs from the computed verdict, the override MUST be persisted with
operator identity, ISO-8601 timestamp, and a non-empty free-text justification. The frontend MUST
always display **both** the computed and the final verdict side-by-side wherever a verdict is shown
(detail view, list cells, KPI drill-downs). Hiding the computed value once overridden is a
violation.

### X. No Premature AI Integration
AI pillars (semantic memory, forecasting, RAG, agent) are OUT OF SCOPE for this refactor. The data
model and UI MUST, however, be AI-ready: codes, units, and contexts are explicit; the ticket detail
page reserves placeholder slots (e.g., risk badge area) so pillars 1–4 can later plug in without
schema or layout rewrites. Adding any AI call, prompt, or model dependency during phases 001–006 is
a violation.

### XI. Frontend Stack Consistency
All new components MUST be NgModule-based (`standalone: false`), declared in `app.module.ts`, and:
- import PrimeNG exclusively via `src/app/shared/primeng/primeng.module.ts`;
- use the `lara-dark-blue` PrimeNG theme;
- consume the `--sage-*` CSS variables for color/spacing tokens;
- use DM Sans (UI) and JetBrains Mono (monospace) — no new font;
- use the `app` component selector prefix.

Introducing a new UI library, a standalone component, a second theme, or a parallel design-token
system is a violation. Feature modules are also PROHIBITED for this refactor — the flat module
structure stays.

### XII. Role-Gated UI
Every new route MUST declare `data: { roles: [...] }` and be protected by `AuthGuard`. Every
destructive or status-changing action (transition, delete, override, import, reassign) MUST be
**hidden** (not just disabled) for users without the required role — disabled-but-visible leaks
domain capability to unauthorized users. Roles MUST come from
`src/app/shared/enums/role.ts`; string literals in route data are a violation.

## Additional Constraints — Frontend Architecture & Conventions

- **Auth.** Keycloak via `keycloak-angular`; JWT auto-attached except `/assets` and `/login`. The
  current DB user-id is read from `localStorage.sageline_user_id` (populated by `syncCurrentUser()`).
  New code MUST NOT reimplement user-id retrieval.
- **HTTP.** All services extend the pattern in `src/app/services/` (single `HttpClient`,
  `environment.apiUrl` base). No `fetch`, no second HTTP client.
- **Realtime.** STOMP-over-SockJS via `WebSocketService` (`/ws`, user queue
  `/user/{userId}/queue/tickets`). New realtime channels MUST go through `webSocketService.subscribe`
  — duplicate clients are PROHIBITED.
- **Status / priority display.** Every status or priority enum has a companion `*_LABELS`,
  `*_COLORS`, and (where applicable) `*_ICONS` map under `src/app/shared/enums/`. Templates MUST
  read from those maps; inline `ngSwitch` color tables are a violation.
- **Shared UI primitives.** Reuse `StatCard`, `StatusBadge`, `TicketStatusBadge`, `PriorityBadge`,
  `RiskBadge`, `AssignmentPanel`, `TicketTimeline` before authoring new equivalents.

## Development Workflow & Quality Gates

1. **Phase entry.** Each phase MUST publish a `spec.md` under
   `specs/<NNN>-<slug>/` that names the involved principles in its `Constitution Check` block.
   Frontend track begins only when the backend track of the same phase is contract-stable (DTOs and
   endpoints frozen and committed).
2. **Pre-implementation gate.** `plan.md` `Constitution Check` MUST be filled with explicit
   PASS / DEVIATION entries against every principle in this document. DEVIATION entries require a
   row in `Complexity Tracking` of that plan.
3. **Testing discipline.** Workflow-guard, importer, parser, and conformity logic require
   integration tests fed by the real-log fixtures (Principle VII). UI verdict rendering MUST have a
   component test asserting that computed + final verdicts are both rendered (Principle IX).
4. **Review.** PRs MUST reference the phase id and list the principle ids they touch. Reviewers
   block on any principle violation not pre-approved as a `Complexity Tracking` entry.
5. **Manual UI verification.** For any frontend change altering a ticket detail, KPI dashboard, or
   import flow, the author MUST run `ng serve` and walk the golden path + at least one error path
   before requesting review.

## Governance

This constitution supersedes ad-hoc conventions in commit messages, PR descriptions, and oral
agreements. In a conflict between this file and any other guidance (CLAUDE.md, README, prior
phase plans), this file wins until amended.

**Amendment procedure.**
1. Proposed amendment opens as a PR that edits only `.specify/memory/constitution.md`.
2. The PR description states the version bump (MAJOR / MINOR / PATCH) and the rationale.
3. On merge, the author MUST update every phase plan whose `Constitution Check` references the
   changed principle, and update dependent templates listed in the Sync Impact Report.

**Versioning policy.** Semantic versioning of governance:
- **MAJOR** — backward-incompatible principle removal or redefinition; renumbering of principles.
- **MINOR** — new principle or materially expanded section.
- **PATCH** — clarifications, wording, typo fixes, non-semantic refinements.

**Compliance review.** Every `/speckit-plan` invocation re-reads this file and gates on it. Every
`/speckit-analyze` run reports principle-level findings. Drift detected outside those gates is a
bug; open an issue tagged `constitution-drift`.

**Runtime guidance.** Day-to-day frontend conventions (commands, routing table, role matrix,
service inventory) live in the root `CLAUDE.md`; this constitution does not duplicate them — it
binds them.

**Version**: 1.0.0 | **Ratified**: 2026-05-13 | **Last Amended**: 2026-05-13
