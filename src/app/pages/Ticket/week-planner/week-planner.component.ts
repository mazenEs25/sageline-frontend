import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService, ConfirmationService } from 'primeng/api';
import { forkJoin } from 'rxjs';

import { Phase } from '../../../models/phase.model';
import { ProductionLine } from '../../../models/production-line.model';
import { Secteur } from '../../../models/secteur.model';
import { TicketAssignment, TicketCreateRequest, TicketWeekPlanRequest } from '../../../models/ticket.model';
import { User } from '../../../models/user.model';
import { Validation } from '../../../models/validation.model';
import { ValidationZone } from '../../../models/validation-zone.model';

import { PhaseService } from '../../../services/phase.service';
import { ProductionLineService } from '../../../services/production-line.service';
import { SecteurService } from '../../../services/secteur.service';
import { TicketService } from '../../../services/ticket.service';
import { UserService } from '../../../services/user.service';
import { ValidationZoneService } from '../../../services/validation-zone.service';

import { Priority, PRIORITY_LABELS } from '../../../shared/enums/ticket.enum';

interface DayBucket {
  date: Date;
  dateIso: string;             // yyyy-MM-dd
  label: string;               // "Lun"
  dayNumber: number;           // 14
  monthShort: string;          // "Avr"
  isToday: boolean;
  isWeekend: boolean;
  existing: Validation[];      // tickets already saved on backend
  drafts: DraftTicket[];       // tickets staged in this planning session
}

interface DraftTicket {
  tempId: string;              // for *ngFor + remove
  /** 2026-04 line-ticket model: drafts target a whole line, not a single zone. */
  productionLineId: number;
  lineCode?: string;
  lineLabel: string;           // "L01 — Ligne Assemblage"
  posteCount: number;          // postes auto-seeded server-side
  plannedDate: string;         // yyyy-MM-dd
  priority: Priority;
  comments?: string;
  assignments: TicketAssignment[];
}

