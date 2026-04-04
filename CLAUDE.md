# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sageline is an Angular 17 frontend for a production-line validation/quality management system (MES-style). It connects to a Spring Boot backend at `http://localhost:8089/api` (configured in `src/environments/environment.ts`). The app manages users, production lines, validation zones, and KPIs/dashboards.

## Commands

- **Dev server:** `ng serve` (serves at http://localhost:4200)
- **Build:** `npm run build` (output in `dist/sageline-frontend/`)
- **Run tests:** `npm test` (Karma + Jasmine)
- **Generate component:** `ng generate component path/component-name` (generates NgModule-based, SCSS-styled components)

## Architecture

- **Module system:** NgModule-based (`standalone: false` for all components, directives, pipes). New components must be declared in `app.module.ts` — there are no feature modules yet.
- **Routing:** `src/app/app-routing.module.ts` — all routes are children of `LayoutComponent` (sidebar + topbar shell). Routes: `dashboard`, `admin/users`, `admin/lines`, `admin/zones`.
- **Layout:** `src/app/layout/` contains `LayoutComponent` (shell with `<router-outlet>`), `SidebarComponent`, and `TopbarComponent`.
- **Pages:** `src/app/pages/` organized by domain — `dashboard/`, `admin/users/`, `admin/lines/`, `admin/zones/`. Each admin entity has a `*-list` component (table view) and a `*-form` component (dialog form).
- **Services:** `src/app/services/` — one service per backend entity (user, production-line, validation, validation-result, validation-zone, kpi). All use `HttpClient` with `environment.apiUrl` base URL.
- **Models:** `src/app/models/` — TypeScript interfaces matching backend DTOs (User/UserRequest, ProductionLine, Validation, ValidationResult, ValidationZone, KPI).
- **Enums:** `src/app/shared/enums/` — Role, ToolStatus, ValidationStatus. Role enum includes `ROLE_LABELS` and `ROLE_COLORS` maps for display.
- **PrimeNG barrel:** `src/app/shared/primeng/primeng.module.ts` — single module re-exporting all PrimeNG modules used in the app. Add new PrimeNG imports here.
- **Shared components:** `src/app/shared/components/` — reusable display components (StatCard, RiskBadge, StatusBadge).
- **Styling:** SCSS with global PrimeNG theme overrides in `src/styles.scss`. Uses `lara-dark-blue` PrimeNG theme. Custom CSS variables prefixed `--sage-*` defined on `:root`.
- **Component prefix:** `app` (enforced in `angular.json`).
- **Fonts:** DM Sans (UI text), JetBrains Mono (monospace).
- **Providers:** `MessageService` and `ConfirmationService` (PrimeNG) are provided at root module level for toast notifications and confirm dialogs.
