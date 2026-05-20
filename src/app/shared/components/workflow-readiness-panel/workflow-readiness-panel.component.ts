import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  WorkflowReadiness,
  WorkflowReadinessMissingMeasure,
  WorkflowReadinessOutOfRangeMeasure,
} from '../../../models/workflow-readiness.model';

@Component({
  selector: 'app-workflow-readiness-panel',
  templateUrl: './workflow-readiness-panel.component.html',
  styleUrls: ['./workflow-readiness-panel.component.scss'],
  standalone: false,
})
export class WorkflowReadinessPanelComponent {
  @Input() visible = false;
  @Input() readiness: WorkflowReadiness | null = null;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() missingMeasureClicked = new EventEmitter<WorkflowReadinessMissingMeasure>();
  @Output() outOfRangeMeasureClicked = new EventEmitter<WorkflowReadinessOutOfRangeMeasure>();

  get isEmpty(): boolean {
    if (!this.readiness) return true;
    return (
      this.readiness.missingMeasures.length === 0 &&
      this.readiness.outOfRangeMeasures.length === 0
    );
  }

  get totalCount(): number {
    if (!this.readiness) return 0;
    return this.readiness.missingMeasures.length + this.readiness.outOfRangeMeasures.length;
  }

  /**
   * Position (in %) of an out-of-range measured value relative to its tolerance
   * band, padded by 25% on each side so the marker is visible even when the
   * value falls outside the [lower; upper] window. Clamped to 5..95% so it
   * never sits flush against the gauge edge.
   */
  oorMarker(m: WorkflowReadinessOutOfRangeMeasure): number {
    const lo = m.lowerBound;
    const hi = m.upperBound;
    const v = m.measuredValue;
    if (lo === null || hi === null || v === null || lo === undefined || hi === undefined || v === undefined) {
      return 50;
    }
    const span = hi - lo;
    if (span <= 0) return 50;
    // Render the gauge across a window 50% wider than [lo, hi] so we can show
    // out-of-range markers on either side.
    const pad = span * 0.25;
    const windowLo = lo - pad;
    const windowSpan = span + pad * 2;
    const pct = ((v - windowLo) / windowSpan) * 100;
    return Math.max(5, Math.min(95, pct));
  }

  onHide(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  onMissingClick(m: WorkflowReadinessMissingMeasure): void {
    this.missingMeasureClicked.emit(m);
  }

  onOutOfRangeClick(m: WorkflowReadinessOutOfRangeMeasure): void {
    this.outOfRangeMeasureClicked.emit(m);
  }
}
