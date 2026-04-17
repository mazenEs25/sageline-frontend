import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'findById' })
export class FindByIdPipe implements PipeTransform {
  transform(items: any[] | null | undefined, id: number | null | undefined, field: string = 'name'): string {
    if (!items || id == null) return '';
    const item = items.find(i => i?.id === id);
    return item ? (item[field] ?? '') : '';
  }
}
