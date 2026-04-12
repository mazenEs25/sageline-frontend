import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { KeycloakService } from 'keycloak-angular';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {

  private tokenUrl = `${environment.keycloak.url}/realms/${environment.keycloak.realm}/protocol/openid-connect/token`;
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);

  constructor(
    private http: HttpClient,
    private keycloak: KeycloakService,
    private router: Router
  ) {}

  /**
   * Login using Keycloak's Direct Access Grant (password grant).
   * This avoids the Keycloak redirect login page.
   */
  login(username: string, password: string): Observable<LoginResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    const body = new HttpParams()
      .set('grant_type', 'password')
      .set('client_id', environment.keycloak.clientId)
      .set('username', username)
      .set('password', password);

    return this.http.post<LoginResponse>(this.tokenUrl, body.toString(), { headers });
  }

  /**
   * After getting tokens from login(), initialize the Keycloak instance
   * with the received tokens so the rest of the app works normally.
   */
  async initWithTokens(tokens: LoginResponse): Promise<void> {
    const keycloakInstance = this.keycloak.getKeycloakInstance();

    // Set tokens on the Keycloak instance
    keycloakInstance.token = tokens.access_token;
    keycloakInstance.refreshToken = tokens.refresh_token;

    // Parse the token to get user info
    keycloakInstance.tokenParsed = this.parseJwt(tokens.access_token);
    keycloakInstance.refreshTokenParsed = this.parseJwt(tokens.refresh_token);
    keycloakInstance.authenticated = true;

    // Set up auto-refresh
    keycloakInstance.onTokenExpired = () => {
      keycloakInstance.updateToken(30).catch(() => {
        this.logout();
      });
    };

    this.isAuthenticatedSubject.next(true);
  }

  /**
   * Logout — clear Keycloak session and redirect to login.
   */
  logout(): void {
    try {
      this.keycloak.logout(window.location.origin + '/login');
    } catch {
      // If Keycloak logout fails, just clear and redirect
      const kc = this.keycloak.getKeycloakInstance();
      kc.token = undefined;
      kc.refreshToken = undefined;
      kc.authenticated = false;
      this.isAuthenticatedSubject.next(false);
      this.router.navigate(['/login']);
    }
  }

  /**
   * Check if user is currently authenticated.
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      return await this.keycloak.isLoggedIn();
    } catch {
      return false;
    }
  }

  /**
   * Get current user roles.
   */
  getRoles(): string[] {
    try {
      return this.keycloak.getUserRoles(true);
    } catch {
      return [];
    }
  }

  /**
   * Get username from token.
   */
  getUsername(): string {
    try {
      const token = this.keycloak.getKeycloakInstance().tokenParsed;
      return token?.['preferred_username'] || '';
    } catch {
      return '';
    }
  }

  /**
   * Parse a JWT token to extract the payload.
   */
  private parseJwt(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return {};
    }
  }
  /**
 * Récupérer l'ID de l'utilisateur courant depuis le token Keycloak.
 * Le 'sub' du token JWT est l'ID Keycloak.
 * On utilise le username pour chercher l'ID dans la base PostgreSQL.
 */
getCurrentUserId(): number {
  // Option 1 : Si votre backend renvoie l'ID user dans le token custom claim
  const tokenParsed = this.keycloak.getKeycloakInstance().tokenParsed;
  if (tokenParsed && tokenParsed['user_id']) {
    return tokenParsed['user_id'];
  }

  // Option 2 : Utiliser un ID stocké après le premier login
  // (voir section 3.1 ci-dessous pour l'implémentation recommandée)
  const storedId = localStorage.getItem('sageline_user_id');
  if (storedId) {
    return parseInt(storedId, 10);
  }

  console.error('User ID non disponible — fallback à 0');
  return 0;
}
}