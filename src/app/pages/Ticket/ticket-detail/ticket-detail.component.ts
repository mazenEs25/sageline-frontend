import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, auditTime, Subject } from 'rxjs';
import { MessageService, ConfirmationService } from 'primeng/api';
import { AuthService } from '../../../auth/auth.service';
import { PosteStatus, Validation } from '../../../models/validation.model';
import { TicketService, WorkflowReadinessBlockedError } from '../../../services/ticket.service';
import { WebSocketService } from '../../../services/websocket.service';
import { WorkflowReadiness } from '../../../models/workflow-readiness.model';
import { MeasurePanelComponent } from '../measure-panel/measure-panel.component';
import { WorkflowReadinessMissingMeasure, WorkflowReadinessOutOfRangeMeasure } from '../../../models/workflow-readiness.model';
import { Role } from '../../../shared/enums/role.enum';


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

  // Mark Poste Done dialog
  showPosteDialog = false;
  savingPoste = false;
  activePoste: PosteStatus | null = null;
  posteFinalStatus: 'CONFORME' | 'NON_CONFORME' | 'AUTO' = 'AUTO';
  posteNotes = '';

  // ── Phase D — per-poste drawer state ────────────────────────────────────
  /** zoneIds of postes whose drawer (measures + Clôturer) is currently expanded. */
  expandedPosteZoneIds = new Set<number>();
  /** Per-poste readiness snapshots, keyed by zoneId. Lazy-loaded on expand. */
  posteReadinessByZoneId = new Map<number, WorkflowReadiness>();
  /** Per-poste readiness loading flags, keyed by zoneId. */
  posteReadinessLoadingByZoneId = new Set<number>();

  private wsTopic: string | null = null;
  private wsSubscription?: Subscription;

  // Readiness bar and side panel (Phase 003)
  readiness: WorkflowReadiness | null = null;
  wsConnected = true;
  sidePanelOpen = false;
  private readinessSub: Subscription | null = null;
  private connectedSub: Subscription | null = null;
  private readinessUpdate$ = new Subject<WorkflowReadiness>();
  private lastBlockedToastAt = 0;

  // Phase 004: Log import dialog
  logImportVisible = false;

  /**
   * The ticket-level {@link MeasurePanelComponent} was removed in Phase E.
   * The ViewChild + {@code measures} getter are kept for compatibility with
   * the existing side-panel scroll-to-measure helpers ({@code onMissingMeasureClicked},
   * {@code onOutOfRangeMeasureClicked}), which now silently no-op (the per-poste
   * drawers handle their own measures via per-poste MeasurePanel instances).
   * If you re-add a global panel later, this ViewChild will pick it up again.
   */
  @ViewChild(MeasurePanelComponent) measurePanel?: MeasurePanelComponent;

  /** Pulled from the ViewChild when present; undefined now that the global panel is gone. */
  get measures() {
    return this.measurePanel?.measures;
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private ticketService: TicketService,
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

    this.loadReadiness();
    this.subscribeReadinessTopic();

    this.connectedSub = this.wsService.isConnected$.subscribe(
      (connected: boolean) => (this.wsConnected = connected)
    );

    this.readinessSub = this.readinessUpdate$
      .pipe(auditTime(200))
      .subscribe((r: WorkflowReadiness) => (this.readiness = r));
  }

  ngOnDestroy() {
    if (this.wsTopic) {
      this.wsService.unsubscribe(this.wsTopic);
      this.wsTopic = null;
    }
    this.wsSubscription?.unsubscribe();
    this.readinessSub?.unsubscribe();
    this.connectedSub?.unsubscribe();
    this.wsService.unsubscribe(`/topic/validation/${this.ticketId}/readiness`);
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

  private loadReadiness(): void {
    this.ticketService.getReadiness(this.ticketId).subscribe({
      next: (r) => (this.readiness = r),
      error: () => (this.readiness = null),
    });
  }

  private subscribeReadinessTopic(): void {
    this.wsService.subscribe(
      `/topic/validation/${this.ticketId}/readiness`,
      (payload: WorkflowReadiness) => this.readinessUpdate$.next(payload)
    );
  }

  loadTicket() {
    this.loading = true;
    this.ticketService.getById(this.ticketId).subscribe({
      next: (data) => { this.ticket = data; this.loading = false; },
      error: () => { this.loading = false; this.router.navigate(['/validations']); }
    });
  }

  /**
   * Lightweight ticket refresh that updates the DTO without showing the
   * full-page loading spinner. Used after measure CRUD to update per-poste
   * counters (resultsCount, nonConformCount) without collapsing expanded drawers.
   */
  private silentReloadTicket(): void {
    this.ticketService.getById(this.ticketId).subscribe({
      next: (data) => { this.ticket = data; },
      error: () => { /* swallow — the user still has a usable view */ }
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

  onSubmitForReview(): void {
    this.ticketService.submitForReview(this.ticketId).subscribe({
      next: (updated) => {
        // existing post-submit UX (status refresh, navigate, toast, etc.)
        this.success('Soumis pour revue');
        this.loadTicket();
      },
      error: (err) => this.handleSubmitError(err),
    });
  }

  private handleSubmitError(err: unknown): void {
    if (err instanceof WorkflowReadinessBlockedError) {
      this.readiness = err.readiness;
      this.sidePanelOpen = true;
      const now = Date.now();
      if (now - this.lastBlockedToastAt >= 3000) {
        this.lastBlockedToastAt = now;
        this.messageService.add({
          severity: 'warn',
          summary: 'Submission blocked',
          detail: err.readiness.blockingReasons?.[0] ?? 'Mandatory measures missing.',
        });
      }
      return;
    }
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to submit ticket for review.',
    });
  }

  submitForReview() {
    this.confirmationService.confirm({
      message: 'Soumettre ce ticket pour revue ? Cette action est irréversible.',
      accept: () => {
        this.onSubmitForReview();
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

  // ===== WORKFLOW READINESS (Phase 003) =====

  get isSubmitDisabled(): boolean {
    return !this.readiness || this.readiness.canTransition === false;
  }

  get submitLabel(): string {
    if (!this.readiness) return 'Loading…';
    if (this.readiness.canTransition) return 'Submit for review';
    return `Submit for review (${this.readiness.mandatoryFilled}/${this.readiness.mandatoryTotal})`;
  }

  onRefreshReadiness(): void {
    this.loadReadiness();
  }

  onMeasuresChanged(): void {
    if (!this.wsConnected) {
      this.loadReadiness();
    }
  }

  onMissingMeasureClicked(m: WorkflowReadinessMissingMeasure): void {
    this.measurePanel?.scrollToMeasureCode(m.measureCode);
  }

  onOutOfRangeMeasureClicked(m: WorkflowReadinessOutOfRangeMeasure): void {
    this.measurePanel?.scrollToMeasureCode(m.measureCode);
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

  /** trackBy function for the poste *ngFor — prevents Angular from
   *  destroying and recreating poste rows (and their child MeasurePanel
   *  components) when silentReloadTicket() replaces this.ticket. */
  trackPoste(_index: number, poste: PosteStatus): number {
    return poste.zoneId;
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
    this.posteFinalStatus = 'AUTO';  // Phase D default — derive from measure statuses
    this.posteNotes = '';
    this.showPosteDialog = true;
  }

  // ── Phase D — per-poste drawer + readiness ──────────────────────────────

  /** Toggle the inline drawer of a poste row. Lazy-loads readiness on first open. */
  togglePoste(poste: PosteStatus): void {
    const zid = poste.zoneId;
    if (this.expandedPosteZoneIds.has(zid)) {
      this.expandedPosteZoneIds.delete(zid);
    } else {
      this.expandedPosteZoneIds.add(zid);
      if (!this.posteReadinessByZoneId.has(zid)) {
        this.loadPosteReadiness(zid);
      }
    }
  }

  isPosteExpanded(poste: PosteStatus): boolean {
    return this.expandedPosteZoneIds.has(poste.zoneId);
  }

  getPosteReadiness(poste: PosteStatus): WorkflowReadiness | null {
    return this.posteReadinessByZoneId.get(poste.zoneId) ?? null;
  }

  isPosteReadinessLoading(poste: PosteStatus): boolean {
    return this.posteReadinessLoadingByZoneId.has(poste.zoneId);
  }

  /**
   * Can the Clôturer button on a given poste row be enabled?
   * False if the poste is terminal, or readiness says canTransition=false.
   */
  canClosePoste(poste: PosteStatus): boolean {
    if (!this.canMarkPoste(poste)) return false;
    const r = this.getPosteReadiness(poste);
    return r ? r.canTransition : false;
  }

  /** Re-fetch per-poste measures handler — also refreshes per-poste readiness
   *  AND silently reloads the ticket so that the poste.resultsCount / nonConformCount
   *  badges and the "Aucune mesure" empty state update correctly without collapsing drawers. */
  onPosteMeasuresChanged(poste: PosteStatus): void {
    this.loadPosteReadiness(poste.zoneId);
    // Silently reload the ticket DTO so poste badges refresh without a loading spinner.
    this.silentReloadTicket();
    // also refresh ticket-wide readiness because mandatoryFilled aggregates
    this.onMeasuresChanged();
  }

  private loadPosteReadiness(zoneId: number): void {
    this.posteReadinessLoadingByZoneId.add(zoneId);
    this.ticketService.getPosteReadiness(this.ticketId, zoneId).subscribe({
      next: (r) => {
        this.posteReadinessByZoneId.set(zoneId, r);
        this.posteReadinessLoadingByZoneId.delete(zoneId);
      },
      error: () => {
        this.posteReadinessLoadingByZoneId.delete(zoneId);
      }
    });
  }

  submitPosteDone(): void {
    if (!this.activePoste) return;
    this.savingPoste = true;

    this.ticketService.markPosteDone(this.ticketId, this.activePoste.zoneId, {
      finalStatus: this.posteFinalStatus,
      notes: this.posteNotes?.trim() || undefined
    }).subscribe({
      next: (updated) => {
        const closedZoneId = this.activePoste?.zoneId;
        this.ticket = updated;
        // Phase D: the closed poste's chip/drawer are now stale. Drop the cached
        // readiness so the next expand (or visible chip) re-fetches from the server.
        if (closedZoneId !== undefined) {
          this.posteReadinessByZoneId.delete(closedZoneId);
          this.expandedPosteZoneIds.delete(closedZoneId);
        }
        const label = this.posteFinalStatus === 'CONFORME' ? '✓ Conforme'
                    : this.posteFinalStatus === 'NON_CONFORME' ? '✗ Non conforme'
                    : '🤖 Auto (verdict dérivé)';
        this.messageService.add({
          severity: this.posteFinalStatus === 'NON_CONFORME' ? 'warn' : 'success',
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

  get canImportLog(): boolean {
    const allowed = [Role.ADMIN_IT, Role.TECH_VAL, Role.CHEF_SECTEUR];
    const roles = this.authService.getRoles();
    return allowed.some(r => roles.includes(r));
  }

  get canEditMeasures(): boolean {
    const s = this.ticket?.status;
    return s !== 'CONFORME' && s !== 'NON_CONFORME' && s !== 'ANNULE';
  }

  /**
   * Post-import refresh — Phase E.
   * After the importer succeeds, all per-poste readiness chips become stale
   * (new measures might have been attributed to multiple postes). We invalidate
   * every cached chip and re-fetch them so the UI shows the new counts without
   * the user having to manually expand each drawer.
   */
  onImportSucceeded(_ids: number[]): void {
    this.measurePanel?.reload();      // no-op when the global panel is gone
    this.onMeasuresChanged();         // refreshes ticket-wide readiness bar
    // Drop every cached per-poste readiness; the chip getter will trigger a re-fetch
    // for any visible row, and expanded drawers reload via onPosteMeasuresChanged.
    this.posteReadinessByZoneId.clear();
    if (this.ticket?.posteStatuses) {
      for (const ps of this.ticket.posteStatuses) {
        this.loadPosteReadiness(ps.zoneId);
      }
    }
  }

  private success(msg: string) {
    this.messageService.add({ severity: 'success', summary: 'Succès', detail: msg });
  }
  private error(err: any) {
    this.messageService.add({ severity: 'error', summary: 'Erreur', detail: err.error?.message || 'Erreur' });
  }
}