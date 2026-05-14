import { Component, Input } from '@angular/core';
import { MeasureStatus, MEASURE_STATUS_LABELS, MEASURE_STATUS_COLORS, MEASURE_STATUS_ICONS } from '../../enums/measure-status.enum';

@Component({
  selector: 'app-measure-status-badge',
  templateUrl: './measure-status-badge.component.html',
  styleUrls: ['./measure-status-badge.component.scss'],
  standalone: false
})
export class MeasureStatusBadgeComponent {
  @Input() status!: MeasureStatus;
  readonly LABELS = MEASURE_STATUS_LABELS;
  readonly COLORS = MEASURE_STATUS_COLORS as any;
  readonly ICONS = MEASURE_STATUS_ICONS;

  getSeverity(): any {
    return this.COLORS[this.status];
  }
}
