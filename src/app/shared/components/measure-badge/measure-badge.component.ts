import { Component, Input } from '@angular/core';
import { MeasureCategory, MEASURE_CATEGORY_ICONS, MEASURE_CATEGORY_LABELS } from '../../enums/measure-category.enum';

@Component({
  selector: 'app-measure-badge',
  templateUrl: './measure-badge.component.html',
  styleUrls: ['./measure-badge.component.scss'],
  standalone: false
})
export class MeasureBadgeComponent {
  @Input() category!: MeasureCategory;
  @Input() code!: string;
  @Input() antenna: string | null = null;
  @Input() frequencyMhz: number | null = null;

  readonly MEASURE_CATEGORY_ICONS = MEASURE_CATEGORY_ICONS;
  readonly MEASURE_CATEGORY_LABELS = MEASURE_CATEGORY_LABELS;
}
