import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {

  menuItems = [
    {
      label: 'GESTION',
       items: [
    { label: 'Dashboard', icon: 'pi pi-chart-bar', route: '/dashboard' },
    { label: 'Plan d\'usine', icon: 'pi pi-map', route: '/admin/lines/map' },
    { label: 'Utilisateurs', icon: 'pi pi-users', route: '/admin/users' },
    { label: 'Lignes', icon: 'pi pi-box', route: '/admin/lines' },
    { label: 'Zones', icon: 'pi pi-th-large', route: '/admin/zones' },
    { label: 'Plan zones', icon: 'pi pi-map-marker', route: '/admin/zones/map' },
  ]
    },
    {
      label: 'VALIDATIONS',
      items: [
        { label: 'Validations', icon: 'pi pi-check-square', route: '/validations' },
        { label: 'Résultats', icon: 'pi pi-list', route: '/results' },
      ]
    },
    {
      label: 'INTELLIGENCE',
      items: [
        { label: 'Prédictions IA', icon: 'pi pi-bolt', route: '/predictions' },
        { label: 'KPIs', icon: 'pi pi-chart-line', route: '/kpis' },
      ]
    }
  ];

  constructor(public router: Router) {}

  isActive(route: string): boolean {
    return this.router.url === route;
  }
}