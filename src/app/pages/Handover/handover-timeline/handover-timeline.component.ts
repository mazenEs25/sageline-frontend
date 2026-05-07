import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { HandoverService } from '../../../services/handover.service';
import { HandoverResponse } from '../../../models/handover.model';
import { TRIGGER_TYPE_LABELS, TRIGGER_TYPE_SEVERITY } from '../../../shared/enums/trigger-type.enum';

@Component({
  selector: 'app-handover-timeline',
  templateUrl: './handover-timeline.component.html',
  styleUrls: ['./handover-timeline.component.scss']
})
export class HandoverTimelineComponent implements OnInit, OnDestroy {
  @Input() validationId!: number;

  handovers: HandoverResponse[] = [];
  loading = true;
  TRIGGER_TYPE_LABELS = TRIGGER_TYPE_LABELS;
  TRIGGER_TYPE_SEVERITY = TRIGGER_TYPE_SEVERITY;

  private historySub?: Subscription;

  constructor(private handoverService: HandoverService) { }

  ngOnInit(): void {
    this.historySub = this.handoverService.getHandoverHistory(this.validationId).subscribe({
      next: (data) => {
        this.handovers = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.historySub?.unsubscribe();
  }

  getTriggerTypeLabel(type: string): string {
    const key = type as keyof typeof TRIGGER_TYPE_LABELS;
    return TRIGGER_TYPE_LABELS[key] || type;
  }

  getTriggerTypeSeverity(type: string): 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast' | undefined {
    const key = type as keyof typeof TRIGGER_TYPE_SEVERITY;
    const severity = TRIGGER_TYPE_SEVERITY[key];
    return (severity as any) || 'info';
  }
}
