// ticket-timeline.component.ts
import { Component, Input } from '@angular/core';
import { Validation } from '../../../models/validation.model';
import { TicketStatus, TICKET_STATUS_LABELS } from '../../enums/ticket.enum';

type StepState = 'completed' | 'active' | 'pending' | 'error' | 'warning';

interface TimelineStep {
  label: string;
  state: StepState;
  date: string | null;
}

@Component({
  selector: 'app-ticket-timeline',
  template: `
    <div class="sage-progress-wrapper">
      <div class="sage-progress">
        <div class="sage-step"
             *ngFor="let step of timelineSteps; let i = index; let last = last"
             [class.is-completed]="step.state === 'completed'"
             [class.is-active]="step.state === 'active'"
             [class.is-error]="step.state === 'error'"
             [class.is-warning]="step.state === 'warning'"
             [class.is-pending]="step.state === 'pending'">

          <!-- Connector -->
          <div class="sage-connector" *ngIf="!last">
            <span class="sage-connector-fill"
                  [class.filled]="step.state === 'completed'"
                  [class.error]="step.state === 'error'"
                  [class.warning]="step.state === 'warning'"></span>
          </div>

          <!-- Circle -->
          <div class="sage-circle">
            <i class="pi pi-check" *ngIf="step.state === 'completed'"></i>
            <i class="pi pi-times" *ngIf="step.state === 'error'"></i>
            <i class="pi pi-exclamation" *ngIf="step.state === 'warning'"></i>
            <span class="sage-dot" *ngIf="step.state === 'active'"></span>
            <span class="sage-ring" *ngIf="step.state === 'active'"></span>
          </div>

          <!-- Label -->
          <div class="sage-label">{{ step.label }}</div>
          <div class="sage-date" *ngIf="step.date">{{ step.date | date:'dd/MM HH:mm' }}</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }

    .sage-progress-wrapper {
      background: var(--sage-card, #1e293b);
      border: 1px solid var(--sage-border, #1e293b);
      border-radius: var(--sage-radius-lg, 12px);
      padding: 2rem 1.5rem 1.75rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.24);
    }

    .sage-progress {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      width: 100%;
      position: relative;
    }

    .sage-step {
      position: relative;
      flex: 1 1 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      min-width: 0;
    }

    /* Connector line between circles */
    .sage-connector {
      position: absolute;
      top: 17px;
      left: calc(50% + 20px);
      right: calc(-50% + 20px);
      height: 3px;
      background: rgba(148, 163, 184, 0.2);
      border-radius: 2px;
      overflow: hidden;
      z-index: 0;
    }

    .sage-connector-fill {
      display: block;
      height: 100%;
      width: 0%;
      background: var(--sage-primary, #3b82f6);
      transition: width 0.6s ease;
    }
    .sage-connector-fill.filled { width: 100%; }
    .sage-connector-fill.error {
      width: 100%;
      background: var(--sage-danger, #ef4444);
    }
    .sage-connector-fill.warning {
      width: 100%;
      background: var(--sage-warning, #f59e0b);
    }

    /* Circle */
    .sage-circle {
      position: relative;
      z-index: 1;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      font-weight: 700;
      background: var(--sage-surface, #0f172a);
      border: 2px solid rgba(148, 163, 184, 0.3);
      color: var(--sage-text-dim, #64748b);
      transition: all 0.3s ease;
    }

    /* Completed step */
    .is-completed .sage-circle {
      background: var(--sage-primary, #3b82f6);
      border-color: var(--sage-primary, #3b82f6);
      color: #fff;
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.12);
    }
    .is-completed .sage-circle i { font-size: 0.9rem; font-weight: 700; }

    /* Active / current step */
    .is-active .sage-circle {
      background: var(--sage-surface, #0f172a);
      border-color: var(--sage-primary, #3b82f6);
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.18);
    }
    .is-active .sage-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--sage-primary, #3b82f6);
      animation: sagePulse 1.6s ease-in-out infinite;
    }
    .is-active .sage-ring {
      position: absolute;
      inset: -2px;
      border-radius: 50%;
      border: 2px solid var(--sage-primary, #3b82f6);
      opacity: 0;
      animation: sageRing 1.8s ease-out infinite;
    }

    /* Error state */
    .is-error .sage-circle {
      background: var(--sage-danger, #ef4444);
      border-color: var(--sage-danger, #ef4444);
      color: #fff;
      box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.18);
    }

    /* Warning state */
    .is-warning .sage-circle {
      background: var(--sage-warning, #f59e0b);
      border-color: var(--sage-warning, #f59e0b);
      color: #fff;
      box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.18);
    }

    /* Pending state */
    .is-pending .sage-circle {
      background: var(--sage-surface, #0f172a);
      border-color: rgba(148, 163, 184, 0.3);
    }

    /* Labels */
    .sage-label {
      margin-top: 0.75rem;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--sage-text-dim, #64748b);
      letter-spacing: 0.01em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 110px;
      transition: color 0.3s ease;
    }
    .is-completed .sage-label,
    .is-active .sage-label {
      color: var(--sage-text, #e2e8f0);
    }
    .is-active .sage-label { color: var(--sage-primary, #3b82f6); }
    .is-error .sage-label { color: var(--sage-danger, #ef4444); }
    .is-warning .sage-label { color: var(--sage-warning, #f59e0b); }

    .sage-date {
      margin-top: 0.15rem;
      font-size: 0.7rem;
      color: var(--sage-text-dim, #64748b);
      font-family: 'JetBrains Mono', monospace;
    }

    /* Animations */
    @keyframes sagePulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.2); opacity: 0.7; }
    }
    @keyframes sageRing {
      0% { transform: scale(0.9); opacity: 0.6; }
      100% { transform: scale(1.6); opacity: 0; }
    }

    /* Responsive */
    @media (max-width: 768px) {
      .sage-progress-wrapper { padding: 1.5rem 0.75rem 1.25rem; }
      .sage-label { font-size: 0.7rem; max-width: 70px; }
      .sage-date { display: none; }
      .sage-circle { width: 32px; height: 32px; }
      .sage-connector { top: 14px; }
    }
  `]
})
export class TicketTimelineComponent {
  @Input() ticket!: Validation;

