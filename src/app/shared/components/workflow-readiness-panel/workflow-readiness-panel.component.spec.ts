import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SidebarModule } from 'primeng/sidebar';
import { WorkflowReadinessPanelComponent } from './workflow-readiness-panel.component';
import {
  WorkflowReadiness,
  WorkflowReadinessMissingMeasure,
  WorkflowReadinessOutOfRangeMeasure,
} from '../../../models/workflow-readiness.model';

function makeReadiness(overrides: Partial<WorkflowReadiness> = {}): WorkflowReadiness {
  return {
    ticketId: 1,
    currentStatus: 'EN_COURS',
    targetStatus: 'EN_REVUE',
    mandatoryTotal: 3,
    mandatoryFilled: 1,
    mandatoryMissing: 2,
    missingMeasures: [],
    outOfRangeMeasures: [],
    canTransition: false,
    blockingReasons: [],
    ...overrides,
  };
}

describe('WorkflowReadinessPanelComponent', () => {
  let component: WorkflowReadinessPanelComponent;
  let fixture: ComponentFixture<WorkflowReadinessPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [WorkflowReadinessPanelComponent],
      imports: [CommonModule, NoopAnimationsModule, SidebarModule],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkflowReadinessPanelComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('isEmpty is true when readiness is null', () => {
    component.readiness = null;
    expect(component.isEmpty).toBe(true);
  });

  it('isEmpty is true when both lists are empty', () => {
    component.readiness = makeReadiness({ missingMeasures: [], outOfRangeMeasures: [] });
    expect(component.isEmpty).toBe(true);
  });

  it('isEmpty is false when missingMeasures has entries', () => {
    component.readiness = makeReadiness({
      missingMeasures: [
        { measureCode: 'A', label: 'Alpha', required: true, catalogTemplateId: 1 },
      ],
    });
    expect(component.isEmpty).toBe(false);
  });

  it('isEmpty is false when outOfRangeMeasures has entries', () => {
    component.readiness = makeReadiness({
      outOfRangeMeasures: [
        {
          measureId: 9,
          measureCode: 'X',
          label: 'X label',
          measuredValue: 20,
          unit: 'dBm',
          lowerBound: 13.5,
          upperBound: 16.5,
          deviationPct: 433.33,
        },
      ],
    });
    expect(component.isEmpty).toBe(false);
  });

  it('onMissingClick emits missingMeasureClicked with the row', () => {
    const m: WorkflowReadinessMissingMeasure = {
      measureCode: 'A',
      label: 'Alpha',
      required: true,
      catalogTemplateId: 7,
    };
    let emitted: WorkflowReadinessMissingMeasure | null = null;
    component.missingMeasureClicked.subscribe((e: WorkflowReadinessMissingMeasure) => {
      emitted = e;
    });
    component.onMissingClick(m);
    expect(emitted as WorkflowReadinessMissingMeasure | null).toEqual(m);
  });

  it('onOutOfRangeClick emits outOfRangeMeasureClicked with the row', () => {
    const m: WorkflowReadinessOutOfRangeMeasure = {
      measureId: 9,
      measureCode: 'X',
      label: 'X label',
      measuredValue: 20,
      unit: 'dBm',
      lowerBound: 13.5,
      upperBound: 16.5,
      deviationPct: 433.33,
    };
    let emitted: WorkflowReadinessOutOfRangeMeasure | null = null;
    component.outOfRangeMeasureClicked.subscribe((e: WorkflowReadinessOutOfRangeMeasure) => {
      emitted = e;
    });
    component.onOutOfRangeClick(m);
    expect(emitted as WorkflowReadinessOutOfRangeMeasure | null).toEqual(m);
  });

  it('onHide flips visible to false and emits visibleChange(false)', () => {
    component.visible = true;
    let emitted: boolean | null = null;
    component.visibleChange.subscribe((v: boolean) => {
      emitted = v;
    });
    component.onHide();
    expect(component.visible).toBe(false);
    expect(emitted as boolean | null).toBe(false);
  });
});
