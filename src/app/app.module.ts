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
import { ValidationListComponent } from './pages/admin/validations/validation-list/validation-list.component';
import { ValidationCreateComponent } from './pages/admin/validations/validation-create/validation-create.component';
import { ValidationDetailComponent } from './pages/admin/validations/validation-detail/validation-detail.component';
import { LineMapComponent } from './pages/admin/lines/line-map/line-map.component';
import { ZoneMapComponent } from './pages/admin/zones/zone-map/zone-map.component';
// Keycloak
import { KeycloakAngularModule, KeycloakService } from 'keycloak-angular';
import { initializeKeycloak } from './auth/keycloak-init';
import { AccessDeniedComponent } from './pages/access-denied/access-denied.component';
import { LoginComponent } from './pages/login/login.component';
import { AiDashboardComponent } from './pages/intelligence/ai-dashboard/ai-dashboard.component';
import { ResultListComponent } from './pages/results/result-list/result-list.component';
import { KpiDashboardComponent } from './pages/kpis/kpi-dashboard/kpi-dashboard.component';

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
    ValidationListComponent,
    ValidationCreateComponent,
    ValidationDetailComponent,
    LineMapComponent,
    ZoneMapComponent,
    AccessDeniedComponent,
    LoginComponent,
    AiDashboardComponent,
    ResultListComponent,
    KpiDashboardComponent
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
      deps: [KeycloakService],
    },
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