  get timelineSteps(): TimelineStep[] {
    const allSteps: TicketStatus[] = [
      'PLANIFIE', 'EN_ATTENTE_PREP', 'PREP_VALIDEE', 'EN_COURS', 'EN_REVUE', 'CONFORME'
    ];

    const status = this.ticket.status as TicketStatus;
    const isCancelled = status === 'ANNULE';
    const isNonConforme = status === 'NON_CONFORME';

    // Non-conforme: mark up to EN_REVUE as completed, CONFORME becomes error
    if (isNonConforme) {
      return allSteps.map((step, idx) => {
        const isLast = step === 'CONFORME';
        return {
          label: isLast ? 'Non Conforme' : TICKET_STATUS_LABELS[step],
          state: isLast ? 'error' as StepState : 'completed' as StepState,
          date: this.getDateForStep(step)
        };
      });
    }

    // Cancelled: mark current index as warning, rest pending
    if (isCancelled) {
      return allSteps.map((step, idx) => ({
        label: idx === 0 ? 'Annulé' : TICKET_STATUS_LABELS[step],
        state: idx === 0 ? 'warning' as StepState : 'pending' as StepState,
        date: this.getDateForStep(step)
      }));
    }

    const currentIdx = allSteps.indexOf(status);

    return allSteps.map((step, idx) => {
      let state: StepState;
      if (idx < currentIdx) state = 'completed';
      else if (idx === currentIdx) state = 'active';
      else state = 'pending';
      return {
        label: TICKET_STATUS_LABELS[step],
        state,
        date: this.getDateForStep(step)
      };
    });
  }

  private getDateForStep(step: TicketStatus): string | null {
    switch (step) {
      case 'PLANIFIE': return this.ticket.createdAt || null;
      case 'PREP_VALIDEE': return this.ticket.toolsVerifiedAt || null;
      case 'EN_COURS': return this.ticket.startDate || null;
      case 'CONFORME':
      case 'NON_CONFORME': return this.ticket.endDate || null;
      default: return null;
    }
  }
}
