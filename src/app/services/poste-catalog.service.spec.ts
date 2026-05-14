import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PosteCatalogService } from './poste-catalog.service';
import { PosteMeasureCatalog, CreatePosteMeasureCatalogRequest, UpdatePosteMeasureCatalogRequest } from '../models/poste-measure-catalog.model';
import { environment } from '../../environments/environment';

describe('PosteCatalogService', () => {
  let service: PosteCatalogService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/poste-catalog`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [PosteCatalogService],
    });
    service = TestBed.inject(PosteCatalogService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('listAll should call GET on apiUrl', () => {
    const mockData: PosteMeasureCatalog[] = [];
    service.listAll().subscribe(() => {});
    const req = httpMock.expectOne(apiUrl);
    expect(req.request.method).toBe('GET');
    req.flush(mockData);
  });

  it('getByPosteType should call GET on apiUrl/{posteType}', () => {
    const mockData: PosteMeasureCatalog[] = [];
    service.getByPosteType('WIFI_CONDUIT').subscribe(() => {});
    const req = httpMock.expectOne(`${apiUrl}/WIFI_CONDUIT`);
    expect(req.request.method).toBe('GET');
    req.flush(mockData);
  });

  it('getMeasuresByPosteType should call GET on apiUrl/{posteType}/measures', () => {
    const mockData: PosteMeasureCatalog[] = [];
    service.getMeasuresByPosteType('WIFI_CONDUIT').subscribe(() => {});
    const req = httpMock.expectOne(`${apiUrl}/WIFI_CONDUIT/measures`);
    expect(req.request.method).toBe('GET');
    req.flush(mockData);
  });

  it('create should call POST on apiUrl/measures', () => {
    const mockData: PosteMeasureCatalog = { id: 1, posteType: 'WIFI_CONDUIT', measureCode: 'TEST', measureLabel: 'Test', category: 'POWER', defaultUnit: 'W', defaultLowerBound: 0, defaultUpperBound: 100, mandatory: true, displayOrder: 0, antenna: null, frequencyMhz: null, modulationScheme: null, active: true };
    const dto: CreatePosteMeasureCatalogRequest = { posteType: 'WIFI_CONDUIT', measureCode: 'TEST', measureLabel: 'Test', category: 'POWER', defaultUnit: 'W', defaultLowerBound: 0, defaultUpperBound: 100, mandatory: true, displayOrder: 0 };
    service.create(dto).subscribe(() => {});
    const req = httpMock.expectOne(`${apiUrl}/measures`);
    expect(req.request.method).toBe('POST');
    req.flush(mockData);
  });

  it('update should call PUT on apiUrl/measures/{id}', () => {
    const mockData: PosteMeasureCatalog = { id: 1, posteType: 'WIFI_CONDUIT', measureCode: 'TEST', measureLabel: 'Updated', category: 'POWER', defaultUnit: 'W', defaultLowerBound: 0, defaultUpperBound: 100, mandatory: true, displayOrder: 0, antenna: null, frequencyMhz: null, modulationScheme: null, active: true };
    const dto: UpdatePosteMeasureCatalogRequest = { measureLabel: 'Updated', category: 'POWER', defaultUnit: 'W', defaultLowerBound: 0, defaultUpperBound: 100, mandatory: true, displayOrder: 0 };
    service.update(1, dto).subscribe(() => {});
    const req = httpMock.expectOne(`${apiUrl}/measures/1`);
    expect(req.request.method).toBe('PUT');
    req.flush(mockData);
  });

  it('delete should call DELETE on apiUrl/measures/{id}', () => {
    service.delete(1).subscribe(() => {});
    const req = httpMock.expectOne(`${apiUrl}/measures/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
