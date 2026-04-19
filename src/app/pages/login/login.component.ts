import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { IdleService } from '../../auth/idle.service';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {

  username = '';
  password = '';
  showPassword = false;
  loading = false;
  error = '';
  shake = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private http: HttpClient,
    private idleService: IdleService
  ) {
    // If already authenticated, redirect to the correct landing page for the user's role
    this.authService.isAuthenticated().then(isAuth => {
      if (isAuth) {
        this.router.navigate([this.authService.getLandingRoute()]);
      }
    });
  }

  async onLogin(): Promise<void> {
    // Validate
    if (!this.username || !this.password) {
      this.error = 'Veuillez remplir tous les champs';
      this.triggerShake();
      return;
    }

    this.loading = true;
    this.error = '';

    this.authService.login(this.username, this.password).subscribe({
      next: async (tokens) => {
        try {
          // Initialize Keycloak with the received tokens (also persists them)
          await this.authService.initWithTokens(tokens);

          // Start idle tracking now — otherwise it would only kick in after
          // the next app bootstrap / page reload.
          this.idleService.start();

          // Resolve user ID before navigating so components can access it
          try {
            const user = await firstValueFrom(
              this.http.get<any>(`${environment.apiUrl}/users/me`)
            );
            localStorage.setItem('sageline_user_id', user.id.toString());
            localStorage.setItem('sageline_username', user.username);
            localStorage.setItem('sageline_user_role', user.role);
          } catch {
            console.warn('Could not resolve user ID at login');
          }

          // Navigate to the landing page that matches the user's role
          this.router.navigate([this.authService.getLandingRoute()]);
        } catch (err) {
          this.error = 'Erreur lors de l\'initialisation de la session';
          this.loading = false;
          this.triggerShake();
        }
      },
      error: (err) => {
        this.loading = false;

        if (err.status === 401) {
          this.error = 'Nom d\'utilisateur ou mot de passe incorrect';
        } else if (err.status === 400) {
          // Keycloak returns 400 for invalid credentials
          this.error = 'Identifiants invalides';
        } else if (err.status === 0) {
          this.error = 'Impossible de contacter le serveur d\'authentification';
        } else {
          this.error = 'Erreur de connexion. Veuillez réessayer.';
        }

        this.triggerShake();
      }
    });
  }

  triggerShake(): void {
    this.shake = true;
    setTimeout(() => this.shake = false, 500);
  }
}