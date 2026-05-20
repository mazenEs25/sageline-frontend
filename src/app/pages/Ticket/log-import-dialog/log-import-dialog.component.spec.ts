import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MessageService } from 'primeng/api';
import { LogImportDialogComponent } from './log-import-dialog.component';
import { ValidationMeasureService } from '../../../services/validation-measure.service';
import { AuthService } from '../../../auth/auth.service';
import { environment } from '../../../../environments/environment';

import bwc from './__fixtures__/bwc-report.fixture.json';
import bnft from './__fixtures__/bnft-report.fixture.json';
import btf from './__fixtures__/btf-report.fixture.json';

describe('LogImportDialogComponent', () => {
  let fixture: ComponentFixture<LogImportDialogComponent>;
  let component: LogImportDialogComponent;
  let http: HttpTestingController;

  const apiUrl = `${environment.apiUrl}/validations`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, NoopAnimationsModule],
      declarations: [LogImportDialogComponent],
      providers: [
        MessageService,
        ValidationMeasureService,
        { provide: AuthService, useValue: { getRoles: () => ['TECH_VAL'] } }
      ],
      schemas: [/* CUSTOM_ELEMENTS_SCHEMA omitted intentionally; tests target component logic, not template */ ]
    })
    .overrideComponent(LogImportDialogComponent, { set: { template: '' } })
    .compileComponents();

    fixture = TestBed.createComponent(LogImportDialogComponent);
    component = fixture.componentInstance;
    component.ticketId = 42;
    component.posteType = 'WIFI_CONDUIT';
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function dropAndFlush(fixtureJson: any, filename = 'a.log') {
    const file = new File(['x'], filename, { type: 'text/plain' });
    component.onFileSelected({ files: [file] } as any);
    const req = http.expectOne(r => r.method === 'POST' && r.url === `${apiUrl}/42/preview-log`);
    req.flush(fixtureJson);
  }

  it('rejects .zip with the ZIP-specific message before any HTTP call', () => {
    const file = new File(['x'], 'a.zip', { type: 'application/zip' });
    component.onFileSelected({ files: [file] } as any);
    expect(component.fileError).toBe('ZIP not supported — drop a .log or .txt file');
    http.expectNone(`${apiUrl}/42/preview-log`);
  });

  it('rejects unsupported extension with the generic message before any HTTP call', () => {
    const file = new File(['x'], 'a.pdf', { type: 'application/pdf' });
    component.onFileSelected({ files: [file] } as any);
    expect(component.fileError).toBe('Unsupported file type — drop a .log or .txt file');
    http.expectNone(`${apiUrl}/42/preview-log`);
  });

  it('rejects files larger than 10 MB before any HTTP call', () => {
    const big = new File([new ArrayBuffer(10 * 1024 * 1024 + 1)], 'a.log', { type: 'text/plain' });
    component.onFileSelected({ files: [big] } as any);
    expect(component.fileError).toBe('File too large (max 10 MB)');
    http.expectNone(`${apiUrl}/42/preview-log`);
  });

  it('renders the BWC fixture: matched count, detectedFormat preserved', () => {
    dropAndFlush(bwc);
    expect(component.report?.detectedFormat).toBe('BWC');
    expect(component.totalMatched).toBe(bwc.matched.length);
  });

  it('renders the BNFT fixture: matched length is 6 per SC-003', () => {
    dropAndFlush(bnft, 'bnft.txt');
    expect(component.report?.detectedFormat).toBe('BNFT');
    expect(component.totalMatched).toBe(6);
  });

  it('renders the BTF fixture: detectedFormat preserved', () => {
    dropAndFlush(btf);
    expect(component.report?.detectedFormat).toBe('BTF');
  });

  it('emits importSucceeded exactly once with persisted IDs on confirm', () => {
    dropAndFlush(bwc);
    // simulate the backend returning a matched array with IDs
    const ids: number[] = [];
    component.importSucceeded.subscribe(arr => arr.forEach(i => ids.push(i)));
    component.confirmImport();
    const req = http.expectOne(r => r.method === 'POST' && r.url === `${apiUrl}/42/import-log`);
    req.flush({
      ...bwc,
      matched: bwc.matched.map((m: any, i: number) => ({ ...m, id: 100 + i }))
    });
    expect(ids.length).toBe(bwc.matched.length);
    expect(ids[0]).toBe(100);
  });

  it('disables confirm when there are zero matched measures', () => {
    const empty = { ...bwc, matched: [], totalParsed: 0 };
    dropAndFlush(empty);
    expect(component.confirmDisabled).toBeTrue();
  });

  it('shows "Add to catalog" action only to ADMIN_IT or CHEF_SECTEUR', () => {
    const authStub: any = TestBed.inject(AuthService);
    authStub.getRoles = () => ['TECH_VAL'];
    expect(component.canAddToCatalog).toBeFalse();
    authStub.getRoles = () => ['ADMIN_IT'];
    expect(component.canAddToCatalog).toBeTrue();
    authStub.getRoles = () => ['CHEF_SECTEUR'];
    expect(component.canAddToCatalog).toBeTrue();
  });

  it('opens a new tab when "Add to catalog" is invoked', () => {
    const winSpy = spyOn(window, 'open');
    component.posteType = 'WIFI_CONDUIT';
    component.openCatalogTab('SCRATCH_TEST');
    expect(winSpy).toHaveBeenCalled();
    const url = winSpy.calls.mostRecent().args[0] as string;
    expect(url).toContain('measureCode=SCRATCH_TEST');
    expect(url).toContain('posteType=WIFI_CONDUIT');
    expect(winSpy.calls.mostRecent().args[1]).toBe('_blank');
  });

  it('re-preview re-uses the previously dropped file (no re-drop needed)', () => {
    dropAndFlush(bwc);
    component.rePreview();
    const req = http.expectOne(r => r.method === 'POST' && r.url === `${apiUrl}/42/preview-log`);
    req.flush(bwc);
    expect(component.report?.detectedFormat).toBe('BWC');
  });
});
