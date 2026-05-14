import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'measureUnit', standalone: false })
export class MeasureUnitPipe implements PipeTransform {
  transform(value: number | null | undefined, unit: string | null | undefined, digits = 2): string {
    if (value === null || value === undefined) return '';
    const fixed = Number(value).toFixed(digits);
    return unit ? `${fixed} ${unit}` : fixed;
  }
}
