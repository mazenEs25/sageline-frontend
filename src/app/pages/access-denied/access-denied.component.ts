import { Component } from '@angular/core';
import { KeycloakService } from 'keycloak-angular';

@Component({
  selector: 'app-access-denied',
  template: `
    <div class="denied-container">
      <div class="denied-icon">🔒</div>
      <h1>Accès refusé</h1>
      <p>Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
      <p class="denied-role">Votre rôle : <strong>{{ userRole }}</strong></p>
      <div class="denied-actions">
        <button pButton label="Retour au dashboard" icon="pi pi-home"
          class="p-button-primary" routerLink="/dashboard"></button>
        <button pButton label="Se déconnecter" icon="pi pi-sign-out"
          class="p-button-outlined" (click)="logout()"></button>
      </div>
    </div>
  `,
  styles: [`
    .denied-container {
      text-align: center;
      padding: 80px 24px;
      max-width: 480px;
      margin: 0 auto;
    }
    .denied-icon { font-size: 4rem; margin-bottom: 16px; }
    h1 { font-size: 24px; font-weight: 700; color: #f1f5f9; margin: 0 0 8px; }
    p { font-size: 14px; color: #94a3b8; margin: 0 0 6px; }
    .denied-role { margin-top: 16px; }
    .denied-role strong { color: #60a5fa; }
    .denied-actions { display: flex; gap: 12px; justify-content: center; margin-top: 28px; }
  `]
})
export class AccessDeniedComponent {
  userRole = '';

  constructor(private keycloak: KeycloakService) {
    const roles = this.keycloak.getUserRoles();
    this.userRole = roles.find(r =>
      ['ADMIN_IT', 'CHEF_SECTEUR', 'EXPERT', 'TECH_VALIDATION', 'TECH_PREPARATION', 'RESPONSABLE'].includes(r)
    ) || 'Inconnu';
  }

  logout(): void {
    this.keycloak.logout(window.location.origin);
  }
}