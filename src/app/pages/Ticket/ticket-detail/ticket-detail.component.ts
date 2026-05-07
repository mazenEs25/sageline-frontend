import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { MessageService, ConfirmationService } from 'primeng/api';
import { AuthService } from '../../../auth/auth.service';
import { PosteStatus, Validation } from '../../../models/validation.model';
import { TicketService } from '../../../services/ticket.service';
import { ValidationResultService } from '../../../services/validation-result.service';
import { WebSocketService } from '../../../services/websocket.service';


@Component({
  selector: 'app-ticket-detail',
  templateUrl: './ticket-detail.component.html',
  styleUrls: ['./ticket-detail.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class TicketDetailComponent implements OnInit, OnDestroy {
  ticket: Validation | null = null;
  loading = true;
  ticketId!: number;

  // Prep dialog
  showPrepDialog = false;
  toolsAvailable = true;
  prepComments = '';

  // Close dialog
  showCloseDialog = false;
  finalStatus = 'CONFORME';
  reviewComments = '';

  // Cancel dialog
  showCancelDialog = false;
  cancelReason = '';

  // Handover initiate dialog
  showInitiateHandoverDialog = false;

  // Add Result dialog (per-poste, batch-capable)
  showResultDialog = false;
  savingResult = false;
  /**
   * One row in the batch result form.
   * `zoneId` is required so the result is attached to a specific poste of the line
   * (2026-04 line-ticket model). The backend validates the link.
   */
  resultRows: Array<{
    zoneId: number | null;
    parameter: string;
    measuredValue: number | null;
    expectedValue: number | null;
  }> = [];

  // Mark Poste Done dialog
  showPosteDialog = false;
  savingPoste = false;
  activePoste: PosteStatus | null = null;
  posteFinalStatus: 'CONFORME' | 'NON_CONFORME' = 'CONFORME';
  posteNotes = '';

  private wsTopic: string | null = null;
  private wsSubscription?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ticketService: TicketService,
    private resultService: ValidationResultService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    public authService: AuthService,
    private wsService: WebSocketService
  ) {}

  ngOnInit() {
    this.ticketId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadTicket();
    this.subscribeToTicketUpdates();

    this.wsSubscription = this.wsService.ticketNotifications$.subscribe(notification => {
      if (notification && +notification.validationId === this.ticketId) {
        this.loadTicket();
      }
    });
  }

  ngOnDestroy() {
    if (this.wsTopic) {
      this.wsService.unsubscribe(this.wsTopic);
      this.wsTopic = null;
    }
    this.wsSubscription?.unsubscribe();
  }

  /**
   * Subscribe to real-time updates for THIS specific ticket.
   * Any workflow transition (startPrep, validatePrep, startValidation, …)
   * broadcasts the refreshed ticket DTO to /topic/tickets.{id} on the backend,
   * so we can update the view without a manual reload.
   */
  private subscribeToTicketUpdates(): void {
    this.wsTopic = `/topic/tickets.${this.ticketId}`;
    this.wsService.subscribe(this.wsTopic, (msg: any) => {
      if (msg && msg.id === this.ticketId) {
        this.ticket = msg as Validation;
      } else {
        // Fallback: re-fetch if payload shape is unexpected
        this.loadTicket();
      }
    });
  }

  loadTicket() {
    this.loading = true;
    this.ticketService.getById(this.ticketId).subscribe({
      next: (data) => { this.ticket = data; this.loading = false; },
      error: () => { this.loading = false; this.router.navigate(['/validations']); }
    });
  }

  // ===== WORKFLOW ACTIONS =====

  startPrep() {
    this.ticketService.startPrep(this.ticketId).subscribe({
      next: () => { this.success('Préparation démarrée'); this.loadTicket(); },
      error: (err) => this.error(err)
    });
  }

  submitPrepValidation() {
    this.ticketService.validatePrep(this.ticketId, {
      toolsAvailable: this.toolsAvailable,
      prepComments: this.prepComments
    }).subscribe({
      next: () => {
        this.success(this.toolsAvailable ? 'Outillage validé' : 'Outillage non disponible signalé');
        this.showPrepDialog = false;
        this.loadTicket();
      },
      error: (err) => this.error(err)
    });
  }

  startValidation() {
    this.ticketService.startValidation(this.ticketId).subscribe({
      next: () => { this.success('Validation démarrée'); this.loadTicket(); },
      error: (err) => this.error(err)
    });
  }

  submitForReview() {
    this.confirmationService.confirm({
      message: 'Soumettre ce ticket pour revue ? Cette action est irréversible.',
      accept: () => {
        this.ticketService.submitForReview(this.ticketId).subscribe({
          next: () => { this.success('Soumis pour revue'); this.loadTicket(); },
          error: (err) => this.error(err)
        });
      }
    });
  }

  closeTicket() {
    this.ticketService.closeTicket(this.ticketId, {
      finalStatus: this.finalStatus,
      reviewComments: this.reviewComments
    }).subscribe({
      next: () => {
        this.success(`Ticket clôturé: ${this.finalStatus}`);
        this.showCloseDialog = false;
        this.loadTicket();
      },
      error: (err) => this.error(err)
    });
  }

  cancelTicket() {
    this.ticketService.cancelTicket(this.ticketId, this.cancelReason).subscribe({
      next: () => {
        this.success('Ticket annulé');
        this.showCancelDialog = false;
        this.loadTicket();
      },
      error: (err) => this.error(err)
    });
  }

  // ===== UI HELPERS =====

  canStartPrep(): boolean { return this.ticket?.status === 'PLANIFIE'; }
  canValidatePrep(): boolean { return this.ticket?.status === 'EN_ATTENTE_PREP'; }
  canStartValidation(): boolean { return this.ticket?.status === 'PREP_VALIDEE'; }
  canSubmitReview(): boolean { return this.ticket?.status === 'EN_COURS'; }
  canClose(): boolean { return this.ticket?.status === 'EN_REVUE'; }
  canCancel(): boolean { return !['CONFORME', 'NON_CONFORME', 'ANNULE'].includes(this.ticket?.status || ''); }

  /**
   * TECH_VAL can hand off a ticket only while it is EN_COURS AND they are
   * the active assignee. ADMIN_IT / CHEF_SECTEUR can force a handover at any
   * time (the backend resolves the trigger type from the role + assignment).
   */
  canInitiateHandover(): boolean {
    if (this.ticket?.status !== 'EN_COURS') return false;
    const roles = this.authService.getRoles();
    if (roles.includes('ADMIN_IT') || roles.includes('CHEF_SECTEUR')) return true;
    if (!roles.includes('TECH_VAL')) return false;
    const myId = this.authService.getCurrentUserId();
    return (this.ticket?.assignments ?? []).some(
      a => a.userId === myId && a.status === 'EN_COURS'
    );
  }

  /** Only TECH_VAL and CHEF_SECTEUR can add results, and only while the ticket is EN_COURS */
  canAddResult(): boolean {
    if (this.ticket?.status !== 'EN_COURS') return false;
    const roles = this.authService.getRoles();
    return roles.includes('TECH_VAL') || roles.includes('CHEF_SECTEUR') || roles.includes('ADMIN_IT');
  }

  /** Postes the user can attach a result to (only postes that aren't terminal). */
  get assignablePostes(): PosteStatus[] {
    return (this.ticket?.posteStatuses || []).filter(p => !this.isPosteTerminal(p));
  }

  /** Options for the poste dropdown in the result dialog. */
  get posteOptions(): Array<{ label: string; value: number }> {
    return this.assignablePostes.map(p => ({
      label: p.zoneName,
      value: p.zoneId
    }));
  }

  /** Default zoneId for a new row: the first assignable poste, if any. */
  private defaultZoneId(): number | null {
    const first = this.assignablePostes[0];
    return first ? first.zoneId : null;
  }

  trackByIndex(index: number): number { return index; }

  /** Build an empty batch row. */
  private blankResultRow() {
    return {
      zoneId: this.defaultZoneId(),
      parameter: '',
      measuredValue: null as number | null,
      expectedValue: null as number | null
    };
  }

  openResultDialog(): void {
    this.resultRows = [this.blankResultRow()];
    this.showResultDialog = true;
  }

  addResultRow(): void {
    this.resultRows.push(this.blankResultRow());
  }

  removeResultRow(index: number): void {
    if (this.resultRows.length <= 1) return;
    this.resultRows.splice(index, 1);
  }

  /** Live preview per row: is the measure conformant (5% tolerance)? */
  rowIsConform(row: { measuredValue: number | null; expectedValue: number | null }): boolean | null {
    if (row.measuredValue === null || row.expectedValue === null || row.expectedValue === 0) return null;
    const deviation = Math.abs(row.measuredValue - row.expectedValue) / row.expectedValue;
    return deviation <= 0.05;
  }

  /** A row is valid if zone, parameter, measured and expected are all set. */
  isRowValid(row: { zoneId: number | null; parameter: string; measuredValue: number | null; expectedValue: number | null }): boolean {
    return row.zoneId != null
      && !!row.parameter.trim()
      && row.measuredValue !== null
      && row.expectedValue !== null;
  }

  get allRowsValid(): boolean {
    return this.resultRows.length > 0 && this.resultRows.every(r => this.isRowValid(r));
  }

  saveResult(): void {
    if (!this.allRowsValid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Champs requis',
        detail: 'Chaque ligne doit avoir poste, paramètre, valeurs mesurée et attendue.'
      });
      return;
    }

    const payload = this.resultRows.map(r => ({
      validationId: this.ticketId,
      zoneId: r.zoneId,
      parameter: r.parameter.trim(),
      measuredValue: r.measuredValue!,
      expectedValue: r.expectedValue!
    }));

    this.savingResult = true;

    // Single row → /create. N rows → /batch (one AI prediction at the end).
    const obs: Observable<any> = payload.length === 1
      ? this.resultService.create(payload[0] as any)
      : this.resultService.createBatch(payload as any);

    obs.subscribe({
      next: (resp: any) => {
        const results = Array.isArray(resp) ? resp : [resp];
        const nc = results.filter(r => !r.conform).length;
        const conf = results.length - nc;
        this.messageService.add({
          severity: nc > 0 ? 'warn' : 'success',
          summary: results.length > 1 ? 'Résultats enregistrés' : 'Résultat enregistré',
          detail: `${conf} conforme${conf > 1 ? 's' : ''}, ${nc} non conforme${nc > 1 ? 's' : ''}`
        });
        this.showResultDialog = false;
        this.savingResult = false;
        this.loadTicket(); // refresh counts
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: err?.error?.message || 'Impossible d\'enregistrer le(s) résultat(s)'
        });
        this.savingResult = false;
      }
    });
  }

  // ===== POSTE SUB-STATUS MANAGEMENT (2026-04 line-ticket model) =====

  /** Can the current user mark a specific poste as done? */
  canMarkPoste(poste: PosteStatus): boolean {
    if (!this.ticket || this.ticket.status !== 'EN_COURS') return false;
    if (this.isPosteTerminal(poste)) return false;
    const roles = this.authService.getRoles();
    return roles.includes('TECH_VAL') || roles.includes('CHEF_SECTEUR') || roles.includes('ADMIN_IT');
  }

  /** Is a poste already in a terminal status? */
  isPosteTerminal(poste: PosteStatus): boolean {
    return ['CONFORME', 'NON_CONFORME', 'ANNULE'].includes(poste.status);
  }

  /** Badge severity for a poste status (PrimeNG). */
  posteSeverity(status: string): 'success' | 'danger' | 'warning' | 'info' | 'secondary' {
    switch (status) {
      case 'CONFORME':     return 'success';
      case 'NON_CONFORME': return 'danger';
      case 'ANNULE':       return 'secondary';
      case 'EN_COURS':
      case 'EN_REVUE':     return 'warning';
      default:             return 'info';
    }
  }

  /** Short label for a poste status. */
  posteStatusLabel(status: string): string {
    switch (status) {
      case 'PLANIFIE':         return 'À faire';
      case 'EN_ATTENTE_PREP':  return 'Prép.';
      case 'PREP_VALIDEE':     return 'Prête';
      case 'EN_COURS':         return 'En cours';
      case 'EN_REVUE':         return 'Revue';
      case 'CONFORME':         return 'Conforme';
      case 'NON_CONFORME':     return 'Non conf.';
      case 'ANNULE':           return 'Annulé';
      default:                 return status;
    }
  }

  openPosteDialog(poste: PosteStatus): void {
    this.activePoste = poste;
    this.posteFinalStatus = 'CONFORME';
    this.posteNotes = '';
    this.showPosteDialog = true;
  }

  submitPosteDone(): void {
    if (!this.activePoste) return;
    this.savingPoste = true;

    this.ticketService.markPosteDone(this.ticketId, this.activePoste.zoneId, {
      finalStatus: this.posteFinalStatus,
      notes: this.posteNotes?.trim() || undefined
    }).subscribe({
      next: (updated) => {
        this.ticket = updated;
        const label = this.posteFinalStatus === 'CONFORME' ? '✓ Conforme' : '✗ Non conforme';
        this.messageService.add({
          severity: this.posteFinalStatus === 'CONFORME' ? 'success' : 'warn',
          summary: 'Poste mis à jour',
          detail: `${this.activePoste?.zoneName} — ${label}`
        });
        this.showPosteDialog = false;
        this.savingPoste = false;
        this.activePoste = null;
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: err?.error?.message || 'Impossible de mettre à jour le poste'
        });
        this.savingPoste = false;
      }
    });
  }

  /** Progress percentage of completed postes (0-100). */
  get postesProgress(): number {
    const total = this.ticket?.posteTotal || 0;
    const done = this.ticket?.posteDone || 0;
    if (total <= 0) return 0;
    return Math.round((done / total) * 100);
  }

  private success(msg: string) {
    this.messageService.add({ severity: 'success', summary: 'Succès', detail: msg });
  }
  private error(err: any) {
    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message || 'Erreur' });
  }
}