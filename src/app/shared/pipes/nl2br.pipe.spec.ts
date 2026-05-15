import { TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { Nl2brPipe } from './nl2br.pipe';

describe('Nl2brPipe', () => {
  it('create an instance', () => {
    TestBed.configureTestingModule({});
    const sanitizer = TestBed.inject(DomSanitizer);
    const pipe = new Nl2brPipe(sanitizer);
    expect(pipe).toBeTruthy();
  });
});
