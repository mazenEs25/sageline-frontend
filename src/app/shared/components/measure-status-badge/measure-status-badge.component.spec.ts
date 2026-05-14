import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TagModule } from 'primeng/tag';
import { MeasureStatusBadgeComponent } from './measure-status-badge.component';
import { MeasureStatus } from '../../enums/measure-status.enum';

describe('MeasureStatusBadgeComponent', () => {
  let component: MeasureStatusBadgeComponent;
  let fixture: ComponentFixture<MeasureStatusBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MeasureStatusBadgeComponent],
      imports: [TagModule],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(MeasureStatusBadgeComponent);
    component = fixture.componentInstance;
  });

  it('should render OK status', () => {
    component.status = 'OK' as MeasureStatus;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('p-tag')).toBeTruthy();
  });

  it('should render OUT_OF_RANGE status', () => {
    component.status = 'OUT_OF_RANGE' as MeasureStatus;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('p-tag')).toBeTruthy();
  });

  it('should render NOT_EXECUTED status', () => {
    component.status = 'NOT_EXECUTED' as MeasureStatus;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('p-tag')).toBeTruthy();
  });
});
