import { TestBed } from '@angular/core/testing';

import { MessageApiService } from './message.service';

describe('MessageApiService', () => {
  let service: MessageApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MessageApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
