// ticket-timeline.component.ts
import { Component, Input } from '@angular/core';
import { Validation } from '../../../models/validation.model';
import { TicketStatus, TICKET_STATUS_LABELS } from '../../enums/ticket.enum';

@Component({
  selector: 'app-ticket-timeline',
  template: `
    <p-timeline [value]="timelineSteps" layout="horizontal" align="top" styleClass="ticket-timeline">
      <ng-template pTemplate="content" let-step>
        <div class="text-center">
          <i [class]="step.icon" [style.color]="step.active ? '#3B82F6' : step.completed ? '#22C55E' : '#6B7280'"
             style="font-size: 1.2rem;"></i>
          <div class="text-xs mt-1" [style.color]="step.active ? '#3B82F6' : step.completed ? '#22C55E' : '#6B7280'">
            {{ step.label }}
          </div>
          <div *ngIf="step.date" class="text-xs" style="color: #9CA3AF;">
            {{ step.date | date:'dd/MM HH:mm' }}
          </div>
        </div>
      </ng-template>
    </p-timeline>
  `,
  styles: [`
    :host { display: block; }
    ::ng-deep .ticket-timeline .p-timeline-event-content { min-width: 100px; }
  `]
})
export class TicketTimelineComponent {
  @Input() ticket!: Validation;

  get timelineSteps() {
    const allSteps: TicketStatus[] = [
      'PLANIFIE', 'EN_ATTENTE_PREP', 'PREP_VALIDEE', 'EN_COURS', 'EN_REVUE', 'CONFORME'
    ];

    const currentIdx = allSteps.indexOf(this.ticket.status as TicketStatus);
    const isCancelled = this.ticket.status === 'ANNULE';
    const isNonConforme = this.ticket.status === 'NON_CONFORME';

    return allSteps.map((step, idx) => ({
      label: TICKET_STATUS_LABELS[step],
      icon: idx < currentIdx ? 'pi pi-check-circle' :
            idx === currentIdx ? 'pi pi-circle-fill' : 'pi pi-circle',
      completed: idx < currentIdx,
      active: idx === currentIdx && !isCancelled && !isNonConforme,
      date: this.getDateForStep(step)
    }));
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