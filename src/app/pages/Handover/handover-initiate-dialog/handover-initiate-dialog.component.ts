import { Component, Input, Output, EventEmitter } from '@angular/core';
import { HandoverService } from '../../../services/handover.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-handover-initiate-dialog',
  templateUrl: './handover-initiate-dialog.component.html',
  styleUrls: ['./handover-initiate-dialog.component.scss'],
  providers: [MessageService]
})
export class HandoverInitiateDialogComponent {
  @Input() validationId!: number;
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() initiated = new EventEmitter<void>();

  form = { handoverNote: '', progressSummary: '' };
  loading = false;

  constructor(
    private handoverService: HandoverService,
    private messageService: MessageService
  ) { }

  submit(): void {
    if (!this.form.handoverNote.trim() || !this.form.progressSummary.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Champs requis',
        detail: 'Veuillez remplir tous les champs.'
      });
      return;
    }

    this.loading = true;
    this.handoverService.initiateHandover(this.validationId, this.form).subscribe({
      next: () => {
        this.initiated.emit();
        this.visible = false;
        this.visibleChange.emit(false);
        this.resetForm();
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Passation initiée avec succès.'
        });
      },
      error: (error) => {
        this.loading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: error.error?.message || 'Erreur lors de l\'initiation de la passation.'
        });
      }
    });
  }

  cancel(): void {
    this.visibleChange.emit(false);
    this.resetForm();
  }

  /** Called by p-dialog's (visibleChange) when the user closes via the X button. */
  onVisibleChange(value: boolean): void {
    this.visibleChange.emit(value);
    if (!value) {
      this.resetForm();
    }
  }

  private resetForm(): void {
    this.form = { handoverNote: '', progressSummary: '' };
    this.loading = false;
  }
}
