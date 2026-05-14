# Quickstart — Poste Catalog UI

**Feature**: 001-poste-catalog-ui — frontend track only.

## Prerequisites

- Backend (Spring Boot) running at `http://localhost:8089` with Phase 001 migrations applied
  (`PosteMeasureCatalog` table + seed data for `TEST_FONCTIONNEL`, `WIFI_CONDUIT`, `ACC`).
- Keycloak running at `http://localhost:8180`, realm `sageline`, client `sageline-frontend`,
  with at least one user in the `ADMIN_IT` role.
- Frontend dependencies already installed (`npm install` previously run).

No new dependencies for this phase.

## Run the frontend

From the frontend repo root (`sageline-frontend/`):

```bash
ng serve
```

Opens at `http://localhost:4200`. Log in with an `ADMIN_IT` user (Keycloak direct-access grant
via the existing login screen).

## Verify acceptance scenarios

1. **Browse (US 1).** Click the sidebar entry **Administration → Catalogue des postes**.
   - Default poste type selected from dropdown; table loads its measures sorted by
     `displayOrder`.
   - Switch the filter to `WIFI_CONDUIT`. Expect ≥ 16 rows.

2. **Create (US 2).** Click **Ajouter une mesure**.
   - Dialog opens. Pick `TEST_FONCTIONNEL`, fill code (e.g., `PWR0_2G_TEST`), label, category
     `POWER`, unit `dBm`, bounds `13.5 / 16.5`, mandatory `true`, displayOrder `99`.
   - Submit. Dialog closes, success toast, new row visible.
   - Re-submit the same code → field-level error, dialog stays open.

3. **Edit / soft-delete (US 3).** Click **Modifier** on a row, change `upperBound`, save. Then
   click **Supprimer** → confirm → row disappears. Toggle **Inclure inactifs** ON → row
   reappears with an "Inactif" marker.

4. **Bulk-import (US 4).** Click **Import groupé**.
   - Pick a poste type, paste a JSON array of 3 templates, submit.
   - Expect a per-row report (`✓ créé` / `✗ échec: <raison>`).

5. **Role gating.** Log out, log back in as a `TECH_VAL` user.
   - Sidebar entry must be hidden.
   - Pasting `http://localhost:4200/admin/poste-catalog` into the URL bar must redirect to
     `/access-denied`.

## What to look for in dev tools

- Network tab: only `/api/poste-catalog*` calls; no other endpoints touched by this page.
- `includeInactive=true` appears as a query string when the toggle is ON.
- HTTP `409` on duplicate-code attempts; payload's `field: "measureCode"` drives the inline error.

## Test command (smoke only)

```bash
ng test --include='**/poste-catalog.service.spec.ts'
```

This single spec exercises HTTP wiring (URL, method, body). Component-level UI tests are
deliberately deferred to Phase 002 per user direction.
