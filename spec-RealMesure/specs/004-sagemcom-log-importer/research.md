# Phase 0 — Research: Sagemcom Log Importer (Frontend)

**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-05-15

All decisions below were reached against the spec + clarifications session of 2026-05-15. No `NEEDS CLARIFICATION` markers remain in the spec or plan.

---

## R-001 — PrimeNG primitive for the import dialog shell

- **Decision**: Use `p-dialog` (modal, `[draggable]="false"`, `[resizable]="false"`, width `min(720px, 92vw)`) hosting a flex column with three logical regions: file-drop region, preview region, footer-action region.
- **Rationale**: `p-dialog` is already imported via `src/app/shared/primeng/primeng.module.ts`, supports the `[(visible)]` two-way binding the parent ticket-detail page already uses for other dialogs, and inherits the `lara-dark-blue` theme without extra styling.
- **Alternatives considered**:
  - `p-sidebar` — wider real estate but breaks the established "modal-confirm" UX used elsewhere in Ticket pages; rejected.
  - Full-page route — overkill for a 30-second demo flow; rejected as it would also force a new route (Constitution XI prohibition).

## R-002 — PrimeNG primitive for the drag-drop region

- **Decision**: Use `p-fileUpload` in **custom mode** (`mode="basic"` + `[customUpload]="true"` + `chooseLabel`) with `accept=".log,.txt"` and `[maxFileSize]="10 * 1024 * 1024"`. Bind to its `(uploadHandler)` event so we control the multipart submission ourselves (we call `previewLog` first, not `importLog`).
- **Rationale**: Built-in client-side size + extension validation, free drag-drop, no second dependency. `customUpload` lets us call our own service method instead of the component's HTTP path so we keep one `HttpClient` (Constitution: "no second HTTP client").
- **Alternatives considered**:
  - Plain `<input type="file">` + manual `dragover`/`drop` listeners — works but reinvents validation UX; rejected.
  - `p-fileUpload` in `advanced` mode — keeps an internal queue with multi-file UX we don't need (we only accept one file at a time); rejected.

## R-003 — Holding the file in memory for "Re-preview"

- **Decision**: Store the `File` reference on a private component property `private droppedFile: File | null = null` set in `(uploadHandler)` and cleared on dialog close. "Re-preview" re-runs `previewLog` against the same `File` reference — no re-read, no second drag-drop.
- **Rationale**: Native `File` is already a `Blob` and can be re-submitted to `previewLog` as many times as needed within the dialog lifetime. The browser holds the bytes; we hold the reference.
- **Alternatives considered**:
  - Re-reading via `FileReader` and storing the bytes ourselves — wasteful (doubles memory) and pointless because `File` survives.
  - Forcing the user to re-drop — bad UX during the demo if they just created a missing catalog entry in a new tab and need to verify.

## R-004 — Multipart body shape for `previewLog` / `importLog`

- **Decision**: Both methods build a `FormData` with a single part named `file`: `formData.append('file', file, file.name)`. Set NO `Content-Type` header explicitly — let the browser set the `multipart/form-data; boundary=...` value. Backend reads the part with `@RequestPart("file")`.
- **Rationale**: This is the canonical Angular `HttpClient` + Spring `@RequestPart` integration; auto-attached JWT (via Keycloak interceptor) remains unaffected.
- **Alternatives considered**:
  - Base64-encoded JSON body — bloats payload ~33% and forces backend to allocate twice; rejected.
  - Streaming via `fetch` — second HTTP client; violates Constitution.

## R-005 — Refresh wiring between dialog and ticket-detail children

- **Decision**: `LogImportDialog` declares an `@Output() importSucceeded = new EventEmitter<number[]>()` (array of persisted measure IDs). `TicketDetailComponent` template binds `(importSucceeded)="onImportSucceeded($event)"`; the handler calls `this.measurePanel.reload()` and `this.workflowReadinessBar.reload()` via `@ViewChild` references. Confirmed by Q4 of 2026-05-15 clarifications.
- **Rationale**: Mirrors the parent-driven reload pattern already used between `TicketDetailComponent` and `AssignmentPanel`. No new shared state, no RxJS subject, no full reload.
- **Alternatives considered**:
  - Shared `BehaviorSubject` in `TicketService` — overkill for a single parent/child interaction; rejected.
  - Full-page navigation — heavy; rejected.

## R-006 — Paperclip column placement in MeasurePanel

- **Decision**: Add a narrow 32px-wide leading column (before `measureCode`) in the existing `<p-table>` of `MeasurePanel`. Cell renders `<i class="pi pi-paperclip">` wrapped in a `<button class="p-button-text">` only when `row.sourceLogFile != null`. `[pTooltip]="row.sourceLogFile"` shows the filename. Click opens `LogSourceDialog` with `measureId` + `ticketId`.
- **Rationale**: Constitution XI requires reusing PrimeNG primitives; `pi-paperclip` is part of `primeicons`. A leading column avoids interfering with the existing actions column on the right.
- **Alternatives considered**:
  - Inline icon next to `measureCode` — clutters the code column which is already monospace-aligned; rejected.
  - Row-expand panel with the snippet — too heavy; dialog gives a clearer focused view and matches the existing pattern for log-source.

## R-007 — Source snippet rendering

