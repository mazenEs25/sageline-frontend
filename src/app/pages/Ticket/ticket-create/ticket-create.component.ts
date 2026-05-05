import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { forkJoin } from 'rxjs';
import { Phase } from '../../../models/phase.model';
import { ProductionLine } from '../../../models/production-line.model';
import { Secteur } from '../../../models/secteur.model';
import { TicketAssignment, TicketCreateRequest } from '../../../models/ticket.model';
import { User } from '../../../models/user.model';
import { ValidationZone } from '../../../models/validation-zone.model';
import { PhaseService } from '../../../services/phase.service';
import { ProductionLineService } from '../../../services/production-line.service';
import { SecteurService } from '../../../services/secteur.service';
import { TicketService } from '../../../services/ticket.service';
import { UserService } from '../../../services/user.service';
import { ValidationZoneService } from '../../../services/validation-zone.service';
import { Priority } from '../../../shared/enums/ticket.enum';


@Component({
  selector: 'app-ticket-create',
  templateUrl: './ticket-create.component.html',
  styleUrls: ['./ticket-create.component.scss'],
  providers: [MessageService]
})
export class TicketCreateComponent implements OnInit {
  // Cascade data
  secteurs: Secteur[] = [];
  phases: Phase[] = [];
  lines: ProductionLine[] = [];
  /**
   * 2026-04 line-ticket model: the cascade stops at the line. The postes
   * below are shown as toggleable chips — by default every poste is
   * included (= covered by the ticket). The user may click a chip to
   * exclude it; only the remaining postes get a ValidationPosteStatus
   * sub-row on the server.
   */
  zones: ValidationZone[] = [];
  /**
   * Zone ids the user explicitly excluded from the ticket. Rebuilt every
   * time the line changes so we never carry exclusions across lines.
   */
  excludedZoneIds = new Set<number>();
  users: User[] = [];
  today = new Date();

  // Form
  selectedSecteur: number | null = null;
  selectedPhase: number | null = null;
  selectedLine: number | null = null;
  plannedDate: Date | null = null;
  selectedPriority: Priority = 'NORMALE';
  comments = '';

  // Assignments
  assignments: TicketAssignment[] = [];
  techValUsers: User[] = [];
  techPrepUsers: User[] = [];
  techValIds: number[] = [];
  techPrepIds: number[] = [];

  // Search for the assignment pickers (Step 2)
  techPrepSearch = '';
  techValSearch = '';

  priorityOptions = [
    { label: 'Basse', value: 'BASSE' },
    { label: 'Normale', value: 'NORMALE' },
    { label: 'Haute', value: 'HAUTE' },
    { label: 'Urgente', value: 'URGENTE' }
  ];

  currentStep = 0;
  submitting = false;

  stepsMeta: string[] = ['Localisation', 'Planification', 'Affectation', 'Confirmation'];

  constructor(
    private secteurService: SecteurService,
    private phaseService: PhaseService,
    private lineService: ProductionLineService,
    private zoneService: ValidationZoneService,
    private ticketService: TicketService,
    private userService: UserService,
    private router: Router,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.secteurService.getActive().subscribe(data => this.secteurs = data);
    this.userService.getAll().subscribe(users => {
      this.users = users;
      this.techValUsers = users.filter(u => u.role === 'TECH_VAL');
      this.techPrepUsers = users.filter(u => u.role === 'TECH_PREP');
    });
  }

  // Cascade handlers
  onSecteurChange() {
    this.phases = [];
    this.lines = [];
    this.zones = [];
    this.selectedPhase = null;
    this.selectedLine = null;

    if (this.selectedSecteur) {
      this.phaseService.getBySecteur(this.selectedSecteur).subscribe(data => this.phases = data);
    }
  }

  onPhaseChange() {
    this.lines = [];
    this.zones = [];
    this.selectedLine = null;

    if (this.selectedPhase) {
      this.lineService.getByPhase(this.selectedPhase).subscribe(data => this.lines = data);
    }
  }

  onLineChange() {
    this.zones = [];
    // Never carry exclusions across lines — a poste id that was "excluded"
    // on line A would silently exclude a different poste on line B.
    this.excludedZoneIds = new Set<number>();
    // Re-sync assignments so the zone hint on each assignment falls back
    // to the new line's primary poste on the server side.
    this.syncAssignments();

    if (this.selectedLine) {
      // Load the postes. Each poste starts INCLUDED (not in excludedZoneIds).
      // The user can click a chip to exclude it from the ticket.
      this.zoneService.getByLine(this.selectedLine).subscribe(data => {
        this.zones = (data || []).sort((a, b) =>
          (a.orderInLine ?? 0) - (b.orderInLine ?? 0));
      });
    }
  }

  // ─── Poste inclusion/exclusion (Step 0) ──────────────────────────

  isPosteExcluded(zoneId: number): boolean {
    return this.excludedZoneIds.has(zoneId);
  }

  togglePoste(zoneId: number): void {
    if (this.excludedZoneIds.has(zoneId)) {
      this.excludedZoneIds.delete(zoneId);
    } else {
      this.excludedZoneIds.add(zoneId);
    }
    // Trigger change detection for OnPush-style consumers by replacing the Set.
    this.excludedZoneIds = new Set(this.excludedZoneIds);
  }

  includeAllPostes(): void {
    this.excludedZoneIds = new Set<number>();
  }

  get includedPostesCount(): number {
    return this.zones.length - this.excludedZoneIds.size;
  }

  // Assignment management

