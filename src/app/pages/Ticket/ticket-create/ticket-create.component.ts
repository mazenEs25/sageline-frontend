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
  zones: ValidationZone[] = [];
  users: User[] = [];
  today = new Date();

  // Form
  selectedSecteur: number | null = null;
  selectedPhase: number | null = null;
  selectedLine: number | null = null;
  selectedZone: number | null = null;
  plannedDate: Date | null = null;
  selectedPriority: Priority = 'NORMALE';
  comments = '';

  // Assignments
  assignments: TicketAssignment[] = [];
  techValUsers: User[] = [];
  techPrepUsers: User[] = [];

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
    this.selectedZone = null;

    if (this.selectedSecteur) {
      this.phaseService.getBySecteur(this.selectedSecteur).subscribe(data => this.phases = data);
    }
  }

  onPhaseChange() {
    this.lines = [];
    this.zones = [];
    this.selectedLine = null;
    this.selectedZone = null;

    if (this.selectedPhase) {
      this.lineService.getByPhase(this.selectedPhase).subscribe(data => this.lines = data);
    }
  }

  onLineChange() {
    this.zones = [];
    this.selectedZone = null;

    if (this.selectedLine) {
      this.zoneService.getByLine(this.selectedLine).subscribe(data => this.zones = data);
    }
  }

  // Assignment management
  addAssignment(userId: number, role: string) {
    if (!this.selectedZone) return;
    const exists = this.assignments.find(a => a.userId === userId && a.assignmentRole === role);
    if (exists) return;

    this.assignments.push({
      userId,
      assignmentRole: role,
      zoneId: this.selectedZone
    });
  }

  removeAssignment(idx: number) {
    this.assignments.splice(idx, 1);
  }

  getUserName(userId: number): string {
    return this.users.find(u => u.id === userId)?.username || 'Inconnu';
  }

  // Steps
  nextStep() { if (this.currentStep < 3) this.currentStep++; }
  prevStep() { if (this.currentStep > 0) this.currentStep--; }

  get canProceedStep0() { return this.selectedSecteur && this.selectedPhase && this.selectedLine && this.selectedZone; }
  get canProceedStep1() { return this.plannedDate; }
  get canProceedStep2() { return this.assignments.length > 0; }

  // Submit
  submit() {
    if (!this.selectedZone || !this.plannedDate) return;
    this.submitting = true;

    const dto: TicketCreateRequest = {
      validationZoneId: this.selectedZone,
      plannedDate: this.formatDate(this.plannedDate),
      priority: this.selectedPriority,
      comments: this.comments || undefined,
      assignments: this.assignments
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