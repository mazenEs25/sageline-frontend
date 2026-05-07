import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { KeycloakService } from 'keycloak-angular';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {

  allMenuItems = [
    {
      label: 'GESTION',
      items: [
        { label: 'Dashboard', icon: 'pi pi-chart-bar', route: '/dashboard', roles: ['ADMIN_IT', 'CHEF_SECTEUR', 'EXPERT', 'RESPONSABLE'] },
        { label: "Plan d'usine", icon: 'pi pi-map', route: '/admin/lines/map', roles: ['ADMIN_IT', 'CHEF_SECTEUR'] },
        { label: 'Utilisateurs', icon: 'pi pi-users', route: '/admin/users', roles: ['ADMIN_IT'] },
        { label: 'Lignes', icon: 'pi pi-box', route: '/admin/lines', roles: ['ADMIN_IT', 'CHEF_SECTEUR'] },
        { label: 'Zones', icon: 'pi pi-th-large', route: '/admin/zones', roles: ['ADMIN_IT', 'CHEF_SECTEUR'] },
        { label: 'Plan zones', icon: 'pi pi-map-marker', route: '/admin/zones/map', roles: ['ADMIN_IT', 'CHEF_SECTEUR'] },
        { label: 'Secteurs', icon: 'pi pi-building', route: '/admin/secteurs', roles: ['ADMIN_IT'] },
        { label: 'Phases', icon: 'pi pi-sitemap', route: '/admin/phases', roles: ['ADMIN_IT'] },

      ]
    },
    {
      label: 'MES AFFECTATIONS',
      items: [
        { label: 'Mes Affectations', icon: 'pi pi-map-marker', route: '/mes-affectations', roles: ['TECH_VAL', 'TECH_PREP'] },
      ]
    },
    {
      label: 'VALIDATIONS',
      items: [
        { label: 'Validations', icon: 'pi pi-check-square', route: '/validations', roles: ['ADMIN_IT', 'CHEF_SECTEUR', 'TECH_VAL', 'EXPERT', 'RESPONSABLE','TECH_PREP'] },
        { label: 'Résultats', icon: 'pi pi-list', route: '/results', roles: ['ADMIN_IT', 'CHEF_SECTEUR', 'EXPERT'] },
        { label: 'Tickets', icon: 'pi pi-ticket', route: '/validations', roles: ['ADMIN_IT', 'CHEF_SECTEUR', 'EXPERT', 'TECH_VAL', 'TECH_PREP', 'RESPONSABLE'] },
        { label: 'Créer Ticket', icon: 'pi pi-plus', route: '/validations/create', roles: ['ADMIN_IT', 'CHEF_SECTEUR'] },
        { label: 'Planification', icon: 'pi pi-calendar', route: '/validations/planner', roles: ['ADMIN_IT', 'CHEF_SECTEUR'] },
      ]
    },
    {
      label: 'INTELLIGENCE',
      items: [
        { label: 'Modèles IA', icon: 'pi pi-bolt', route: '/intelligence', roles: ['ADMIN_IT', 'CHEF_SECTEUR', 'EXPERT'] },
        { label: 'KPIs', icon: 'pi pi-chart-line', route: '/kpis', roles: ['ADMIN_IT', 'CHEF_SECTEUR', 'EXPERT', 'RESPONSABLE'] },
      ]
    },
    {
      label: 'COMMUNICATION',
      items: [
        { label: 'Messagerie', icon: 'pi pi-comments', route: '/messaging', roles: ['ADMIN_IT', 'CHEF_SECTEUR', 'EXPERT', 'TECH_VAL', 'TECH_PREP', 'RESPONSABLE'] },
      ]
    },
    {
      label: 'PASSATIONS',
      items: [
        { label: 'Passations', icon: 'pi pi-arrows-h', route: '/handovers/queue', roles: ['CHEF_SECTEUR', 'ADMIN_IT'] }
      ]
    },


  ];

  filteredMenuItems: any[] = [];
  userRoles: string[] = [];
  username = '';
  userRole = '';

  constructor(
    public router: Router,
    private keycloak: KeycloakService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    // Extract roles directly from the JWT token (works with Direct Access Grant)
    this.userRoles = this.extractRolesFromToken();
    this.username = this.extractUsernameFromToken();

    console.log('Token roles:', this.userRoles);
    console.log('Username:', this.username);

    // Find primary SageLine role
    const sagelineRoles = ['ADMIN_IT', 'CHEF_SECTEUR', 'EXPERT', 'TECH_VAL', 'TECH_PREP', 'RESPONSABLE'];
    this.userRole = this.userRoles.find(r => sagelineRoles.includes(r)) || 'UTILISATEUR';

    // Filter menu items by user roles
    this.filteredMenuItems = this.allMenuItems
      .map(group => ({
        ...group,
        items: group.items.filter(item => {
          if (!item.roles || item.roles.length === 0) return true;
          return item.roles.some(role => this.userRoles.includes(role));
        })
      }))
      .filter(group => group.items.length > 0);
  }

  private extractRolesFromToken(): string[] {
    try {
      const kc = this.keycloak.getKeycloakInstance();
      const tokenParsed = kc.tokenParsed as any;

      if (tokenParsed && tokenParsed.realm_access && tokenParsed.realm_access.roles) {
        return tokenParsed.realm_access.roles;
      }

      // Fallback: try getUserRoles
      return this.keycloak.getUserRoles(true);
    } catch {
      return [];
    }
  }

  private extractUsernameFromToken(): string {
    try {
      const kc = this.keycloak.getKeycloakInstance();
      const tokenParsed = kc.tokenParsed as any;
      return tokenParsed?.preferred_username || '';
    } catch {
      return '';
    }
  }

  isActive(route: string): boolean {
    return this.router.url.startsWith(route);
  }

}