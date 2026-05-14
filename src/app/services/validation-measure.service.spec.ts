import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ValidationMeasureService } from './validation-measure.service';
import { environment } from '../../environments/environment';

describe('ValidationMeasureService', () => {
  let service: ValidationMeasureService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/validations`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ValidationMeasureService]
    });
    service = TestBed.inject(ValidationMeasureService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should call list with correct URL and GET method', () => {
    const validationId = 42;
    service.list(validationId).subscribe();
    const req = httpMock.expectOne({ url: `${apiUrl}/42/measures`, method: 'GET' });
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should call create with correct URL and POST method', () => {
    const validationId = 42;
    const dto = { measureCode: 'TEST' };
    service.create(validationId, dto).subscribe();
    const req = httpMock.expectOne({ url: `${apiUrl}/42/measures`, method: 'POST' });
    expect(req.request.method).toBe('POST');
    req.flush({} as any);
  });

  it('should call update with correct URL and PUT method', () => {
    const validationId = 42;
    const measureId = 7;
    const dto = { measuredValue: 10.5 };
    service.update(validationId, measureId, dto).subscribe();
    const req = httpMock.expectOne({ url: `${apiUrl}/42/measures/7`, method: 'PUT' });
    expect(req.request.method).toBe('PUT');
    req.flush({} as any);
  });

  it('should call delete with correct URL and DELETE method', () => {
    const validationId = 42;
    const measureId = 7;
    service.delete(validationId, measureId).subscribe();
    const req = httpMock.expectOne({ url: `${apiUrl}/42/measures/7`, method: 'DELETE' });
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('should call createBatch with correct URL and POST method', () => {
    const validationId = 42;
    const body = { items: [] };
    service.createBatch(validationId, body).subscribe();
    const req = httpMock.expectOne({ url: `${apiUrl}/42/measures/batch`, method: 'POST' });
    expect(req.request.method).toBe('POST');
    req.flush({ results: [], summary: { succeeded: 0, failed: 0 } });
  });

  it('should call updateBatch with correct URL and PUT method', () => {
    const validationId = 42;
    const body = { items: [] };
    service.updateBatch(validationId, body).subscribe();
    const req = httpMock.expectOne({ url: `${apiUrl}/42/measures/batch`, method: 'PUT' });
    expect(req.request.method).toBe('PUT');
    req.flush({ results: [], summary: { succeeded: 0, failed: 0 } });
  });

  it('should call fromTemplate with correct URL and POST method', () => {
    const validationId = 42;
    const templateId = 87;
    service.fromTemplate(validationId, templateId).subscribe();
    const req = httpMock.expectOne({ url: `${apiUrl}/42/measures/from-template/87`, method: 'POST' });
    expect(req.request.method).toBe('POST');
    req.flush({} as any);
  });

  it('should call fromCatalog with correct URL and POST method', () => {
    const validationId = 42;
    service.fromCatalog(validationId).subscribe();
    const req = httpMock.expectOne({ url: `${apiUrl}/42/measures/from-catalog`, method: 'POST' });
    expect(req.request.method).toBe('POST');
    req.flush({ created: 0, skipped: 0, measures: [] });
  });
});
