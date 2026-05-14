import { MeasureUnitPipe } from './measure-unit.pipe';

describe('MeasureUnitPipe', () => {
  const pipe = new MeasureUnitPipe();

  it('should return empty string when value is null', () => {
    expect(pipe.transform(null, 'dBm')).toBe('');
  });

  it('should return empty string when value is undefined', () => {
    expect(pipe.transform(undefined, 'dBm')).toBe('');
  });

  it('should format value with unit', () => {
    expect(pipe.transform(15.521, 'dBm')).toBe('15.52 dBm');
  });

  it('should format zero with unit', () => {
    expect(pipe.transform(0, 'V')).toBe('0.00 V');
  });

  it('should format value without unit', () => {
    expect(pipe.transform(15.521, null)).toBe('15.52');
  });

  it('should respect custom digit precision', () => {
    expect(pipe.transform(15.521, 'dBm', 3)).toBe('15.521 dBm');
  });
});
