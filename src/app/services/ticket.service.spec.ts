import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { TicketService, WorkflowReadinessBlockedError } from './ticket.service';
import { environment } from '../../environments/environment';
import { WorkflowReadiness } from '../models/workflow-readiness.model';

describe('TicketService', () => {
  let service: TicketService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/validations`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TicketService],
    });
    service = TestBed.inject(TicketService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getReadiness + submitForReview 422', () => {
    const blockedBody: WorkflowReadiness = {
      ticketId: 42,
      currentStatus: 'EN_COURS',
      targetStatus: 'EN_REVUE',
      mandatoryTotal: 16,
      mandatoryFilled: 14,
      mandatoryMissing: 2,
      missingMeasures: [
        { measureCode: 'PWR_A', label: 'Power A', required: true, catalogTemplateId: 1 },
        { measureCode: 'PWR_B', label: 'Power B', required: true, catalogTemplateId: 2 },
      ],
      outOfRangeMeasures: [],
      canTransition: false,
      blockingReasons: ['2 mandatory measures still in NOT_EXECUTED state'],
    };

    it('getReadiness(id) issues GET /api/validations/{id}/readiness', () => {
      service.getReadiness(42).subscribe((r) => expect(r.ticketId).toBe(42));
      const req = httpMock.expectOne((r) => r.url === `${apiUrl}/42/readiness` && r.method === 'GET');
      expect(req.request.params.keys().length).toBe(0);
      req.flush({ ...blockedBody, canTransition: true });
    });

    it('getReadiness(id, "EN_REVUE") forwards ?targetStatus=EN_REVUE', () => {
      service.getReadiness(42, 'EN_REVUE').subscribe();
      const req = httpMock.expectOne(
        (r) => r.url === `${apiUrl}/42/readiness` && r.params.get('targetStatus') === 'EN_REVUE'
      );
      expect(req.request.method).toBe('GET');
      req.flush(blockedBody);
    });

    it('submitForReview(id) on HTTP 200 emits the Validation body', () => {
      const fake = { id: 42, status: 'EN_REVUE' } as any;
      let result: any = null;
      service.submitForReview(42).subscribe((v) => (result = v));
      const req = httpMock.expectOne({ url: `${apiUrl}/42/submit-review`, method: 'PATCH' });
      req.flush(fake);
      expect(result).toEqual(fake);
    });

    it('submitForReview(id) on HTTP 422 with canTransition=false throws WorkflowReadinessBlockedError', () => {
      let caught: unknown = null;
      service.submitForReview(42).subscribe({
        next: () => fail('should not succeed'),
        error: (e) => (caught = e),
      });
      const req = httpMock.expectOne({ url: `${apiUrl}/42/submit-review`, method: 'PATCH' });
      req.flush(blockedBody, { status: 422, statusText: 'Unprocessable Entity' });

      expect(caught instanceof WorkflowReadinessBlockedError).toBe(true);
      const err = caught as WorkflowReadinessBlockedError;
      expect(err.readiness).toEqual(blockedBody);
      expect(err.readiness.canTransition).toBe(false);
      expect(err.message).toContain('NOT_EXECUTED');
    });

    it('submitForReview(id) on HTTP 422 without canTransition false rethrows original HttpErrorResponse', () => {
      let caught: unknown = null;
      service.submitForReview(42).subscribe({
        next: () => fail('should not succeed'),
        error: (e) => (caught = e),
      });
      const req = httpMock.expectOne({ url: `${apiUrl}/42/submit-review`, method: 'PATCH' });
      req.flush({ message: 'something else' }, { status: 422, statusText: 'Unprocessable Entity' });

      expect(caught instanceof WorkflowReadinessBlockedError).toBe(false);
      expect(caught instanceof HttpErrorResponse).toBe(true);
    });

    it('submitForReview(id) on HTTP 500 rethrows original HttpErrorResponse', () => {
      let caught: unknown = null;
      service.submitForReview(42).subscribe({
        next: () => fail('should not succeed'),
        error: (e) => (caught = e),
      });
      const req = httpMock.expectOne({ url: `${apiUrl}/42/submit-review`, method: 'PATCH' });
      req.flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });

      expect(caught instanceof WorkflowReadinessBlockedError).toBe(false);
      expect(caught instanceof HttpErrorResponse).toBe(true);
      expect((caught as HttpErrorResponse).status).toBe(500);
    });
  });
});
