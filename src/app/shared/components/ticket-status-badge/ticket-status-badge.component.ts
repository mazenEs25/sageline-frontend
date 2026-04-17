// ticket-status-badge.component.ts
import { Component, Input } from '@angular/core';
import { TicketStatus, TICKET_STATUS_LABELS, TICKET_STATUS_COLORS, TICKET_STATUS_ICONS } from '../../enums/ticket.enum';

type TagSeverity = 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast' | undefined;

@Component({
  selector: 'app-ticket-status-badge',
  template: `
    <p-tag [value]="getLabel()" [severity]="getColor()" [icon]="getIcon()"></p-tag>
  `
})
export class TicketStatusBadgeComponent {
  @Input() status!: TicketStatus;

  getLabel(): string { return TICKET_STATUS_LABELS[this.status] || this.status; }
  getColor(): TagSeverity { return (TICKET_STATUS_COLORS[this.status] as TagSeverity) || 'info'; }
  getIcon(): string { return TICKET_STATUS_ICONS[this.status] || 'pi pi-circle'; }
}