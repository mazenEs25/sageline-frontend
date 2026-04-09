import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { KeycloakAuthGuard, KeycloakService } from 'keycloak-angular';

@Injectable({ providedIn: 'root' })
export class AuthGuard extends KeycloakAuthGuard {

  constructor(
    protected override readonly router: Router,
    protected readonly keycloak: KeycloakService
  ) {
    super(router, keycloak);
  }

  public async isAccessAllowed(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Promise<boolean> {
    // Check authentication via token
    const kc = this.keycloak.getKeycloakInstance();
    const isAuth = !!kc.token && !!kc.tokenParsed;

    if (!isAuth) {
      this.router.navigate(['/login']);
      return false;
    }

    // Check required roles
    const requiredRoles = route.data['roles'] as string[];

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Extract roles from token directly
    const tokenParsed = kc.tokenParsed as any;
    const userRoles: string[] = tokenParsed?.realm_access?.roles || [];
    const hasRole = requiredRoles.some(role => userRoles.includes(role));

    if (!hasRole) {
      this.router.navigate(['/access-denied']);
      return false;
    }

    return true;
  }
}