import { KeycloakService } from 'keycloak-angular';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

/**
 * Bootstrap Keycloak at app startup.
 *
 * After the base `keycloak.init()` call we attempt to restore any tokens
 * previously persisted in localStorage. This lets the user skip the login
 * screen on page reload, while still being forced to re-authenticate after
 * 30 minutes of inactivity (or after `localStorage` is wiped, e.g. browser
 * close with "clear on exit" enabled).
 */
export function initializeKeycloak(
  keycloak: KeycloakService,
  authService: AuthService
): () => Promise<boolean> {
  return async () => {
    await keycloak.init({
      config: {
        url: environment.keycloak.url,
        realm: environment.keycloak.realm,
        clientId: environment.keycloak.clientId,
      },
      initOptions: {
        checkLoginIframe: false,       // Avoid issues with modern browsers
        silentCheckSsoRedirectUri:
          window.location.origin + '/assets/silent-check-sso.html',
      },
      enableBearerInterceptor: true,   // Auto-attach JWT to HTTP requests
      bearerPrefix: 'Bearer',
      bearerExcludedUrls: ['/assets', '/login'],
    });

    // Re-hydrate from localStorage if a fresh (non-idle) session exists.
    // Failure here is non-fatal — we just fall through to the login route.
    try {
      await authService.restorePersistedSession();
    } catch {
      /* ignore — user will be routed to /login by the guard */
    }

    return true;
  };
}
