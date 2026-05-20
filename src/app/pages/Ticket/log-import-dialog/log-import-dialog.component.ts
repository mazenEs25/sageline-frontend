import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ValidationMeasureService } from '../../../services/validation-measure.service';
import { AuthService } from '../../../auth/auth.service';
import { LogImportReport } from '../../../models/log-import-report.model';
import { LogImportOptions } from '../../../models/log-import-options.model';
import { Role } from '../../../shared/enums/role.enum';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXT = ['.log', '.txt'];

@Component({
  selector: 'app-log-import-dialog',
  templateUrl: './log-import-dialog.component.html',
  styleUrls: ['./log-import-dialog.component.scss'],
  standalone: false
})
export class LogImportDialogComponent {
  @Input() ticketId!: number;
  @Input() posteType: string = '';
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() importSucceeded = new EventEmitter<number[]>();

  droppedFile: File | null = null;
  report: LogImportReport | null = null;
  loading = false;
  submitting = false;
  fileError: string | null = null;

  /**
   * Overwrite-existing toggle. Default false (safer) — existing measures are reported
   * under report.wouldOverwrite[] without being touched. Flipping to true and
   * re-previewing produces an updated report; confirming then commits the overwrite.
   */
  overwriteExisting = false;

  constructor(
    private measures: ValidationMeasureService,
    private auth: AuthService,
    private toast: MessageService
  ) {}

  get totalMatched(): number { return this.report?.matched.length ?? 0; }
  /** Legacy alias — kept for any leftover template references. Prefer totalOverwrite. */
  get totalSkipped(): number { return this.report?.wouldOverwrite?.length ?? this.report?.skipped?.length ?? 0; }
  get totalOverwrite(): number { return this.report?.wouldOverwrite?.length ?? 0; }
  get totalUnmatched(): number { return this.report?.unmatched.length ?? 0; }
  get totalWarnings(): number { return this.report?.warnings.length ?? 0; }
  get hasOverwrite(): boolean { return this.totalOverwrite > 0; }
  get hasSkipped(): boolean { return this.totalSkipped > 0; }
  get hasUnmatched(): boolean { return this.totalUnmatched > 0; }
  /**
   * Confirm is enabled if at least one matched OR (overwriteExisting is on AND there is
   * at least one wouldOverwrite to actually overwrite). Otherwise nothing would change.
   */
  get confirmDisabled(): boolean {
    if (this.submitting) return true;
    if (this.totalMatched > 0) return false;
    if (this.overwriteExisting && this.totalOverwrite > 0) return false;
    return true;
  }

  get canAddToCatalog(): boolean {
    const roles = this.auth.getRoles();
    return roles.includes(Role.ADMIN_IT) || roles.includes(Role.CHEF_SECTEUR);
  }

  onFileSelected(event: { files: File[] }): void {
    this.fileError = null;
    const file = event.files?.[0];
    if (!file) return;
    const lower = file.name.toLowerCase();
    const okExt = ALLOWED_EXT.some(ext => lower.endsWith(ext));
    if (!okExt) {
      this.fileError = lower.endsWith('.zip')
        ? 'ZIP not supported — drop a .log or .txt file'
        : 'Unsupported file type — drop a .log or .txt file';
      return;
    }
    if (file.size > MAX_BYTES) {
      this.fileError = 'File too large (max 10 MB)';
      return;
    }
    this.droppedFile = file;
    this.runPreview();
  }

  runPreview(): void {
    if (!this.droppedFile) return;
    this.loading = true;
    this.report = null;
    const opts: LogImportOptions = { overwriteExisting: this.overwriteExisting };
    this.measures.previewLog(this.ticketId, this.droppedFile, opts).subscribe({
      next: (report) => { this.report = report; this.loading = false; },
      error: (err) => {
        this.loading = false;
        this.report = null;
        this.handleApiError(err, 'preview');
      }
    });
  }

  /** User flipped the overwrite toggle — re-run preview so the report reflects the choice. */
  onOverwriteToggle(): void {
    if (this.droppedFile) this.runPreview();
  }

  private handleApiError(err: any, phase: 'preview' | 'import'): void {
    const status = err?.status;
    const code = err?.error?.error as string | undefined;
    const detail = err?.error?.message;

    // Statuses that close the dialog (no recovery from within it)
    if (status === 403) {
      this.toast.add({ severity: 'error', summary: 'Access denied', detail: 'You do not have permission to import logs.' });
      this.close();
      return;
    }
    if (status === 404) {
      this.toast.add({ severity: 'error', summary: 'Ticket not found' });
      this.close();
      return;
    }
    if (status === 409 && code === 'TICKET_STATUS_LOCKED') {
      this.toast.add({ severity: 'error', summary: 'Ticket is closed — no edits allowed' });
      this.close();
      return;
    }

    // Statuses that keep the dialog open so the user can retry
    if (status === 413) {
      this.toast.add({ severity: 'error', summary: 'File too large on the server', detail });
      return;
    }
    if (status === 422 && code === 'CATALOG_MISMATCH') {
      this.toast.add({ severity: 'error', summary: 'Catalog mismatch — import refused', detail });
      return;
    }
    if (status === 400 && (code === 'INVALID_FILE' || code === 'UNSUPPORTED_FORMAT')) {
      this.toast.add({ severity: 'error', summary: 'Parse failed', detail: detail ?? 'Could not parse log file' });
      return;
    }
    if (typeof status === 'number' && status >= 500) {
      this.toast.add({ severity: 'error', summary: 'Importer service error', detail });
      return;
    }

    this.toast.add({
      severity: 'error',
      summary: phase === 'preview' ? 'Parse failed' : 'Import failed',
      detail: detail ?? 'Network or server error'
    });
  }

  rePreview(): void { this.runPreview(); }

  confirmImport(): void {
    if (!this.droppedFile || this.confirmDisabled) return;
    this.submitting = true;
    const opts: LogImportOptions = { overwriteExisting: this.overwriteExisting };
    this.measures.importLog(this.ticketId, this.droppedFile, opts).subscribe({
      next: (report) => {
        const ids = (report.matched || []).map(m => m.id!).filter((id): id is number => typeof id === 'number');
        const overwroteN = this.overwriteExisting ? (report.wouldOverwrite?.length ?? 0) : 0;
        const summary = overwroteN > 0
          ? `${report.matched.length} créées · ${overwroteN} écrasées`
          : `${report.matched.length} mesures créées depuis ${this.droppedFile?.name ?? 'log'}`;
        this.toast.add({
          severity: 'success',
          summary: 'Import terminé',
          detail: summary
        });
        this.importSucceeded.emit(ids);
        this.close();
      },
      error: (err) => {
        this.submitting = false;
        this.handleApiError(err, 'import');
      }
    });
  }

  openCatalogTab(code: string): void {
    const url = `/admin/poste-catalog/new?measureCode=${encodeURIComponent(code)}&posteType=${encodeURIComponent(this.posteType)}`;
    window.open(url, '_blank');
  }

  close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    this.droppedFile = null;
    this.report = null;
    this.loading = false;
    this.submitting = false;
    this.fileError = null;
    this.overwriteExisting = false;
  }
}
