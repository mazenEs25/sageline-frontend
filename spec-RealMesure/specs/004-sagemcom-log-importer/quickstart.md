# Quickstart: Sagemcom Log Importer (Frontend)

**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Contract**: [contracts/log-importer-api.md](./contracts/log-importer-api.md) | **Date**: 2026-05-15

This is the local-verification recipe for Phase 004 frontend deliverables. Backend track must be running on `http://localhost:8089` with the importer endpoints from §1 of the contract document.

---

## Prerequisites

- Spring Boot backend running on `http://localhost:8089` with branch `004-log-importer` (importer endpoints live, three fixture logs available, Phase 001 catalog seeded).
- Keycloak running on `http://localhost:8180`, realm `sageline`, client `sageline-frontend`.
- Three real fixture logs on disk:
  - `bnft-decoder-M393.txt`
  - `bwc-gateway-safran-wifi5g.log`
  - `btf-gateway-fb107-wifi7.log`
- Frontend dependencies installed: `npm install` (no new dependencies introduced by Phase 004 — see `plan.md` Technical Context).

---

## Run

```powershell
cd C:\Users\mouaf\OneDrive\Bureau\stagePFE\PROJECT\Sageline\sageline-frontend
ng serve
```

Open `http://localhost:4200`. Log in as a user with role `TECH_VAL` (or `ADMIN_IT`).

---

## Golden path — the defense demo

1. Open any ticket in status `EN_COURS` whose `posteType` matches the fixture you intend to import:
   - `WIFI_CONDUIT` for `bwc-gateway-safran-wifi5g.log`
   - `TEST_BTF` for `btf-gateway-fb107-wifi7.log`
   - `TEST_BNFT` (or `TEST_FONCTIONNEL`) for `bnft-decoder-M393.txt`
2. Notice the **Import Sagemcom log** button next to the measure panel. If the ticket has zero measures, the button pulses.
3. Click the button. A modal `p-dialog` opens with a drag-drop zone.
4. Drag-drop `bwc-gateway-safran-wifi5g.log` into the zone.
5. A spinner appears briefly while `POST /api/validations/{id}/preview-log` is called.
6. The preview renders:
   - Header chip: `Detected format: BWC`
   - Counter chip: `Total parsed: 18`
   - Four accordions: **Matched** (≥16), **Skipped (already present)** (only if applicable — typically 0 on first run), **Unmatched** (0 on the canonical fixture), **Warnings** (may be ≥0).
7. Click **Confirm import**. The dialog calls `POST /api/validations/{id}/import-log`, closes on success with a green toast `Import completed — N measures created from bwc-gateway-safran-wifi5g.log`.
8. **Verify automatically**:
   - The `MeasurePanel` table now lists ≥16 rows.
   - The `WorkflowReadinessBar` updates without a manual page refresh.
   - Each imported row shows a paperclip icon at the start of the row.
9. Click the paperclip on any row. `LogSourceDialog` opens showing `bwc-gateway-safran-wifi5g.log` as the filename and the corresponding raw log snippet in monospace.

Expected end-to-end time: **under 30 seconds** (SC-001).

---

## Re-preview path (catalog gap recovery)

1. Open a ticket whose `posteType` is **NOT** seeded with the BWC catalog entries.
2. Drop `bwc-gateway-safran-wifi5g.log` — the preview reports `Unmatched: N` rows.
3. Click **Add to catalog** on any unmatched row (visible only as `ADMIN_IT` / `CHEF_SECTEUR`).
4. A new browser tab opens at the Phase 001 catalog-create form, pre-filled with `measureCode` and the ticket's `posteType`. Save the entry.
5. Return to the original tab — dialog is still open. Click **Re-preview after fixes**.
6. The unmatched count decreases by 1 (or matched count increases — same delta). No re-drop required.

---

## Skip-on-conflict path

1. Open a ticket that already has some imported measures.
2. Drop the same log file again.
3. Preview shows a **Skipped (already present)** accordion listing the overlapping codes with their existing value vs the incoming (discarded) value.
4. Click **Confirm import**. The toast detail shows only the genuinely new measures (often `0`) — no overwrite occurs.
5. Existing measure values in `MeasurePanel` are unchanged.

---

## Negative paths to verify

| Scenario | Expected behavior |
|---|---|
| Drop a `.zip` | Inline message under drop region: `ZIP not supported — drop a .log or .txt file`. No HTTP call. |
| Drop a `.pdf` | Inline message: `Unsupported file type — drop a .log or .txt file`. No HTTP call. |
| Drop a file >10 MB | Inline message: `File too large (max 10 MB)`. No HTTP call. |
| Drop an empty `.log` | Backend returns 400; toast: `Parse failed — <backend message>`. Dialog stays open. |
| Drop while backend is down | Toast: `Network error — could not reach the importer service`. Dialog stays open. |
| Log in as `EXPERT` only | Import button is **not rendered** in the DOM (hidden, not disabled). |
| Open a `CONFORME` ticket as `TECH_VAL` | Import button is **visible but disabled**; tooltip: `Ticket is closed — no edits allowed`. |
| Click a paperclip on a measure whose source log was deleted on the server | `LogSourceDialog` opens with error message: `Source log no longer available on the server`. |

---

## Tests

```powershell
ng test --include='**/log-import-dialog/**'
ng test --include='**/log-source-dialog/**'
ng test --include='**/validation-measure.service.spec.ts'
ng test --include='**/measure-panel/**'
ng test --include='**/ticket-detail/**'
```

Karma fixtures live under `src/app/pages/Ticket/log-import-dialog/__fixtures__/` and are byte-for-byte captures of the three supervisor logs (Constitution VII, research §R-014).

---

## Smoke checks before declaring "done"

- [ ] Drag-drop works in Chrome, Edge, Firefox.
- [ ] Pulse animation visible on empty-measure tickets, absent on populated ones.
- [ ] `MeasurePanel` paperclip column does not break the existing column alignment for measures without `sourceLogFile`.
- [ ] `LogSourceDialog` shows the snippet in monospace and supports horizontal scroll for long lines.
- [ ] No console errors during the golden-path flow.
- [ ] No new entries in `package.json` or `package-lock.json` (Constitution XI: no new deps).
- [ ] `ng build` produces no new warnings beyond the existing baseline.
