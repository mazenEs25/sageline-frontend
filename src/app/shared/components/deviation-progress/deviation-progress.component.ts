import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-deviation-progress',
  templateUrl: './deviation-progress.component.html',
  styleUrls: ['./deviation-progress.component.scss'],
  standalone: false
})
export class DeviationProgressComponent {
  @Input() deviationPct = 0;

  get widthPct(): number {
    if (this.deviationPct < 0) return 0;
    if (this.deviationPct > 100) return 100;
    return this.deviationPct;
  }

  get band(): 'green' | 'amber' | 'red' {
    if (this.deviationPct <= 50) return 'green';
    if (this.deviationPct <= 100) return 'amber';
    return 'red';
  }
}
