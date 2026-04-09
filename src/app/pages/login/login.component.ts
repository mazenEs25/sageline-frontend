import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

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
    private router: Router
  ) {
    // If already authenticated, redirect to dashboard
    this.authService.isAuthenticated().then(isAuth => {
      if (isAuth) {
        this.router.navigate(['/dashboard']);
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
          // Initialize Keycloak with the received tokens
          await this.authService.initWithTokens(tokens);

          // Navigate to dashboard
          this.router.navigate(['/dashboard']);
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