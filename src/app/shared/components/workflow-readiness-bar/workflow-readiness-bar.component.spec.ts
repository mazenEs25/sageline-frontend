import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ProgressBarModule } from 'primeng/progressbar';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { WorkflowReadinessBarComponent } from './workflow-readiness-bar.component';
import { WorkflowReadiness } from '../../../models/workflow-readiness.model';

describe('WorkflowReadinessBarComponent', () => {
  let component: WorkflowReadinessBarComponent;
  let fixture: ComponentFixture<WorkflowReadinessBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [WorkflowReadinessBarComponent],
      imports: [
        NoopAnimationsModule,
        ProgressBarModule,
        SkeletonModule,
        TooltipModule,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkflowReadinessBarComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render skeleton when readiness is null', () => {
    component.readiness = null;
    fixture.detectChanges();
    const skeleton = fixture.nativeElement.querySelector('p-skeleton');
    expect(skeleton).toBeTruthy();
  });

  it('should render mandatoryFilled / mandatoryTotal text when readiness is provided', () => {
    component.readiness = {
      ticketId: 1,
      currentStatus: 'EN_COURS' as any,
      targetStatus: 'EN_REVUE' as any,
      mandatoryTotal: 10,
      mandatoryFilled: 8,
      mandatoryMissing: 2,
      missingMeasures: [],
      outOfRangeMeasures: [],
      canTransition: true,
      blockingReasons: [],
    };
    fixture.detectChanges();
    const label = fixture.nativeElement.querySelector('.readiness-label');
    expect(label.textContent).toContain('8 / 10');
  });

  it('colorBand should return red for 30% filled', () => {
    component.readiness = {
      ticketId: 1,
      currentStatus: 'EN_COURS' as any,
      targetStatus: 'EN_REVUE' as any,
      mandatoryTotal: 10,
      mandatoryFilled: 3,
      mandatoryMissing: 7,
      missingMeasures: [],
      outOfRangeMeasures: [],
      canTransition: false,
      blockingReasons: [],
    };
    expect(component.colorBand).toBe('red');
  });

  it('colorBand should return amber for 75% filled', () => {
    component.readiness = {
      ticketId: 1,
      currentStatus: 'EN_COURS' as any,
      targetStatus: 'EN_REVUE' as any,
      mandatoryTotal: 4,
      mandatoryFilled: 3,
      mandatoryMissing: 1,
      missingMeasures: [],
      outOfRangeMeasures: [],
      canTransition: false,
      blockingReasons: [],
    };
    expect(component.colorBand).toBe('amber');
  });

  it('colorBand should return green for 100% filled', () => {
    component.readiness = {
      ticketId: 1,
      currentStatus: 'EN_COURS' as any,
      targetStatus: 'EN_REVUE' as any,
      mandatoryTotal: 10,
      mandatoryFilled: 10,
      mandatoryMissing: 0,
      missingMeasures: [],
      outOfRangeMeasures: [],
      canTransition: true,
      blockingReasons: [],
    };
    expect(component.colorBand).toBe('green');
  });

  it('colorBand should return gray for mandatoryTotal === 0', () => {
    component.readiness = {
      ticketId: 1,
      currentStatus: 'EN_COURS' as any,
      targetStatus: 'EN_REVUE' as any,
      mandatoryTotal: 0,
      mandatoryFilled: 0,
      mandatoryMissing: 0,
      missingMeasures: [],
      outOfRangeMeasures: [],
      canTransition: true,
      blockingReasons: [],
    };
    expect(component.colorBand).toBe('gray');
  });

  it('pausedIndicatorVisible should become true after 5 seconds when wsConnected becomes false', fakeAsync(() => {
    component.wsConnected = true;
    component.ngOnChanges({
      wsConnected: { previousValue: false, currentValue: true, firstChange: true, isFirstChange: () => true },
    });

    component.wsConnected = false;
    component.ngOnChanges({
      wsConnected: { previousValue: true, currentValue: false, firstChange: false, isFirstChange: () => false },
    });

    expect(component.pausedIndicatorVisible).toBe(false);
    tick(5000);
    expect(component.pausedIndicatorVisible).toBe(true);
  }));

  it('pausedIndicatorVisible should become false when wsConnected returns to true', fakeAsync(() => {
    component.wsConnected = false;
    component.ngOnChanges({
      wsConnected: { previousValue: true, currentValue: false, firstChange: false, isFirstChange: () => false },
    });
    tick(5000);
    expect(component.pausedIndicatorVisible).toBe(true);

    component.wsConnected = true;
    component.ngOnChanges({
      wsConnected: { previousValue: false, currentValue: true, firstChange: false, isFirstChange: () => false },
    });
    expect(component.pausedIndicatorVisible).toBe(false);
  }));

  it('should emit panelToggleRequested when bar is clicked', () => {
    spyOn(component.panelToggleRequested, 'emit');
    component.onBarClick();
    expect(component.panelToggleRequested.emit).toHaveBeenCalled();
  });

  it('should emit refreshRequested when refresh link is clicked', () => {
    spyOn(component.refreshRequested, 'emit');
    const event = new MouseEvent('click');
    component.onRefreshClick(event);
    expect(component.refreshRequested.emit).toHaveBeenCalled();
  });
});
