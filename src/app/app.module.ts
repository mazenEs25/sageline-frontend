import { NgModule,APP_INITIALIZER } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { SidebarComponent } from './layout/sidebar/sidebar.component';
import { TopbarComponent } from './layout/topbar/topbar.component';
import { UserListComponent } from './pages/admin/users/user-list/user-list.component';
import { UserFormComponent } from './pages/admin/users/user-form/user-form.component';
import { LineListComponent } from './pages/admin/lines/line-list/line-list.component';
import { LineFormComponent } from './pages/admin/lines/line-form/line-form.component';
import { ZoneListComponent } from './pages/admin/zones/zone-list/zone-list.component';
import { ZoneFormComponent } from './pages/admin/zones/zone-form/zone-form.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { StatCardComponent } from './shared/components/stat-card/stat-card.component';
import { RiskBadgeComponent } from './shared/components/risk-badge/risk-badge.component';
import { StatusBadgeComponent } from './shared/components/status-badge/status-badge.component';
import { PrimeNGModule } from './shared/primeng/primeng.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MessageService, ConfirmationService } from 'primeng/api';
import { LayoutComponent } from './layout/layout.component';
import { RoleFilterPipe } from './shared/pipes/role-filter.pipe';
import { FindByIdPipe } from './shared/pipes/find-by-id.pipe';
import { ValidationListComponent } from './pages/admin/validations/validation-list/validation-list.component';
import { ValidationCreateComponent } from './pages/admin/validations/validation-create/validation-create.component';
import { ValidationDetailComponent } from './pages/admin/validations/validation-detail/validation-detail.component';
import { LineMapComponent } from './pages/admin/lines/line-map/line-map.component';
import { ZoneMapComponent } from './pages/admin/zones/zone-map/zone-map.component';
// Keycloak
import { KeycloakAngularModule, KeycloakService } from 'keycloak-angular';
import { initializeKeycloak } from './auth/keycloak-init';
import { AuthService } from './auth/auth.service';
import { AccessDeniedComponent } from './pages/access-denied/access-denied.component';
import { LoginComponent } from './pages/login/login.component';
import { AiDashboardComponent } from './pages/intelligence/ai-dashboard/ai-dashboard.component';
import { ResultListComponent } from './pages/results/result-list/result-list.component';
import { KpiDashboardComponent } from './pages/kpis/kpi-dashboard/kpi-dashboard.component';
import { ConversationListComponent } from './messaging/conversation-list/conversation-list.component';
import { ChatWindowComponent } from './messaging/chat-window/chat-window.component';
import { NotificationPanelComponent } from './messaging/notification-panel/notification-panel.component';
import { Nl2brPipe } from './shared/pipes/nl2br.pipe';
import { MessagingPageComponent } from './messaging/messaging-page/messaging-page.component';
import { SecteurListComponent } from './pages/admin/secteurs/secteur-list/secteur-list.component';
import { PhaseListComponent } from './pages/admin/phases/phase-list/phase-list.component';
import { TicketListComponent } from './pages/Ticket/ticket-list/ticket-list.component';
import { TicketCreateComponent } from './pages/Ticket/ticket-create/ticket-create.component';
import { TicketDetailComponent } from './pages/Ticket/ticket-detail/ticket-detail.component';
import { WeekPlannerComponent } from './pages/Ticket/week-planner/week-planner.component';
import { PrepCheckComponent } from './pages/Ticket/prep-check/prep-check.component';
import { AssignmentPanelComponent } from './shared/components/assignment-panel/assignment-panel.component';
import { TicketStatusBadgeComponent } from './shared/components/ticket-status-badge/ticket-status-badge.component';
import { TicketTimelineComponent } from './shared/components/ticket-timeline/ticket-timeline.component';
import { PriorityBadgeComponent } from './shared/components/priority-badge/priority-badge.component';
import { MesAffectationsComponent } from './pages/mes-affectations/mes-affectations.component';
import { HomeRedirectComponent } from './pages/home-redirect/home-redirect.component';
import { HandoverInitiateDialogComponent } from './pages/Handover/handover-initiate-dialog/handover-initiate-dialog.component';
import { HandoverAcceptPanelComponent } from './pages/Handover/handover-accept-panel/handover-accept-panel.component';
import { HandoverQueuePanelComponent } from './pages/Handover/handover-queue-panel/handover-queue-panel.component';
import { HandoverBannerComponent } from './pages/Handover/handover-banner/handover-banner.component';
import { HandoverTimelineComponent } from './pages/Handover/handover-timeline/handover-timeline.component';
import { MeasureBadgeComponent } from './shared/components/measure-badge/measure-badge.component';
import { PosteCatalogListComponent } from './pages/admin/poste-catalog/poste-catalog-list/poste-catalog-list.component';
import { PosteCatalogFormComponent } from './pages/admin/poste-catalog/poste-catalog-form/poste-catalog-form.component';
import { PosteCatalogBulkImportComponent } from './pages/admin/poste-catalog/poste-catalog-bulk-import/poste-catalog-bulk-import.component';
import { MeasureStatusBadgeComponent } from './shared/components/measure-status-badge/measure-status-badge.component';
import { DeviationProgressComponent } from './shared/components/deviation-progress/deviation-progress.component';
import { MeasureUnitPipe } from './shared/pipes/measure-unit.pipe';
import { MeasurePanelComponent } from './pages/Ticket/measure-panel/measure-panel.component';
import { AddMeasureDialogComponent } from './pages/Ticket/add-measure-dialog/add-measure-dialog.component';
import { AddAdhocMeasureDialogComponent } from './pages/Ticket/add-adhoc-measure-dialog/add-adhoc-measure-dialog.component';
import { WorkflowReadinessBarComponent } from './shared/components/workflow-readiness-bar/workflow-readiness-bar.component';
import { WorkflowReadinessPanelComponent } from './shared/components/workflow-readiness-panel/workflow-readiness-panel.component';

