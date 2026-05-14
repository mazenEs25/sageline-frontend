import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { DropdownModule } from 'primeng/dropdown';
import { MeasurePanelComponent } from './measure-panel.component';
import { ValidationMeasureService } from '../../../services/validation-measure.service';
import { AuthService } from '../../../auth/auth.service';
import { of } from 'rxjs';
import { ValidationMeasure } from '../../../models/validation-measure.model';

describe('MeasurePanelComponent', () => {
  let component: MeasurePanelComponent;
  let fixture: ComponentFixture<MeasurePanelComponent>;
  let service: ValidationMeasureService;

  const mockMeasures: ValidationMeasure[] = [
    { id: 1, status: 'OK', category: 'VOLTAGE', measureCode: 'M1', measureLabel: 'Voltage', validationId: 1, catalogTemplateId: null, measuredValue: 10, unit: 'V', lowerBound: 5, upperBound: 15, antenna: null, frequencyMhz: null, modulationScheme: null, deviationPct: 10, measuredAt: '2026-05-14', enteredById: 1, enteredByUsername: 'test', sourceLogFile: null },
    { id: 2, status: 'OUT_OF_RANGE', category: 'CURRENT', measureCode: 'M2', measureLabel: 'Current', validationId: 1, catalogTemplateId: null, measuredValue: 20, unit: 'A', lowerBound: 0, upperBound: 10, antenna: null, frequencyMhz: null, modulationScheme: null, deviationPct: 50, measuredAt: '2026-05-14', enteredById: 1, enteredByUsername: 'test', sourceLogFile: null },
    { id: 3, status: 'NOT_EXECUTED', category: 'FREQUENCY', measureCode: 'M3', measureLabel: 'Signal', validationId: 1, catalogTemplateId: null, measuredValue: null, unit: 'dBm', lowerBound: -20, upperBound: 0, antenna: null, frequencyMhz: null, modulationScheme: null, deviationPct: 0, measuredAt: '2026-05-14', enteredById: 1, enteredByUsername: 'test', sourceLogFile: null },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MeasurePanelComponent],
      imports: [HttpClientTestingModule, FormsModule, TagModule, TableModule, DropdownModule],
      providers: [
        { provide: AuthService, useValue: { getRoles: () => ['TECH_VAL'] } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    service = TestBed.inject(ValidationMeasureService);
    fixture = TestBed.createComponent(MeasurePanelComponent);
    component = fixture.componentInstance;
  });

  it('should call list on first ngOnChanges with validationId', () => {
    spyOn(service, 'list').and.returnValue(of(mockMeasures));
    component.validationId = 42;
    component.ngOnChanges({ validationId: { currentValue: 42, previousValue: undefined, firstChange: true, isFirstChange: () => true } });
    expect(service.list).toHaveBeenCalledWith(42);
  });

  it('should filter to OK status only when statusFilter is OK', () => {
    component.measures = mockMeasures;
    component.statusFilter = 'OK';
    expect(component.filteredMeasures.length).toBe(1);
    expect(component.filteredMeasures[0].status).toBe('OK');
  });

  it('should render the empty-state text when measures is empty', () => {
    spyOn(service, 'list').and.returnValue(of([]));
    component.validationId = 1;
    component.measures = [];
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Aucune mesure');
  });
});
