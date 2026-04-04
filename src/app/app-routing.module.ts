import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { UserListComponent } from './pages/admin/users/user-list/user-list.component';
import { LineListComponent } from './pages/admin/lines/line-list/line-list.component';
import { ZoneListComponent } from './pages/admin/zones/zone-list/zone-list.component';
import { ValidationCreateComponent } from './pages/admin/validations/validation-create/validation-create.component';
import { ValidationDetailComponent } from './pages/admin/validations/validation-detail/validation-detail.component';
import { ValidationListComponent } from './pages/admin/validations/validation-list/validation-list.component';
import { LineMapComponent } from './pages/admin/lines/line-map/line-map.component';
import { ZoneMapComponent } from './pages/admin/zones/zone-map/zone-map.component';

const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'admin/users', component: UserListComponent },
      { path: 'admin/lines', component: LineListComponent },
      { path: 'admin/zones', component: ZoneListComponent },
      { path: 'validations', component: ValidationListComponent },
      { path: 'validations/create', component: ValidationCreateComponent },
      { path: 'validations/:id', component: ValidationDetailComponent },
      // Inside LayoutComponent children:
      { path: 'admin/lines/map', component: LineMapComponent },
      { path: 'admin/zones/map', component: ZoneMapComponent },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }