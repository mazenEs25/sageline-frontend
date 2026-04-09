import { Injectable } from '@angular/core';
import { KeycloakService } from 'keycloak-angular';

@Injectable({ providedIn: 'root' })
export class RoleService {

  constructor(private keycloak: KeycloakService) {}

  get roles(): string[] {
    try {
      const tokenParsed = this.keycloak.getKeycloakInstance().tokenParsed as any;
      return tokenParsed?.realm_access?.roles || [];
    } catch {
      return [];
    }
  }

  get username(): string {
    try {
      const tokenParsed = this.keycloak.getKeycloakInstance().tokenParsed as any;
      return tokenParsed?.preferred_username || '';
    } catch {
      return '';
    }
  }

  hasAnyRole(...roles: string[]): boolean {
    return roles.some(r => this.roles.includes(r));
  }

  get isAdmin(): boolean { return this.roles.includes('ADMIN_IT'); }
  get isChefSecteur(): boolean { return this.roles.includes('CHEF_SECTEUR'); }
  get isExpert(): boolean { return this.roles.includes('EXPERT'); }
  get isTechValidation(): boolean { return this.roles.includes('TECH_VAL'); }
  get isTechPreparation(): boolean { return this.roles.includes('TECH_PREP'); }
  get isResponsable(): boolean { return this.roles.includes('RESPONSABLE'); }

  get canManageUsers(): boolean { return this.isAdmin; }
  get canManageLines(): boolean { return this.hasAnyRole('ADMIN_IT', 'CHEF_SECTEUR'); }
  get canCreateValidation(): boolean { return this.hasAnyRole('ADMIN_IT', 'CHEF_SECTEUR', 'TECH_VAL'); }
  get canCloseValidation(): boolean { return this.hasAnyRole('ADMIN_IT', 'CHEF_SECTEUR', 'TECH_VAL'); }
  get canDeleteValidation(): boolean { return this.hasAnyRole('ADMIN_IT', 'CHEF_SECTEUR'); }
}