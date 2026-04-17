import { Component, Input } from '@angular/core';
import { Priority, PRIORITY_LABELS, PRIORITY_COLORS } from '../../enums/ticket.enum';

type TagSeverity = 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast' | undefined;

@Component({
  selector: 'app-priority-badge',
  template: `
    <p-tag [value]="getLabel()" [severity]="getColor()" [rounded]="true"></p-tag>
  `
})
export class PriorityBadgeComponent {
  @Input() priority!: Priority;

  getLabel(): string { return PRIORITY_LABELS[this.priority] || this.priority; }
  getColor(): TagSeverity { return (PRIORITY_COLORS[this.priority] as TagSeverity) || 'info'; }
}