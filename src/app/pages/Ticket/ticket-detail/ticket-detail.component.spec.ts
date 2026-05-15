import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { of, Subject, throwError, BehaviorSubject } from 'rxjs';
import { MessageService, ConfirmationService } from 'primeng/api';

import { TicketDetailComponent } from './ticket-detail.component';
import { TicketService, WorkflowReadinessBlockedError } from '../../../services/ticket.service';
import { WebSocketService } from '../../../services/websocket.service';
import { AuthService } from '../../../auth/auth.service';
import { WorkflowReadiness } from '../../../models/workflow-readiness.model';

function makeReadiness(overrides: Partial<WorkflowReadiness> = {}): WorkflowReadiness {
  return {
    ticketId: 42,
    currentStatus: 'EN_COURS',
    targetStatus: 'EN_REVUE',
    mandatoryTotal: 16,
    mandatoryFilled: 14,
    mandatoryMissing: 2,
    missingMeasures: [],
    outOfRangeMeasures: [],
    canTransition: false,
    blockingReasons: ['2 missing'],
    ...overrides,
  };
}

describe('TicketDetailComponent — readiness wiring', () => {
  let component: TicketDetailComponent;
  let fixture: ComponentFixture<TicketDetailComponent>;

  let ticketServiceSpy: jasmine.SpyObj<TicketService>;
  let messageServiceSpy: jasmine.SpyObj<MessageService>;
  let confirmationServiceSpy: jasmine.SpyObj<ConfirmationService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let routerSpy: jasmine.SpyObj<Router>;

  // WS stub state
  let connected$: BehaviorSubject<boolean>;
  let readinessTopicHandler: ((payload: any) => void) | null;
  let wsServiceStub: Partial<WebSocketService>;

  beforeEach(async () => {
    connected$ = new BehaviorSubject<boolean>(true);
    readinessTopicHandler = null;

    wsServiceStub = {
      isConnected$: connected$.asObservable(),
      ticketNotifications$: of(null),
      subscribe: ((topic: string, cb: (m: any) => void) => {
        if (topic.endsWith('/readiness')) {
          readinessTopicHandler = cb;
        }
      }) as any,
      unsubscribe: (() => {}) as any,
    };

    ticketServiceSpy = jasmine.createSpyObj<TicketService>('TicketService', [
      'getById',
      'getReadiness',
      'submitForReview',
      'startPrep',
      'validatePrep',
      'startValidation',
      'closeTicket',
      'cancelTicket',
      'markPosteDone',
    ]);
    ticketServiceSpy.getById.and.returnValue(of({ id: 42, status: 'EN_COURS' } as any));
    ticketServiceSpy.getReadiness.and.returnValue(of(makeReadiness()));

    messageServiceSpy = jasmine.createSpyObj<MessageService>('MessageService', ['add']);
    confirmationServiceSpy = jasmine.createSpyObj<ConfirmationService>('ConfirmationService', ['confirm']);
    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', ['getRoles', 'getCurrentUserId']);
    authServiceSpy.getRoles.and.returnValue([]);
    authServiceSpy.getCurrentUserId.and.returnValue(1);

    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);

    await TestBed.configureTestingModule({
      declarations: [TicketDetailComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '42' } } } },
        { provide: Router, useValue: routerSpy },
        { provide: TicketService, useValue: ticketServiceSpy },
        { provide: WebSocketService, useValue: wsServiceStub },
        { provide: AuthService, useValue: authServiceSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(TicketDetailComponent, {
        set: {
          providers: [
            { provide: MessageService, useValue: messageServiceSpy },
            { provide: ConfirmationService, useValue: confirmationServiceSpy },
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(TicketDetailComponent);
    component = fixture.componentInstance;
  });

  it('calls getReadiness exactly once on ngOnInit', () => {
    fixture.detectChanges();
    expect(ticketServiceSpy.getReadiness).toHaveBeenCalledTimes(1);
    expect(ticketServiceSpy.getReadiness).toHaveBeenCalledWith(42);
  });

  it('applies a WebSocket readiness payload after the 200ms auditTime tick', fakeAsync(() => {
    fixture.detectChanges();
    const initial = component.readiness;
    expect(initial?.mandatoryFilled).toBe(14);

    const pushed = makeReadiness({ mandatoryFilled: 16, canTransition: true });
    readinessTopicHandler?.(pushed);

    tick(199);
    expect(component.readiness?.mandatoryFilled).toBe(14);
    tick(1);
    expect(component.readiness?.mandatoryFilled).toBe(16);
    expect(component.readiness?.canTransition).toBe(true);

    component.ngOnDestroy();
  }));

  it('mirrors wsConnected from WebSocketService.isConnected$', () => {
    fixture.detectChanges();
    expect(component.wsConnected).toBe(true);
    connected$.next(false);
    expect(component.wsConnected).toBe(false);
    connected$.next(true);
    expect(component.wsConnected).toBe(true);
  });

  it('onMeasuresChanged refreshes readiness ONLY when wsConnected is false', () => {
    fixture.detectChanges();
    ticketServiceSpy.getReadiness.calls.reset();

    // ws still connected → no refresh
    component.onMeasuresChanged();
    expect(ticketServiceSpy.getReadiness).not.toHaveBeenCalled();

    // ws goes down → refresh fires
    connected$.next(false);
    component.onMeasuresChanged();
    expect(ticketServiceSpy.getReadiness).toHaveBeenCalledTimes(1);
  });

  it('onRefreshReadiness always triggers a one-shot getReadiness', () => {
    fixture.detectChanges();
    ticketServiceSpy.getReadiness.calls.reset();
    component.onRefreshReadiness();
    expect(ticketServiceSpy.getReadiness).toHaveBeenCalledTimes(1);
  });

  it('isSubmitDisabled reflects canTransition', () => {
    fixture.detectChanges();
    component.readiness = makeReadiness({ canTransition: false });
    expect(component.isSubmitDisabled).toBe(true);
    component.readiness = makeReadiness({ canTransition: true });
    expect(component.isSubmitDisabled).toBe(false);
    component.readiness = null;
    expect(component.isSubmitDisabled).toBe(true);
  });

  it('submitLabel includes (filled/total) when blocked, and standard label when ready', () => {
    fixture.detectChanges();
    component.readiness = makeReadiness({ canTransition: false, mandatoryFilled: 14, mandatoryTotal: 16 });
    expect(component.submitLabel).toBe('Submit for review (14/16)');

    component.readiness = makeReadiness({ canTransition: true, mandatoryFilled: 16, mandatoryTotal: 16 });
    expect(component.submitLabel).toBe('Submit for review');

    component.readiness = null;
    expect(component.submitLabel).toBe('Loading…');
  });

  it('on 422 blocked, opens side panel and shows ONE toast within a 3s window (dedup)', fakeAsync(() => {
    fixture.detectChanges();
    const blocked = makeReadiness({ canTransition: false });
    ticketServiceSpy.submitForReview.and.returnValue(
      throwError(() => new WorkflowReadinessBlockedError(blocked))
    );

    component.onSubmitForReview();
    tick();
    expect(component.sidePanelOpen).toBe(true);
    expect(component.readiness).toEqual(blocked);
    expect(messageServiceSpy.add).toHaveBeenCalledTimes(1);

    // immediate second click within 3s — toast deduplicated
    component.onSubmitForReview();
    tick();
    expect(messageServiceSpy.add).toHaveBeenCalledTimes(1);

    // after 3s, toast can fire again
    tick(3001);
    component.onSubmitForReview();
    tick();
    expect(messageServiceSpy.add).toHaveBeenCalledTimes(2);
  }));

  it('on non-422 error, shows a generic error toast and does NOT open the side panel', () => {
    fixture.detectChanges();
    ticketServiceSpy.submitForReview.and.returnValue(throwError(() => new Error('boom')));
    component.sidePanelOpen = false;

    component.onSubmitForReview();

    expect(component.sidePanelOpen).toBe(false);
    expect(messageServiceSpy.add).toHaveBeenCalledTimes(1);
    const arg = messageServiceSpy.add.calls.mostRecent().args[0] as any;
    expect(arg.severity).toBe('error');
  });

  it('clicking a missing-measure row calls measurePanel.scrollToMeasureCode with the code', () => {
    fixture.detectChanges();
    const spy = jasmine.createSpy('scrollToMeasureCode');
    component.measurePanel = { scrollToMeasureCode: spy } as any;
    component.onMissingMeasureClicked({
      measureCode: 'PWR_A',
      label: 'Power A',
      required: true,
      catalogTemplateId: 1,
    });
    expect(spy).toHaveBeenCalledWith('PWR_A');
  });

  it('clicking an out-of-range row calls measurePanel.scrollToMeasureCode with the code', () => {
    fixture.detectChanges();
    const spy = jasmine.createSpy('scrollToMeasureCode');
    component.measurePanel = { scrollToMeasureCode: spy } as any;
    component.onOutOfRangeMeasureClicked({
      measureId: 7,
      measureCode: 'X',
      label: 'X',
      measuredValue: 20,
      unit: 'dBm',
      lowerBound: 13.5,
      upperBound: 16.5,
      deviationPct: 433,
    });
    expect(spy).toHaveBeenCalledWith('X');
  });
});
