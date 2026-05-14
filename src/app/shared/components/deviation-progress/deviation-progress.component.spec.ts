import { DeviationProgressComponent } from './deviation-progress.component';

describe('DeviationProgressComponent', () => {
  it('should set band to green and widthPct to 33 when deviationPct is 33', () => {
    const c = new DeviationProgressComponent();
    c.deviationPct = 33;
    expect(c.band).toBe('green');
    expect(c.widthPct).toBe(33);
  });

  it('should set band to green and widthPct to 50 when deviationPct is 50', () => {
    const c = new DeviationProgressComponent();
    c.deviationPct = 50;
    expect(c.band).toBe('green');
    expect(c.widthPct).toBe(50);
  });

  it('should set band to amber and widthPct to 75 when deviationPct is 75', () => {
    const c = new DeviationProgressComponent();
    c.deviationPct = 75;
    expect(c.band).toBe('amber');
    expect(c.widthPct).toBe(75);
  });

  it('should set band to amber and widthPct to 100 when deviationPct is 100', () => {
    const c = new DeviationProgressComponent();
    c.deviationPct = 100;
    expect(c.band).toBe('amber');
    expect(c.widthPct).toBe(100);
  });

  it('should set band to red and widthPct to 100 when deviationPct is 150', () => {
    const c = new DeviationProgressComponent();
    c.deviationPct = 150;
    expect(c.band).toBe('red');
    expect(c.widthPct).toBe(100);
  });
});
