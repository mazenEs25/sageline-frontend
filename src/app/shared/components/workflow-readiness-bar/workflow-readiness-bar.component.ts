import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { WorkflowReadiness } from '../../../models/workflow-readiness.model';

@Component({
  selector: 'app-workflow-readiness-bar',
  templateUrl: './workflow-readiness-bar.component.html',
  styleUrls: ['./workflow-readiness-bar.component.scss'],
  standalone: false,
})
export class WorkflowReadinessBarComponent implements OnChanges {
  @Input() readiness: WorkflowReadiness | null = null;
  @Input() wsConnected = true;

  @Output() panelToggleRequested = new EventEmitter<void>();
  @Output() refreshRequested = new EventEmitter<void>();

  // 5-second WS-paused grace timer state (FR-010)
  pausedIndicatorVisible = false;
  private pausedTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['wsConnected']) {
      this.handleWsConnectedChange();
    }
  }

  private handleWsConnectedChange(): void {
    if (this.wsConnected) {
      if (this.pausedTimer) {
        clearTimeout(this.pausedTimer);
        this.pausedTimer = null;
      }
      this.pausedIndicatorVisible = false;
    } else {
      if (this.pausedTimer) return;
      this.pausedTimer = setTimeout(() => {
        this.pausedIndicatorVisible = true;
        this.pausedTimer = null;
      }, 5000);
    }
  }

  get percentage(): number {
    if (!this.readiness || this.readiness.mandatoryTotal === 0) return 0;
    return Math.round(
      (this.readiness.mandatoryFilled / this.readiness.mandatoryTotal) * 100
    );
  }

  get fillRatio(): number {
    if (!this.readiness || this.readiness.mandatoryTotal === 0) return 0;
    return (this.readiness.mandatoryFilled / this.readiness.mandatoryTotal) * 100;
  }

  get colorBand(): 'red' | 'amber' | 'green' | 'gray' {
    if (!this.readiness || this.readiness.mandatoryTotal === 0) return 'gray';
    const pct = this.fillRatio;
    if (pct >= 100) return 'green';
    if (pct >= 50) return 'amber';
    return 'red';
  }

  get tooltipText(): string {
    if (!this.readiness || this.readiness.missingMeasures.length === 0) {
      return 'No missing mandatory measures';
    }
    const top = this.readiness.missingMeasures.slice(0, 5)
      .map(m => `${m.measureCode} — ${m.label}`)
      .join('\n');
    const remaining = this.readiness.missingMeasures.length - 5;
    const overflow = remaining > 0 ? `\n+ ${remaining} more — click the bar to see all` : '';
    return `${top}${overflow}`;
  }

  get ariaText(): string {
    if (!this.readiness) return 'Loading readiness…';
    if (this.readiness.mandatoryTotal === 0) {
      return 'No mandatory measures defined for this zone';
    }
    const base = `${this.readiness.mandatoryFilled} of ${this.readiness.mandatoryTotal} mandatory measures complete`;
    return this.readiness.canTransition ? `${base}, ready for review` : base;
  }

  onBarClick(): void {
    this.panelToggleRequested.emit();
  }

  onRefreshClick(event: Event): void {
    event.stopPropagation();
    this.refreshRequested.emit();
  }
}