- **Decision**: `LogSourceDialog` renders the snippet in a `<pre class="log-snippet">` with `font-family: var(--sage-font-mono, 'JetBrains Mono')`, `white-space: pre`, `overflow-x: auto`, max-height `60vh`, scrollable. Filename rendered in the dialog header. If the backend returns `lineRange`, it is displayed as `"lines 42–58"` in a subtitle.
- **Rationale**: Faithful raw display, no syntax-coloring tricks, defendable in front of a jury (Principle V).
- **Alternatives considered**:
  - Syntax-highlighted via a Prism/Highlight.js plugin — new dependency, violates Constitution XI; rejected.

## R-008 — Detected-format chip

- **Decision**: Use `p-tag` with `severity="info"` and `value="Detected format: {{ report.detectedFormat }}"`. Placed at the top-left of the preview region, next to a `totalParsed` counter chip.
- **Rationale**: `p-tag` is already imported; matches the visual language of other status chips in the app.

## R-009 — Pulse animation on the import button when ticket has zero measures

- **Decision**: Define a `@keyframes sageline-pulse-ring` rule scoped inside `ticket-detail.component.scss`, applied via a `[class.pulse]="measures.length === 0"` host binding on the import button. Pulse uses the existing `--sage-accent` token for color; 1.6 s ease-in-out, infinite, opacity 0→0.4→0 on a pseudo-element ring so the button text remains stable.
- **Rationale**: Pure SCSS, no animation library (Constitution XI). The pulse is **visual hint** for the demo (SC visibility); it does not change behavior.
- **Alternatives considered**:
  - `@angular/animations` BrowserAnimationsModule trigger — heavier and requires a module import; rejected for a one-off hint.

## R-010 — Empty-state handling in accordion sections

- **Decision**: When `matched.length === 0`, the **Matched** accordion still renders (so the count badge "0" is visible) but its body shows an inline empty hint "No matchable measures in this log". When `skipped.length === 0`, the Skipped accordion is **omitted entirely** from the DOM (not just collapsed) per spec FR-007. When `warnings.length === 0`, the Warnings accordion still renders with badge "0" but body shows "No warnings".
- **Rationale**: Skipped is conditional information ("no conflicts" is the silent default); Matched + Warnings are structural sections that should always show their count for legibility.

## R-011 — Re-preview button visibility and label

- **Decision**: Render the "Re-preview" button in the dialog footer **left side** (separate from the "Confirm import" primary on the right) whenever `unmatched.length > 0`. Label: "Re-preview after fixes". On click, disable both footer buttons, show inline spinner, call `previewLog(ticketId, this.droppedFile)`, swap the report on response.
- **Rationale**: Aligns the action with the user mental model — "I added a catalog entry, now re-check this log". Hiding it when there are no unmatched avoids visual noise.

## R-012 — File type rejection messaging

- **Decision**: PrimeNG's `p-fileUpload` `onSelect` returns the chosen files; we validate `accept` and `maxFileSize` ourselves to control the message wording. Bad-type inline message: `"ZIP not supported — drop a .log or .txt file"` if extension is `.zip`; `"Unsupported file type — drop a .log or .txt file"` otherwise. Oversized: `"File too large (max 10 MB)"`. Messages are surfaced under the drop region via PrimeNG `p-message` (severity `error`), not as a toast (no transient toasts before a backend call).
- **Rationale**: Inline messages are more discoverable than toasts during an active drop interaction; matches existing patterns in `ValidationMeasure` add-row forms.

## R-013 — Toast messages for backend outcomes

- **Decision**: Use the existing app-wide `<p-toast position="top-right">` host. Success toast on `importLog`: severity `success`, summary "Import completed", detail `"{n} measures created from {filename}"`. Backend parse error: severity `error`, summary "Parse failed", detail backend's `message`. Network failure: severity `error`, summary "Network error", detail "Could not reach the importer service".
- **Rationale**: Reuses the existing `MessageService` configured in `app.module.ts`; identical to other dialogs.

## R-014 — Karma fixture JSON capture discipline

- **Decision**: The three fixtures (`bnft-report.fixture.json`, `bwc-report.fixture.json`, `btf-report.fixture.json`) are **byte-for-byte captures** of `POST /api/validations/{id}/preview-log` responses against the real supervisor logs. A short `README.md` under `__fixtures__/` records the source log filename, capture date, and the curl command used. Frontend tests assert exact counts (`matched.length`, `unmatched.length`, etc.) so a backend contract drift is caught immediately.
- **Rationale**: Constitution VII demands real-log driven testing for the importer; this is the frontend analogue. Hand-fabricated mini-reports are explicitly disallowed.

## R-015 — Disabled-state logic for the import button

- **Decision**: Button is **hidden** for roles outside `{TECH_VAL, TECH_PREP, ADMIN_IT}`. For authorized roles, the button is **visible** but **disabled with tooltip** when `ticket.status ∈ {CONFORME, NON_CONFORME, ANNULE}`. Tooltip text: `"Ticket is closed — no edits allowed"`.
- **Rationale**: Distinguishes "you can't see this capability" (role) from "you can see it but the workflow forbids it now" (status). Authorized users get feedback about *why* the action is unavailable, which matches Constitution IV's guarded-transition mindset.

---

**Status**: All design decisions resolved. Proceeding to Phase 1 artifacts.
