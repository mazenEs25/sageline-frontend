import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-deviation-progress',
  templateUrl: './deviation-progress.component.html',
  styleUrls: ['./deviation-progress.component.scss'],
  standalone: false
})
export class DeviationProgressComponent {
  /**
   * Deviation percentage. NULL is a first-class value: measures with status
   * NOT_EXECUTED have no measured value, so deviationPct is null. The template
   * renders a placeholder bar in that case instead of crashing with toFixed-on-null.
   */
  @Input() deviationPct: number | null = null;

  get isNull(): boolean {
    return this.deviationPct === null || this.deviationPct === undefined;
  }

  get widthPct(): number {
    if (this.isNull) return 0;
    const v = this.deviationPct as number;
    if (v < 0) return 0;
    if (v > 100) return 100;
    return v;
  }

  get band(): 'green' | 'amber' | 'red' | 'empty' {
    if (this.isNull) return 'empty';
    const v = this.deviationPct as number;
    if (v <= 50) return 'green';
    if (v <= 100) return 'amber';
    return 'red';
  }

  /** Pre-formatted label — safe to interpolate from the template. */
  get displayLabel(): string {
    return this.isNull ? '—' : (this.deviationPct as number).toFixed(1) + '%';
  }
}
