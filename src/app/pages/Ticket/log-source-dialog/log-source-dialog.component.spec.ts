import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SimpleChange } from '@angular/core';
import { LogSourceDialogComponent } from './log-source-dialog.component';
import { ValidationMeasureService } from '../../../services/validation-measure.service';
import { environment } from '../../../../environments/environment';

describe('LogSourceDialogComponent', () => {
  let fixture: ComponentFixture<LogSourceDialogComponent>;
  let component: LogSourceDialogComponent;
  let http: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/validations`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, NoopAnimationsModule],
      declarations: [LogSourceDialogComponent],
      providers: [ValidationMeasureService]
    })
    .overrideComponent(LogSourceDialogComponent, { set: { template: '' } })
    .compileComponents();

    fixture = TestBed.createComponent(LogSourceDialogComponent);
    component = fixture.componentInstance;
    component.ticketId = 7;
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function trigger(measureId: number, visible: boolean) {
    component.measureId = measureId;
    component.visible = visible;
    component.ngOnChanges({
      measureId: new SimpleChange(null, measureId, true),
      visible:   new SimpleChange(false, visible, true)
    } as any);
  }

  it('loads the snippet when visible becomes true with a measureId', () => {
    trigger(33, true);
    const req = http.expectOne({ url: `${apiUrl}/7/measures/33/source-snippet`, method: 'GET' });
    req.flush({ filename: 'bwc.log', snippet: 'line1\nline2', lineRange: '42-43' });
    expect(component.snippet?.filename).toBe('bwc.log');
    expect(component.error).toBeNull();
  });

  it('surfaces a 404 with the no-longer-available message', () => {
    trigger(34, true);
    const req = http.expectOne({ url: `${apiUrl}/7/measures/34/source-snippet`, method: 'GET' });
    req.flush({ message: 'not found' }, { status: 404, statusText: 'Not Found' });
    expect(component.snippet).toBeNull();
    expect(component.error).toBe('Source snippet not available for this measure');
  });

  it('surfaces a 410 with the deleted-on-server message', () => {
    trigger(35, true);
    const req = http.expectOne({ url: `${apiUrl}/7/measures/35/source-snippet`, method: 'GET' });
    req.flush({ message: 'gone' }, { status: 410, statusText: 'Gone' });
    expect(component.error).toBe('Source log no longer available on the server');
  });
});
