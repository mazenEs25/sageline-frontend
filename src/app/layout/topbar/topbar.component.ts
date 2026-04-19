import { Component, OnInit, OnDestroy, HostListener, ElementRef, ViewChild } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subject, Subscription } from 'rxjs';
import { KeycloakService } from 'keycloak-angular';
import { AuthService } from '../../auth/auth.service';
import { ValidationService } from '../../services/validation.service';
import { ValidationZone } from '../../models/validation-zone.model';
import { ProductionLine } from '../../models/production-line.model';
import { ProductionLineService } from '../../services/production-line.service';
import { ValidationZoneService } from '../../services/validation-zone.service';


@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss']
})
export class TopbarComponent implements OnInit, OnDestroy {

  username = '';
  userRole = '';
  userInitials = '';
  breadcrumb: string[] = ['SageLine'];
  showDropdown = false;
  showNotifications = false;
  searchOpen = false;
  searchQuery = '';
  searchResults: any[] = [];
  @ViewChild('searchInput') searchInput: any;

  // Live search subject for debouncing
  private searchSubject = new Subject<string>();
  private searchSub?: Subscription;

  // Data
  zones: ValidationZone[] = [];
  lines: ProductionLine[] = [];

  // Notifications (AI alerts)
  notifications: any[] = [];
  unreadCount = 0;

  private routeLabels: Record<string, string> = {
    '/dashboard': 'Tableau de bord',
    '/admin/users': 'Utilisateurs',
    '/admin/lines': 'Lignes',
    '/admin/lines/map': "Plan d'usine",
    '/admin/zones': 'Zones',
    '/admin/zones/map': 'Plan zones',
    '/validations': 'Validations',
    '/validations/create': 'Nouvelle validation',
    '/results': 'Résultats',
    '/kpis': 'KPIs',
    '/intelligence': 'Intelligence IA',
    '/access-denied': 'Accès refusé',
  };

  constructor(
    private router: Router,
    private keycloak: KeycloakService,
    private authService: AuthService,
    private validationService: ValidationService,
     private zoneService: ValidationZoneService,
    private lineService: ProductionLineService,
    private elementRef: ElementRef
  ) { }

  ngOnInit(): void {
    this.loadUserInfo();
    this.updateBreadcrumb(this.router.url);
    this.loadZones();
    this.loadLines();
    this.loadNotifications();

    // Debounced live search — triggers 300ms after user stops typing
    this.searchSub = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      if (query.trim()) {
        this.executeSearch();
      } else {
        this.searchResults = [];
      }
    });

    // Update breadcrumb on route change
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.updateBreadcrumb(event.urlAfterRedirects || event.url);
    });
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  private loadUserInfo(): void {
    try {
      const kc = this.keycloak.getKeycloakInstance();
      const token = kc.tokenParsed as any;
      this.username = this.computeDisplayName();
      this.userInitials = this.computeInitials();

      const sageRoles = ['ADMIN_IT', 'CHEF_SECTEUR', 'EXPERT', 'TECH_VAL', 'TECH_PREP', 'RESPONSABLE'];
      const roles: string[] = token?.realm_access?.roles || [];
      this.userRole = roles.find(r => sageRoles.includes(r)) || 'Utilisateur';
    } catch {
      this.username = 'User';
      this.userInitials = 'US';
      this.userRole = 'Utilisateur';
    }
  }

  private computeDisplayName(): string {
    const firstName = this.authService.getFirstName();
    const lastName = this.authService.getLastName();
    if (firstName || lastName) {
      return `${firstName || ''} ${lastName || ''}`.trim();
    }
    return this.authService.getUsername() || 'User';
  }

  private computeInitials(): string {
    const firstName = this.authService.getFirstName();
    const lastName = this.authService.getLastName();
    if (firstName && lastName) {
      return (firstName[0] + lastName[0]).toUpperCase();
    }
    const username = this.authService.getUsername() || 'U';
    return username.substring(0, 2).toUpperCase();
  }

  private updateBreadcrumb(url: string): void {
    // Remove query params
    const path = url.split('?')[0];

    // Check for validation detail
    const validationMatch = path.match(/\/validations\/(\d+)/);
    if (validationMatch) {
      this.breadcrumb = ['SageLine', 'Validations', `#${validationMatch[1]}`];
      return;
    }

    const label = this.routeLabels[path];
    if (label) {
      this.breadcrumb = ['SageLine', label];
    } else {
      this.breadcrumb = ['SageLine'];
    }
  }
  private loadZones(): void {
    this.zoneService.getAll().subscribe({
      next: (data) => {
        this.zones = data;
      },
      error: () => {
        console.error('Failed to load zones');
        this.zones = [];
      }
    });
  }

  private loadLines(): void {
    this.lineService.getAll().subscribe({
      next: (data) => {
        this.lines = data;
      },
      error: () => {
        console.error('Failed to load lines');
        this.lines = [];
      }
    });
  }

  loadNotifications(): void {
    // Load active validations with high risk as notifications
    this.validationService.getAll().subscribe({
      next: (validations) => {
        this.notifications = validations
          .filter(v => v.status === 'EN_COURS' && (v.riskLevel === 'CRITIQUE' || v.riskLevel === 'RISQUE'))
          .map(v => ({
            id: v.id,
            title: `Alerte IA — Validation #${v.id}`,
            message: `Risque ${v.riskLevel} (${((v.riskScore || 0) * 100).toFixed(0)}%)`,
            severity: v.riskLevel,
            time: v.startDate,
            read: false
          }))
          .slice(0, 8);

        this.unreadCount = this.notifications.filter(n => !n.read).length;
      }
    });
  }

  // ─── Actions ───

  toggleDropdown(): void {
    this.showDropdown = !this.showDropdown;
    this.showNotifications = false;
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
    this.showDropdown = false;
  }

  viewNotification(notif: any): void {
    notif.read = true;
    this.unreadCount = this.notifications.filter(n => !n.read).length;
    this.showNotifications = false;
    this.router.navigate(['/validations', notif.id]);
  }

  markAllRead(): void {
    this.notifications.forEach(n => n.read = true);
    this.unreadCount = 0;
  }

  navigateTo(path: string): void {
    this.showDropdown = false;
    this.router.navigate([path]);
  }

  openSwagger(): void {
    this.showDropdown = false;
    window.open('http://localhost:8089/swagger-ui.html', '_blank');
  }

  logout(): void {
    this.showDropdown = false;
    this.authService.logout();
  }

  // Close dropdowns on outside click
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.showDropdown = false;
      this.showNotifications = false;
    }
  }

  @HostListener('document:keydown', ['$event'])
