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
import { SecteurListComponent } from './pages/admin/secteurs/secteur-list/secteur-list.component';
import { PhaseListComponent } from './pages/admin/phases/phase-list/phase-list.component';
import { TicketListComponent } from './pages/Ticket/ticket-list/ticket-list.component';
import { TicketCreateComponent } from './pages/Ticket/ticket-create/ticket-create.component';
import { TicketDetailComponent } from './pages/Ticket/ticket-detail/ticket-detail.component';
import { WeekPlannerComponent } from './pages/Ticket/week-planner/week-planner.component';
import { PrepCheckComponent } from './pages/Ticket/prep-check/prep-check.component';
import { ResultListComponent } from './pages/results/result-list/result-list.component';
import { KpiDashboardComponent } from './pages/kpis/kpi-dashboard/kpi-dashboard.component';
import { AiDashboardComponent } from './pages/intelligence/ai-dashboard/ai-dashboard.component';
import { AccessDeniedComponent } from './pages/access-denied/access-denied.component';
import { MessagingPageComponent } from './messaging/messaging-page/messaging-page.component';
import { MesAffectationsComponent } from './pages/mes-affectations/mes-affectations.component';
import { HomeRedirectComponent } from './pages/home-redirect/home-redirect.component';
import { HandoverAcceptPanelComponent } from './pages/Handover/handover-accept-panel/handover-accept-panel.component';
import { HandoverQueuePanelComponent } from './pages/Handover/handover-queue-panel/handover-queue-panel.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },

  {
    path: '',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', component: HomeRedirectComponent, pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard],
        data: { roles: ['ADMIN_IT', 'CHEF_SECTEUR', 'EXPERT', 'RESPONSABLE'] } },

      // Admin
      { path: 'admin/users', component: UserListComponent, canActivate: [AuthGuard], data: { roles: ['ADMIN_IT'] } },
      { path: 'admin/lines', component: LineListComponent, canActivate: [AuthGuard], data: { roles: ['ADMIN_IT', 'CHEF_SECTEUR'] } },
      { path: 'admin/lines/map', component: LineMapComponent, canActivate: [AuthGuard], data: { roles: ['ADMIN_IT', 'CHEF_SECTEUR'] } },
      { path: 'admin/zones', component: ZoneListComponent, canActivate: [AuthGuard], data: { roles: ['ADMIN_IT', 'CHEF_SECTEUR'] } },
      { path: 'admin/zones/map', component: ZoneMapComponent, canActivate: [AuthGuard], data: { roles: ['ADMIN_IT', 'CHEF_SECTEUR'] } },

      // Secteurs + Phases
      { path: 'admin/secteurs', component: SecteurListComponent, canActivate: [AuthGuard], data: { roles: ['ADMIN_IT'] } },
      { path: 'admin/phases', component: PhaseListComponent, canActivate: [AuthGuard], data: { roles: ['ADMIN_IT'] } },

      // Tickets (replaces old Validations routes)
      { path: 'validations', component: TicketListComponent, canActivate: [AuthGuard],
        data: { roles: ['ADMIN_IT', 'CHEF_SECTEUR', 'EXPERT', 'TECH_VAL', 'TECH_PREP', 'RESPONSABLE'] } },
      { path: 'validations/create', component: TicketCreateComponent, canActivate: [AuthGuard],
        data: { roles: ['ADMIN_IT', 'CHEF_SECTEUR'] } },
      { path: 'validations/planner', component: WeekPlannerComponent, canActivate: [AuthGuard],
        data: { roles: ['ADMIN_IT', 'CHEF_SECTEUR'] } },
      { path: 'validations/:id', component: TicketDetailComponent, canActivate: [AuthGuard],
        data: { roles: ['ADMIN_IT', 'CHEF_SECTEUR', 'EXPERT', 'TECH_VAL', 'TECH_PREP', 'RESPONSABLE'] } },
      { path: 'validations/:id/prep', component: PrepCheckComponent, canActivate: [AuthGuard],
        data: { roles: ['ADMIN_IT', 'TECH_PREP'] } },
      { path: 'validations/:id/handover', component: HandoverAcceptPanelComponent, canActivate: [AuthGuard],
        data: { roles: ['TECH_VAL', 'CHEF_SECTEUR', 'ADMIN_IT'] } },

      // Handovers
      { path: 'handovers/queue', component: HandoverQueuePanelComponent, canActivate: [AuthGuard],
        data: { roles: ['CHEF_SECTEUR', 'ADMIN_IT'] } },

      // Results
      { path: 'results', component: ResultListComponent, canActivate: [AuthGuard],
        data: { roles: ['ADMIN_IT', 'CHEF_SECTEUR', 'EXPERT', 'TECH_VAL'] } },

      // KPIs
      { path: 'kpis', component: KpiDashboardComponent, canActivate: [AuthGuard],
        data: { roles: ['ADMIN_IT', 'CHEF_SECTEUR', 'EXPERT', 'RESPONSABLE'] } },

      // Intelligence IA
      { path: 'intelligence', component: AiDashboardComponent, canActivate: [AuthGuard],
        data: { roles: ['ADMIN_IT', 'CHEF_SECTEUR', 'EXPERT'] } },

      // Mes Affectations — for techs
      { path: 'mes-affectations', component: MesAffectationsComponent, canActivate: [AuthGuard],
        data: { roles: ['TECH_VAL', 'TECH_PREP', 'ADMIN_IT'] } },

      // Messaging
      { path: 'messaging', component: MessagingPageComponent, data: { breadcrumb: 'Messagerie' } },

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
