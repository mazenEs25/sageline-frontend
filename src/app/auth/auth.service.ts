import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { KeycloakService } from 'keycloak-angular';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { BehaviorSubject, Observable, tap } from 'rxjs';

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

  /** localStorage keys used for session persistence */
  static readonly ACCESS_TOKEN_KEY = 'sageline_access_token';
  static readonly REFRESH_TOKEN_KEY = 'sageline_refresh_token';
  static readonly LAST_ACTIVITY_KEY = 'sageline_last_activity';
  static readonly SECTEUR_ID_KEY = 'sageline_secteur_id';

  /** Max idle duration before a stored session is considered expired (ms). */
  static readonly IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

  constructor(
    private http: HttpClient,
    private keycloak: KeycloakService,
    private router: Router
  ) {}

  /**
   * Persist tokens + last-activity timestamp so we can restore the session
   * after a page reload (see `restorePersistedSession`).
   */
  private persistTokens(accessToken: string, refreshToken: string): void {
    try {
      localStorage.setItem(AuthService.ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(AuthService.REFRESH_TOKEN_KEY, refreshToken);
      this.touchLastActivity();
    } catch { /* storage may be disabled */ }
  }

  /** Record current time as the "last user activity" marker. */
  touchLastActivity(): void {
    try {
      localStorage.setItem(AuthService.LAST_ACTIVITY_KEY, Date.now().toString());
    } catch { /* ignore */ }
  }

  /** Wipe persisted session markers — called on logout. */
  private clearPersistedSession(): void {
    try {
      localStorage.removeItem(AuthService.ACCESS_TOKEN_KEY);
      localStorage.removeItem(AuthService.REFRESH_TOKEN_KEY);
      localStorage.removeItem(AuthService.LAST_ACTIVITY_KEY);
    } catch { /* ignore */ }
  }

  /** True if there's a previously-persisted session that hasn't gone idle. */
  hasFreshPersistedSession(): boolean {
    try {
      const access = localStorage.getItem(AuthService.ACCESS_TOKEN_KEY);
      const refresh = localStorage.getItem(AuthService.REFRESH_TOKEN_KEY);
      const last = parseInt(localStorage.getItem(AuthService.LAST_ACTIVITY_KEY) || '0', 10);
      if (!access || !refresh || !last) return false;
      return (Date.now() - last) < AuthService.IDLE_TIMEOUT_MS;
    } catch {
      return false;
    }
  }

  /**
   * If tokens were previously persisted AND we're still within the idle window,
   * re-hydrate the Keycloak instance so the user skips the login screen.
   * Called from keycloak-init after `keycloak.init`.
   */
  async restorePersistedSession(): Promise<boolean> {
    if (!this.hasFreshPersistedSession()) {
      this.clearPersistedSession();
      return false;
    }

    try {
      const access = localStorage.getItem(AuthService.ACCESS_TOKEN_KEY)!;
      const refresh = localStorage.getItem(AuthService.REFRESH_TOKEN_KEY)!;

      await this.initWithTokens({
        access_token: access,
        refresh_token: refresh,
        expires_in: 0,
        token_type: 'Bearer'
      });

      // Proactively refresh — if the access token is stale the refresh token
      // (longer lived) will mint a fresh one. If refresh fails, bail out.
      const kc = this.keycloak.getKeycloakInstance();
      try {
        await kc.updateToken(-1);
      } catch {
        this.clearPersistedSession();
        kc.authenticated = false;
        return false;
      }
      this.touchLastActivity();
      return true;
    } catch {
      this.clearPersistedSession();
      return false;
    }
  }

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

    // Persist so the user survives a page reload
    this.persistTokens(tokens.access_token, tokens.refresh_token);

    // Set up auto-refresh
    keycloakInstance.onTokenExpired = () => {
      keycloakInstance.updateToken(30)
        .then(() => {
          // Token rotated — re-persist
          if (keycloakInstance.token && keycloakInstance.refreshToken) {
            this.persistTokens(keycloakInstance.token, keycloakInstance.refreshToken);
          }
        })
        .catch(() => this.logout());
    };

    // Also re-persist whenever Keycloak emits the "authSuccess" / onAuthRefreshSuccess events
    keycloakInstance.onAuthRefreshSuccess = () => {
      if (keycloakInstance.token && keycloakInstance.refreshToken) {
        this.persistTokens(keycloakInstance.token, keycloakInstance.refreshToken);
      }
    };

    this.isAuthenticatedSubject.next(true);
  }

  /**
   * Logout — clear Keycloak session and redirect to login.
   */
  logout(): void {
    // Always wipe persisted tokens first so a reload doesn't re-hydrate
    this.clearPersistedSession();

    try {
      const kc = this.keycloak.getKeycloakInstance();
      kc.token = undefined;
      kc.refreshToken = undefined;
      kc.tokenParsed = undefined;
      kc.refreshTokenParsed = undefined;
      kc.authenticated = false;
    } catch { /* ignore */ }

    this.isAuthenticatedSubject.next(false);
    this.router.navigate(['/login']);
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
      const kc = this.keycloak.getKeycloakInstance();
      const tokenParsed = kc.tokenParsed as any;
      if (tokenParsed?.realm_access?.roles) {
        return tokenParsed.realm_access.roles;
      }
      return this.keycloak.getUserRoles(true);
    } catch {
      return [];
    }
  }

  /**
   * Return the landing route a user should be sent to after login,
   * based on their primary role.
   *
   * - TECH_VAL / TECH_PREP → ticket list (they have no dashboard access)
   * - All others → dashboard
   */
  getLandingRoute(): string {
    const roles = this.getRoles();
    if (roles.includes('TECH_VAL') || roles.includes('TECH_PREP')) {
      return '/validations';
    }
    return '/dashboard';
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

  getFirstName(): string {
    try {
      const token = this.keycloak.getKeycloakInstance().tokenParsed as any;
      return token?.['given_name'] || '';
    } catch {
      return '';
    }
  }

  getLastName(): string {
    try {
      const token = this.keycloak.getKeycloakInstance().tokenParsed as any;
      return token?.['family_name'] || '';
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
syncCurrentUser(): Observable<any> {
  return this.http.get(`${environment.apiUrl}/users/me`).pipe(
    tap((user: any) => {
      localStorage.setItem('sageline_user_id', user.id.toString());
      localStorage.setItem('currentUser', JSON.stringify(user));
      // CHEF_SECTEUR / ADMIN_IT use this for the live handover queue topic
      localStorage.setItem(AuthService.SECTEUR_ID_KEY, user.secteurId?.toString() ?? '0');
    })
  );
}

getCurrentUserSecteurId(): number {
  const stored = localStorage.getItem(AuthService.SECTEUR_ID_KEY);
  return stored ? parseInt(stored, 10) : 0;
}
}