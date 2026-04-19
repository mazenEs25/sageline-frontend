import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

/**
 * Silent redirect to the landing page that matches the current user's role.
 * Used for the root route so TECH_VAL / TECH_PREP don't land on /dashboard.
 */
@Component({
  selector: 'app-home-redirect',
  template: `<div class="flex align-items-center justify-content-center" style="height: 50vh">
    <p-progressSpinner styleClass="w-3rem h-3rem"></p-progressSpinner>
  </div>`
})
export class HomeRedirectComponent implements OnInit {
  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit() {
    // Defer so Keycloak has finished bootstrapping
    setTimeout(() => {
      this.router.navigateByUrl(this.authService.getLandingRoute(), { replaceUrl: true });
    }, 0);
  }
}