@NgModule({
  declarations: [
    AppComponent,
    SidebarComponent,
    TopbarComponent,
    UserListComponent,
    UserFormComponent,
    LineListComponent,
    LineFormComponent,
    ZoneListComponent,
    ZoneFormComponent,
    DashboardComponent,
    StatCardComponent,
    RiskBadgeComponent,
    StatusBadgeComponent,
    LayoutComponent,
    RoleFilterPipe,
    FindByIdPipe,
    ValidationListComponent,
    ValidationCreateComponent,
    ValidationDetailComponent,
    LineMapComponent,
    ZoneMapComponent,
    AccessDeniedComponent,
    LoginComponent,
    AiDashboardComponent,
    ResultListComponent,
    KpiDashboardComponent,
    ConversationListComponent,
    ChatWindowComponent,
    NotificationPanelComponent,
    Nl2brPipe,
    MessagingPageComponent,
    SecteurListComponent,
    PhaseListComponent,
    TicketListComponent,
    TicketCreateComponent,
    TicketDetailComponent,
    WeekPlannerComponent,
    PrepCheckComponent,
    AssignmentPanelComponent,
    TicketStatusBadgeComponent,
    TicketTimelineComponent,
    PriorityBadgeComponent,
    MesAffectationsComponent,
    HomeRedirectComponent,
    HandoverInitiateDialogComponent,
    HandoverAcceptPanelComponent,
    HandoverQueuePanelComponent,
    HandoverBannerComponent,
    HandoverTimelineComponent,
    MeasureBadgeComponent,
    PosteCatalogListComponent,
    PosteCatalogFormComponent,
    PosteCatalogBulkImportComponent,
    DeviationProgressComponent,
    MeasureStatusBadgeComponent,
    MeasureUnitPipe,
    MeasurePanelComponent,
    AddMeasureDialogComponent,
    AddAdhocMeasureDialogComponent,
    WorkflowReadinessBarComponent,
    WorkflowReadinessPanelComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    KeycloakAngularModule, 
    PrimeNGModule,
  ],
  providers: [
    MessageService,        // <── For p-toast
    ConfirmationService,
    {
      provide: APP_INITIALIZER,
      useFactory: initializeKeycloak,
      multi: true,
      deps: [KeycloakService, AuthService],
    },
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
