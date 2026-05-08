import { Component, Input, Output, EventEmitter, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { MessageService } from 'primeng/api';
import { HandoverService } from '../../../services/handover.service';
import { AuthService } from '../../../auth/auth.service';
import { HandoverResponse } from '../../../models/handover.model';
import { HandoverStatus, HANDOVER_STATUS_LABELS } from '../../../shared/enums/handover-status.enum';
import { TriggerType, TRIGGER_TYPE_LABELS, TRIGGER_TYPE_SEVERITY } from '../../../shared/enums/trigger-type.enum';

@Component({
  selector: 'app-handover-timeline',
  templateUrl: './handover-timeline.component.html',
  styleUrls: ['./handover-timeline.component.scss'],
  providers: [MessageService]
})
export class HandoverTimelineComponent implements OnInit, OnDestroy {
  @Input() validationId!: number;
  @Output() actionCompleted = new EventEmitter<void>();

  handovers: HandoverResponse[] = [];
  loading = true;
  accepting: number | null = null;

  TRIGGER_TYPE_LABELS = TRIGGER_TYPE_LABELS;
  TRIGGER_TYPE_SEVERITY = TRIGGER_TYPE_SEVERITY;

  private historySub?: Subscription;

  constructor(
    private handoverService: HandoverService,
    private authService: AuthService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadHistory();
  }

  ngOnDestroy(): void {
    this.historySub?.unsubscribe();
  }

  private loadHistory(): void {
    this.loading = true;
    this.historySub?.unsubscribe();
    this.historySub = this.handoverService.getHandoverHistory(this.validationId).subscribe({
      next: (data) => {
        // Most recent first
        this.handovers = [...data].sort((a, b) =>
          new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
        );
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  // ─── Display helpers ──────────────────────────────────────────────────────

  get pendingCount(): number {
    return this.handovers.filter(
      h => h.status === HandoverStatus.PENDING || h.status === HandoverStatus.ACCEPTED
    ).length;
  }

  initials(username?: string | null): string {
    if (!username) return '?';
    const parts = username.replace(/[_.-]/g, ' ').trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  statusLabel(status: string): string {
    const key = status as keyof typeof HANDOVER_STATUS_LABELS;
    return HANDOVER_STATUS_LABELS[key] || status;
  }

  statusIcon(status: string): string {
    switch (status) {
      case HandoverStatus.PENDING:   return 'pi pi-clock';
      case HandoverStatus.ACCEPTED:  return 'pi pi-user-plus';
      case HandoverStatus.COMPLETED: return 'pi pi-check-circle';
      case HandoverStatus.CANCELLED: return 'pi pi-times-circle';
      default: return 'pi pi-info-circle';
    }
  }

  triggerIcon(trigger: string): string {
    switch (trigger) {
      case TriggerType.MANUAL:         return 'pi pi-user';
      case TriggerType.SHIFT_END_AUTO: return 'pi pi-clock';
      case TriggerType.ADMIN_FORCE:    return 'pi pi-shield';
      default: return 'pi pi-bolt';
    }
  }

  getTriggerTypeLabel(type: string): string {
    const key = type as keyof typeof TRIGGER_TYPE_LABELS;
    return TRIGGER_TYPE_LABELS[key] || type;
  }

  getTriggerTypeSeverity(type: string): 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast' | undefined {
    const key = type as keyof typeof TRIGGER_TYPE_SEVERITY;
    const severity = TRIGGER_TYPE_SEVERITY[key];
    return (severity as any) || 'info';
  }

  // ─── Accept action ────────────────────────────────────────────────────────

  /**
   * A handover can be accepted from the timeline when:
   *  - status is PENDING (anyone with TECH_VAL role + line locality — backend
   *    enforces the line check) or
   *  - status is ACCEPTED and the current user is the targeted toTech.
   * COMPLETED / CANCELLED rows are read-only.
   */
  canAccept(h: HandoverResponse): boolean {
    if (h.status !== HandoverStatus.PENDING && h.status !== HandoverStatus.ACCEPTED) {
      return false;
    }
    const roles = this.authService.getRoles();
    if (!roles.includes('TECH_VAL')) return false;

    if (h.status === HandoverStatus.ACCEPTED) {
      // Targeted tech must match current user
      const stored = localStorage.getItem('currentUser');
      if (!stored) return false;
      try {
        const me = JSON.parse(stored);
        return !!h.toTechUsername && me?.username === h.toTechUsername;
      } catch {
        return false;
      }
    }
    return true; // PENDING — let the backend's line-locality guard decide
  }

  accept(h: HandoverResponse): void {
    this.accepting = h.id;
    this.handoverService.acceptHandover(h.id).subscribe({
      next: () => {
        this.accepting = null;
        this.messageService.add({
          severity: 'success',
          summary: 'Passation acceptée',
          detail: `Vous reprenez le ticket de ${h.fromTechUsername}.`
        });
        this.loadHistory();
        // Bubble up so the parent ticket-detail can reload (status flips back to EN_COURS).
        this.actionCompleted.emit();
      },
      error: (err) => {
        this.accepting = null;
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: err?.error?.message || 'Impossible d\'accepter la passation.'
        });
      }
    });
  }
}