  /**
   * Recompute `assignments` whenever either multiselect changes. Using two
   * independent lists (techPrepIds / techValIds) lets the multiselect chip
   * display stay in sync with the recap card and avoids the old "dropdown
   * adds, can't remove from dropdown" confusion.
   */
  syncAssignments(): void {
    // 2026-04 line-ticket model: we don't pin assignments to a specific poste
    // at creation time. The server will fall back to the line's primary poste
    // (first ValidationZone by orderInLine) when zoneId is undefined, and the
    // tech can later mark any poste of the line as done via markPosteDone.
    this.assignments = [
      ...this.techPrepIds.map(userId => ({
        userId,
        assignmentRole: 'TECH_PREPARATION'
      })),
      ...this.techValIds.map(userId => ({
        userId,
        assignmentRole: 'TECH_VALIDATION'
      }))
    ];
  }

  removeAssignment(idx: number) {
    const removed = this.assignments[idx];
    this.assignments.splice(idx, 1);
    if (!removed) return;
    if (removed.assignmentRole === 'TECH_PREPARATION') {
      this.techPrepIds = this.techPrepIds.filter(id => id !== removed.userId);
    } else if (removed.assignmentRole === 'TECH_VALIDATION') {
      this.techValIds = this.techValIds.filter(id => id !== removed.userId);
    }
  }

  getUserName(userId: number): string {
    return this.users.find(u => u.id === userId)?.username || 'Inconnu';
  }

  // ─── Assignment picker helpers (Step 2) ──────────────────────────

  /** Two-letter initials used inside the avatar bubble. */
  userInitials(u: User): string {
    const first = (u.firstName || u.username || '?').charAt(0);
    const second = (u.lastName || u.username?.charAt(1) || '').charAt(0);
    return (first + second).toUpperCase();
  }

  /** Nice display name with fallback to username. */
  userDisplay(u: User): string {
    const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
    return name || u.username;
  }

  /** Stable color class for the avatar (8 buckets based on user id). */
  avatarTone(u: User): string {
    return `tone-${(u.id ?? 0) % 8}`;
  }

  filteredTechPrep(): User[] {
    const q = this.techPrepSearch.trim().toLowerCase();
    if (!q) return this.techPrepUsers;
    return this.techPrepUsers.filter(u =>
      (u.username || '').toLowerCase().includes(q) ||
      (u.firstName || '').toLowerCase().includes(q) ||
      (u.lastName || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q));
  }

  filteredTechVal(): User[] {
    const q = this.techValSearch.trim().toLowerCase();
    if (!q) return this.techValUsers;
    return this.techValUsers.filter(u =>
      (u.username || '').toLowerCase().includes(q) ||
      (u.firstName || '').toLowerCase().includes(q) ||
      (u.lastName || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q));
  }

  isPrepSelected(u: User): boolean {
    return this.techPrepIds.includes(u.id);
  }

  isValSelected(u: User): boolean {
    return this.techValIds.includes(u.id);
  }

  togglePrep(u: User): void {
    if (this.isPrepSelected(u)) {
      this.techPrepIds = this.techPrepIds.filter(id => id !== u.id);
    } else {
      this.techPrepIds = [...this.techPrepIds, u.id];
    }
    this.syncAssignments();
  }

  toggleVal(u: User): void {
    if (this.isValSelected(u)) {
      this.techValIds = this.techValIds.filter(id => id !== u.id);
    } else {
      this.techValIds = [...this.techValIds, u.id];
    }
    this.syncAssignments();
  }

  clearPrepSelection(): void {
    this.techPrepIds = [];
    this.syncAssignments();
  }

  clearValSelection(): void {
    this.techValIds = [];
    this.syncAssignments();
  }

  trackUser = (_: number, u: User) => u.id;

  // Steps
  nextStep() { if (this.currentStep < 3) this.currentStep++; }
  prevStep() { if (this.currentStep > 0) this.currentStep--; }

  get canProceedStep0() {
    // Line-ticket model: cascade stops at the line. Require at least one
    // poste on that line AND at least one poste still included — the user
    // can't exclude every poste.
    return !!(this.selectedSecteur && this.selectedPhase && this.selectedLine
              && this.zones.length > 0
              && this.includedPostesCount > 0);
  }
  get canProceedStep1() { return this.plannedDate; }
  get canProceedStep2() { return this.assignments.length > 0; }

  // Submit
  submit() {
    if (!this.selectedLine || !this.plannedDate) return;
    this.submitting = true;

    // Build the included list only when the user actually excluded something.
    // Passing the full list when nothing is excluded would be noise and force
    // the backend to re-validate every id.
    const includedZoneIds = this.excludedZoneIds.size > 0
      ? this.zones
          .filter(z => !this.excludedZoneIds.has(z.id))
          .map(z => z.id)
      : undefined;

    const dto: TicketCreateRequest = {
      productionLineId: this.selectedLine,
      plannedDate: this.formatDate(this.plannedDate),
      priority: this.selectedPriority,
      comments: this.comments || undefined,
      assignments: this.assignments,
      includedZoneIds
    };

    console.log('[TicketCreate] Submitting payload:', JSON.stringify(dto, null, 2));

    this.ticketService.create(dto).subscribe({
      next: (result) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Ticket Créé',
          detail: `Ticket ${result.ticketCode} créé avec succès`
        });
        setTimeout(() => this.router.navigate(['/validations', result.id]), 1500);
      },
      error: (err) => {
        this.messageService.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message || 'Erreur' });
        this.submitting = false;
      }
    });
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}