onKeyDown(event: KeyboardEvent): void {
  if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
    event.preventDefault();
    this.openSearch();
  }
  if (event.key === 'Escape') {
    this.closeSearch();
  }
}


openSearch(): void {
  this.searchOpen = true;
  this.showDropdown = false;
  this.showNotifications = false;
  setTimeout(() => this.searchInput?.nativeElement?.focus(), 50);
}

closeSearch(): void {
  this.searchOpen = false;
  this.searchQuery = '';
  this.searchResults = [];
}

// Called on every keystroke — feeds the debounce subject
onSearchInput(): void {
  this.searchSubject.next(this.searchQuery);
}

executeSearch(): void {
  if (!this.searchQuery.trim()) return;

  const q = this.searchQuery.toLowerCase();
  const results: any[] = [];

  // Search validations
  this.validationService.getAll().subscribe(validations => {
    validations.forEach(v => {
      const zoneName = this.getZoneName(v.validationZoneId);
      if (
        `#${v.id}`.includes(q) ||
        zoneName.toLowerCase().includes(q) ||
        v.status.toLowerCase().includes(q) ||
        (v.comments || '').toLowerCase().includes(q)
      ) {
        results.push({
          title: `Validation #${v.id}`,
          subtitle: `${zoneName} — ${v.status}`,
          icon: 'pi pi-check-square',
          type: 'Validation',
          route: `/validations/${v.id}`
        });
      }
    });

    // Search zones
    this.zones.forEach(z => {
      if (z.name.toLowerCase().includes(q) || (z.description || '').toLowerCase().includes(q)) {
        results.push({
          title: z.name,
          subtitle: z.description || '',
          icon: 'pi pi-th-large',
          type: 'Zone',
          route: '/admin/zones'
        });
      }
    });

    // Search lines
    this.lines.forEach(l => {
      if (l.name.toLowerCase().includes(q) || l.code.toLowerCase().includes(q)) {
        results.push({
          title: `${l.code} — ${l.name}`,
          subtitle: l.active ? 'Active' : 'Inactive',
          icon: 'pi pi-box',
          type: 'Ligne',
          route: '/admin/lines'
        });
      }
    });

    this.searchResults = results.slice(0, 8);
  });
}

goToResult(result: any): void {
  this.closeSearch();
  this.router.navigate([result.route]);
}

// Add helper to get zone name
private getZoneName(zoneId: number): string {
  return this.zones?.find(z => z.id === zoneId)?.name || '—';
}
}