import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './auth/auth.guard';

import { LayoutComponent } from './layout/layout.component';
import { LoginComponent } from './pages/login/login.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { UserListComponent } from './pages/admin/users/user-list/user-list.component';
import { LineListComponent } from './pages/admin/lines/line-list/line-list.component';
import { LineMapComponent } from './pages/admin/lines/line-map/line-map.component';
import { ZoneListComponent } from './pages/admin/zones/zone-list/zone-list.component';
import { ZoneMapComponent } from './pages/admin/zones/zone-map/zone-map.component';
import { ValidationListComponent } from './pages/admin/validations/validation-list/validation-list.component';
import { ValidationCreateComponent } from './pages/admin/validations/validation-create/validation-create.component';
import { ValidationDetailComponent } from './pages/admin/validations/validation-detail/validation-detail.component';
import { ResultListComponent } from './pages/results/result-list/result-list.component';
import { KpiDashboardComponent } from './pages/kpis/kpi-dashboard/kpi-dashboard.component';
import { AiDashboardComponent } from './pages/intelligence/ai-dashboard/ai-dashboard.component';
import { AccessDeniedComponent } from './pages/access-denied/access-denied.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },

  {
    path: '',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },

      // Admin
      { path: 'admin/users', component: UserListComponent, data: { roles: ['ADMIN_IT'] } },
      { path: 'admin/lines', component: LineListComponent, data: { roles: ['ADMIN_IT', 'CHEF_SECTEUR'] } },
      { path: 'admin/lines/map', component: LineMapComponent, data: { roles: ['ADMIN_IT', 'CHEF_SECTEUR'] } },
      { path: 'admin/zones', component: ZoneListComponent, data: { roles: ['ADMIN_IT', 'CHEF_SECTEUR'] } },
      { path: 'admin/zones/map', component: ZoneMapComponent, data: { roles: ['ADMIN_IT', 'CHEF_SECTEUR'] } },

      // Validations
      { path: 'validations', component: ValidationListComponent, data: { roles: ['ADMIN_IT', 'CHEF_SECTEUR', 'TECH_VAL', 'EXPERT', 'RESPONSABLE'] } },
      { path: 'validations/create', component: ValidationCreateComponent, data: { roles: ['ADMIN_IT', 'CHEF_SECTEUR', 'TECH_VAL'] } },
      { path: 'validations/:id', component: ValidationDetailComponent, data: { roles: ['ADMIN_IT', 'CHEF_SECTEUR', 'TECH_VAL', 'EXPERT', 'RESPONSABLE'] } },

      // Results (with PDF export)
      { path: 'results', component: ResultListComponent, data: { roles: ['ADMIN_IT', 'CHEF_SECTEUR', 'TECH_VAL', 'EXPERT'] } },

      // KPIs
      { path: 'kpis', component: KpiDashboardComponent, data: { roles: ['ADMIN_IT', 'CHEF_SECTEUR', 'EXPERT', 'RESPONSABLE'] } },

      // Intelligence IA
      { path: 'intelligence', component: AiDashboardComponent, data: { roles: ['ADMIN_IT', 'CHEF_SECTEUR', 'EXPERT'] } },

      { path: 'access-denied', component: AccessDeniedComponent },
    ],
  },

  { path: '**', redirectTo: 'login' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}