import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  WorkflowReadiness,
  WorkflowReadinessMissingMeasure,
  WorkflowReadinessOutOfRangeMeasure,
} from '../../../models/workflow-readiness.model';

@Component({
  selector: 'app-workflow-readiness-panel',
  templateUrl: './workflow-readiness-panel.component.html',
  styleUrls: ['./workflow-readiness-panel.component.scss'],
  standalone: false,
})
export class WorkflowReadinessPanelComponent {
  @Input() visible = false;
  @Input() readiness: WorkflowReadiness | null = null;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() missingMeasureClicked = new EventEmitter<WorkflowReadinessMissingMeasure>();
  @Output() outOfRangeMeasureClicked = new EventEmitter<WorkflowReadinessOutOfRangeMeasure>();

  get isEmpty(): boolean {
    if (!this.readiness) return true;
    return (
      this.readiness.missingMeasures.length === 0 &&
      this.readiness.outOfRangeMeasures.length === 0
    );
  }

  onHide(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  onMissingClick(m: WorkflowReadinessMissingMeasure): void {
    this.missingMeasureClicked.emit(m);
  }

  onOutOfRangeClick(m: WorkflowReadinessOutOfRangeMeasure): void {
    this.outOfRangeMeasureClicked.emit(m);
  }
}
