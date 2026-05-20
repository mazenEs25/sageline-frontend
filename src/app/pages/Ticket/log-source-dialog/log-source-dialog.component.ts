import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { ValidationMeasureService } from '../../../services/validation-measure.service';
import { LogSourceSnippet } from '../../../models/log-source-snippet.model';

@Component({
  selector: 'app-log-source-dialog',
  templateUrl: './log-source-dialog.component.html',
  styleUrls: ['./log-source-dialog.component.scss'],
  standalone: false
})
export class LogSourceDialogComponent implements OnChanges {
  @Input() ticketId!: number;
  @Input() measureId: number | null = null;
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  snippet: LogSourceSnippet | null = null;
  loading = false;
  error: string | null = null;

  constructor(private measures: ValidationMeasureService) {}

  ngOnChanges(_changes: SimpleChanges): void {
    if (this.visible && this.measureId != null && this.ticketId != null) {
      this.load();
    }
  }

  private load(): void {
    this.loading = true;
    this.snippet = null;
    this.error = null;
    this.measures.getSourceSnippet(this.ticketId, this.measureId!).subscribe({
      next: (s) => { this.snippet = s; this.loading = false; },
      error: (err) => {
        this.loading = false;
        this.snippet = null;
        this.error = err?.status === 404
          ? 'Source snippet not available for this measure'
          : err?.status === 410
          ? 'Source log no longer available on the server'
          : 'Could not load source snippet';
      }
    });
  }

  close(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    this.snippet = null;
    this.error = null;
  }
}