@Component({
  selector: 'app-week-planner',
  templateUrl: './week-planner.component.html',
  styleUrls: ['./week-planner.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class WeekPlannerComponent implements OnInit {
  // ─── Reference data ──────────────────────────────────────────────
  secteurs: Secteur[] = [];
  phases: Phase[] = [];
  lines: ProductionLine[] = [];
  zones: ValidationZone[] = [];
  users: User[] = [];
  techValUsers: User[] = [];
  techPrepUsers: User[] = [];

  // ─── Week navigation ────────────────────────────────────────────
  weekStart!: Date;             // Monday of current week
  weekEnd!: Date;               // Sunday of current week
  days: DayBucket[] = [];
  loadingWeek = false;

  // ─── Draft state ─────────────────────────────────────────────────
  drafts: DraftTicket[] = [];
  publishing = false;

  // ─── "Add validation" dialog ────────────────────────────────────
  showAddDialog = false;
  selectedDayIso: string | null = null;
  formSecteur: number | null = null;
  formPhase: number | null = null;
  formLine: number | null = null;
  /**
   * 2026-04 line-ticket model: cascade stops at the line. Zones/postes below
   * are a read-only preview of what will be auto-seeded server-side.
   */
  formPriority: Priority = 'NORMALE';
  formComments = '';
  formTechValIds: number[] = [];
  formTechPrepIds: number[] = [];

  // Search for the picker cards inside the dialog
  formTechPrepSearch = '';
  formTechValSearch = '';

  priorityOptions = Object.entries(PRIORITY_LABELS).map(([k, v]) => ({ label: v, value: k as Priority }));

  constructor(
    private secteurService: SecteurService,
    private phaseService: PhaseService,
    private lineService: ProductionLineService,
    private zoneService: ValidationZoneService,
    private ticketService: TicketService,
    private userService: UserService,
    private router: Router,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.initWeek(new Date());

    forkJoin({
      secteurs: this.secteurService.getActive(),
      users: this.userService.getAll()
    }).subscribe(({ secteurs, users }) => {
      this.secteurs = secteurs;
      this.users = users;
      this.techValUsers = users.filter(u => u.role === 'TECH_VAL');
      this.techPrepUsers = users.filter(u => u.role === 'TECH_PREP');
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  Week navigation
  // ═══════════════════════════════════════════════════════════════
  private initWeek(reference: Date): void {
    const monday = this.startOfWeek(reference);
    this.weekStart = monday;
    this.weekEnd = this.addDays(monday, 6);
    this.buildDays();
    this.loadWeek();
  }

  prevWeek(): void {
    this.initWeek(this.addDays(this.weekStart, -7));
  }

  nextWeek(): void {
    this.initWeek(this.addDays(this.weekStart, 7));
  }

  goToCurrentWeek(): void {
    this.initWeek(new Date());
  }

  private startOfWeek(d: Date): Date {
    const date = new Date(d);
    const day = date.getDay();                  // 0 = Sun
    const diff = (day === 0 ? -6 : 1 - day);    // shift to Monday
    date.setDate(date.getDate() + diff);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private addDays(d: Date, n: number): Date {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return r;
  }

  private buildDays(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = this.toIso(today);
    const dayLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const monthShort = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

    this.days = Array.from({ length: 7 }, (_, i) => {
      const d = this.addDays(this.weekStart, i);
      const iso = this.toIso(d);
      return {
        date: d,
        dateIso: iso,
        label: dayLabels[i],
        dayNumber: d.getDate(),
        monthShort: monthShort[d.getMonth()],
        isToday: iso === todayIso,
        isWeekend: i >= 5,
        existing: [],
        drafts: this.drafts.filter(x => x.plannedDate === iso)
      };
    });
  }

  private toIso(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }

  /**
   * Statuses considered "terminal" — we hide these from the weekly planner
   * board because the planner is for scheduling and active work, not for
   * looking at cancelled/closed tickets.
   */
  private readonly HIDDEN_STATUSES = new Set(['ANNULE', 'CONFORME', 'NON_CONFORME']);

  private loadWeek(): void {
    this.loadingWeek = true;
    const dateParam = this.toIso(this.weekStart);
    this.ticketService.getByWeek(dateParam).subscribe({
      next: (tickets) => {
        // Drop terminal tickets first — the planner should only surface
        // validations that are still live (planifié, en cours, en revue, etc.)
        const activeTickets = tickets.filter(t => !this.HIDDEN_STATUSES.has((t.status || '') as string));
        const hiddenCount = tickets.length - activeTickets.length;

        // Bucket existing tickets by plannedDate (yyyy-MM-dd). The backend may
        // send the date as either "yyyy-MM-dd" or a full ISO string with a
        // time component, so we normalize to the first 10 characters before
        // comparing.
        const unbucketed: Validation[] = [];
        for (const day of this.days) {
          day.existing = [];
        }
        for (const t of activeTickets) {
          const rawDate = (t.plannedDate || '').toString();
          const isoDay = rawDate.length >= 10 ? rawDate.substring(0, 10) : rawDate;
          const bucket = this.days.find(d => d.dateIso === isoDay);
          if (bucket) {
            bucket.existing.push(t);
          } else {
            unbucketed.push(t);
          }
        }
        if (unbucketed.length) {
          console.warn(
            '[WeekPlanner] Received tickets outside the current week window:',
            unbucketed.map(t => ({ id: t.id, code: t.ticketCode, plannedDate: t.plannedDate }))
          );
        }
        console.log(
          `[WeekPlanner] Loaded week ${dateParam}: ${tickets.length} ticket(s) received, ` +
          `${hiddenCount} filtered (terminal), ${activeTickets.length - unbucketed.length} placed in day buckets`
        );
        this.loadingWeek = false;
      },
      error: (err) => {
        console.error('[WeekPlanner] Failed to load week', dateParam, err);
        this.messageService.add({
          severity: 'error',
          summary: 'Chargement impossible',
          detail: err?.error?.message || 'Impossible de charger les validations de la semaine.'
        });
        this.loadingWeek = false;
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  Add validation dialog
  // ═══════════════════════════════════════════════════════════════
  openAddDialog(dayIso: string): void {
    this.selectedDayIso = dayIso;
    this.resetForm();
    this.showAddDialog = true;
  }

  closeAddDialog(): void {
    this.showAddDialog = false;
    this.selectedDayIso = null;
  }

  private resetForm(): void {
    this.formSecteur = null;
    this.formPhase = null;
    this.formLine = null;
    this.formPriority = 'NORMALE';
    this.formComments = '';
    this.formTechValIds = [];
    this.formTechPrepIds = [];
    this.formTechPrepSearch = '';
    this.formTechValSearch = '';
    this.phases = [];
    this.lines = [];
    this.zones = [];
  }

  // ─── Tech picker helpers (shared look with ticket-create Step 2) ──────

  userInitials(u: User): string {
    const first = (u.firstName || u.username || '?').charAt(0);
    const second = (u.lastName || u.username?.charAt(1) || '').charAt(0);
    return (first + second).toUpperCase();
  }

  userDisplay(u: User): string {
    const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
    return name || u.username;
  }

  avatarTone(u: User): string {
    return `tone-${(u.id ?? 0) % 8}`;
  }

  private matchUser(u: User, q: string): boolean {
    if (!q) return true;
    const needle = q.toLowerCase();
    return (u.username || '').toLowerCase().includes(needle) ||
           (u.firstName || '').toLowerCase().includes(needle) ||
           (u.lastName || '').toLowerCase().includes(needle) ||
           (u.email || '').toLowerCase().includes(needle);
  }

  filteredFormTechPrep(): User[] {
    const q = this.formTechPrepSearch.trim();
    return !q ? this.techPrepUsers : this.techPrepUsers.filter(u => this.matchUser(u, q));
  }

  filteredFormTechVal(): User[] {
    const q = this.formTechValSearch.trim();
    return !q ? this.techValUsers : this.techValUsers.filter(u => this.matchUser(u, q));
  }

  isFormPrepSelected(u: User): boolean { return this.formTechPrepIds.includes(u.id); }
  isFormValSelected(u: User): boolean  { return this.formTechValIds.includes(u.id); }

  toggleFormPrep(u: User): void {
    this.formTechPrepIds = this.isFormPrepSelected(u)
      ? this.formTechPrepIds.filter(id => id !== u.id)
      : [...this.formTechPrepIds, u.id];
  }

  toggleFormVal(u: User): void {
    this.formTechValIds = this.isFormValSelected(u)
      ? this.formTechValIds.filter(id => id !== u.id)
      : [...this.formTechValIds, u.id];
  }

  clearFormPrep(): void { this.formTechPrepIds = []; }
  clearFormVal(): void { this.formTechValIds = []; }

  trackUser = (_: number, u: User) => u.id;

  get formTotalAssignments(): number {
    return this.formTechPrepIds.length + this.formTechValIds.length;
  }

  onSecteurChange(): void {
    this.phases = [];
    this.lines = [];
    this.zones = [];
    this.formPhase = null;
    this.formLine = null;
    if (this.formSecteur) {
      this.phaseService.getBySecteur(this.formSecteur).subscribe(data => this.phases = data);
    }
  }

  onPhaseChange(): void {
    this.lines = [];
    this.zones = [];
    this.formLine = null;
    if (this.formPhase) {
      this.lineService.getByPhase(this.formPhase).subscribe(data => this.lines = data);
    }
  }

  onLineChange(): void {
    // 2026-04 line-ticket model: postes are shown read-only so the user knows
    // what sub-rows will be auto-seeded server-side. They are not pickable.
    this.zones = [];
    if (this.formLine) {
      this.zoneService.getByLine(this.formLine).subscribe(data => {
        this.zones = (data || []).sort((a, b) =>
          (a.orderInLine ?? 0) - (b.orderInLine ?? 0));
      });
    }
  }

  get canSaveDraft(): boolean {
    // Line + at least one seed-able poste (so the preview is non-empty).
    return !!(this.selectedDayIso && this.formLine && this.formPriority
              && this.zones.length > 0);
  }

  saveDraft(): void {
    if (!this.canSaveDraft) return;

    const line = this.lines.find(l => l.id === this.formLine);

    // Line-ticket model: don't pin assignments to a specific poste at creation.
    // The server falls back to the primary poste (first by orderInLine) when
    // zoneId is omitted, and techs can later mark any poste done.
    const assignments: TicketAssignment[] = [
      ...this.formTechValIds.map(uid => ({
        userId: uid,
        assignmentRole: 'TECH_VALIDATION'
      })),
      ...this.formTechPrepIds.map(uid => ({
        userId: uid,
        assignmentRole: 'TECH_PREPARATION'
      }))
    ];

    const draft: DraftTicket = {
      tempId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      productionLineId: this.formLine!,
      lineCode: line?.code,
      lineLabel: line ? (line.name ? `${line.code} — ${line.name}` : line.code) : 'Ligne',
      posteCount: this.zones.length,
      plannedDate: this.selectedDayIso!,
      priority: this.formPriority,
      comments: this.formComments || undefined,
      assignments
    };

    this.drafts.push(draft);
    this.refreshDayDrafts();
    this.messageService.add({
      severity: 'success',
      summary: 'Validation ajoutée',
      detail: `${draft.lineLabel} planifiée pour le ${this.selectedDayIso}`,
      life: 2200
    });
    this.closeAddDialog();
  }

  removeDraft(tempId: string): void {
    this.drafts = this.drafts.filter(d => d.tempId !== tempId);
    this.refreshDayDrafts();
  }

  private refreshDayDrafts(): void {
    for (const day of this.days) {
      day.drafts = this.drafts.filter(x => x.plannedDate === day.dateIso);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  //  Publish week
  // ═══════════════════════════════════════════════════════════════
  publishWeek(): void {
    if (this.drafts.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Rien à publier',
        detail: 'Ajoutez au moins une validation à la semaine.'
      });
      return;
    }

    this.confirmationService.confirm({
      header: 'Publier la semaine',
      message: `Confirmer la publication de ${this.drafts.length} validation${this.drafts.length > 1 ? 's' : ''} ?`,
      icon: 'pi pi-calendar-plus',
      acceptLabel: 'Publier',
      rejectLabel: 'Annuler',
      accept: () => this.doPublish()
    });
  }

  private doPublish(): void {
    this.publishing = true;

    const tickets: TicketCreateRequest[] = this.drafts.map(d => ({
      productionLineId: d.productionLineId,
      plannedDate: d.plannedDate,
      plannedWeekStart: this.toIso(this.weekStart),
      plannedWeekEnd: this.toIso(this.weekEnd),
      priority: d.priority,
      comments: d.comments,
      assignments: d.assignments
    }));

    const payload: TicketWeekPlanRequest = {
      weekStart: this.toIso(this.weekStart),
      weekEnd: this.toIso(this.weekEnd),
      tickets
    };

    this.ticketService.planWeek(payload).subscribe({
      next: (created) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Semaine publiée',
          detail: `${created.length} validation${created.length > 1 ? 's créées' : ' créée'}`,
          life: 3000
        });
        this.drafts = [];
        this.publishing = false;
        this.loadWeek();        // refresh existing
        this.refreshDayDrafts();
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Échec de la publication',
          detail: err?.error?.message || 'Une erreur est survenue.'
        });
        this.publishing = false;
      }
    });
  }

  clearDrafts(): void {
    if (this.drafts.length === 0) return;
    this.confirmationService.confirm({
      header: 'Effacer les brouillons',
      message: `Supprimer les ${this.drafts.length} validation${this.drafts.length > 1 ? 's' : ''} non publiée${this.drafts.length > 1 ? 's' : ''} ?`,
      icon: 'pi pi-trash',
      acceptLabel: 'Effacer',
      rejectLabel: 'Annuler',
      accept: () => {
        this.drafts = [];
        this.refreshDayDrafts();
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════
  //  Display helpers
  // ═══════════════════════════════════════════════════════════════
  getUserName(userId: number): string {
    const u = this.users.find(x => x.id === userId);
    if (!u) return 'Inconnu';
    return u.firstName ? `${u.firstName} ${u.lastName || ''}`.trim() : u.username;
  }

  priorityClass(p: Priority): string {
    return `pri pri-${(p || 'NORMALE').toLowerCase()}`;
  }

  weekRangeLabel(): string {
    const fmt = (d: Date) => `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    return `${fmt(this.weekStart)} → ${fmt(this.weekEnd)} ${this.weekEnd.getFullYear()}`;
  }

  get totalDrafts(): number { return this.drafts.length; }
  get totalExisting(): number { return this.days.reduce((s, d) => s + d.existing.length, 0); }

  trackDraft = (_: number, d: DraftTicket) => d.tempId;
  trackExisting = (_: number, t: Validation) => t.id;
  trackDay = (_: number, d: DayBucket) => d.dateIso;

  viewExisting(t: Validation): void {
    this.router.navigate(['/validations', t.id]);
  }
}
