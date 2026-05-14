import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MessageService } from 'primeng/api';
import { PosteCatalogService } from '../../../../services/poste-catalog.service';
import { CreatePosteMeasureCatalogRequest } from '../../../../models/poste-measure-catalog.model';
import { PosteType, POSTE_TYPE_VALUES } from '../../../../shared/enums/ticket.enum';
import { from, EMPTY, lastValueFrom } from 'rxjs';
import { concatMap, catchError, tap } from 'rxjs/operators';

@Component({
  selector: 'app-poste-catalog-bulk-import',
  templateUrl: './poste-catalog-bulk-import.component.html',
  styleUrl: './poste-catalog-bulk-import.component.scss',
  standalone: false
})
export class PosteCatalogBulkImportComponent {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() imported = new EventEmitter<void>();

  targetPosteType: PosteType | null = null;
  jsonInput = '';
  submitting = false;
  report: { created: any[]; failed: { index: number; code: string | null; reason: string }[] } | null = null;

  posteTypeOptions = POSTE_TYPE_VALUES.map(v => ({ label: v, value: v }));

  constructor(
    private service: PosteCatalogService,
    private messageService: MessageService
  ) {}

  onSubmit() {
    this.report = { created: [], failed: [] };

    // Validate JSON
    let entries: any[];
    try {
      entries = JSON.parse(this.jsonInput);
    } catch (e) {
      this.messageService.add({
        severity: 'error', summary: 'Erreur', detail: 'JSON invalide'
      });
      return;
    }

    // Validate array
    if (!Array.isArray(entries)) {
      this.messageService.add({
        severity: 'error', summary: 'Erreur', detail: 'Le contenu doit être un tableau JSON.'
      });
      return;
    }

    this.submitting = true;

    const indexed = entries.map((entry, index) => ({ entry, index }));

    lastValueFrom(
      from(indexed).pipe(
        concatMap(({ entry, index }) => {
          const dto: CreatePosteMeasureCatalogRequest = {
            ...entry,
            posteType: this.targetPosteType!
          };
          return this.service.create(dto).pipe(
            tap(() => this.report!.created.push(entry)),
            catchError((err: any) => {
              this.report!.failed.push({
                index,
                code: entry?.measureCode ?? null,
                reason: err?.error?.message || err?.message || 'Erreur inconnue'
              });
              return EMPTY;
            })
          );
        })
      ),
      { defaultValue: undefined }
    ).finally(() => {
      this.submitting = false;
    });
  }

  resetForm() {
    this.report = null;
    this.jsonInput = '';
  }

  onClose() {
    if ((this.report?.created.length ?? 0) > 0) {
      this.imported.emit();
    }
    this.visibleChange.emit(false);
  }
}
