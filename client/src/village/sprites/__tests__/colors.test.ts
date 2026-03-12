import { describe, it, expect } from 'vitest';
import { hashColor, darkenColor, lightenColor, relativeLuminance, contrastRatio, PALETTE } from '../colors.js';

describe('hashColor', () => {
  it('returns a color from the provided palette', () => {
    const color = hashColor('my-project', PALETTE.accentColors);
    expect(PALETTE.accentColors).toContain(color);
  });

  it('returns the same color for the same input', () => {
    const a = hashColor('stable-name', PALETTE.accentColors);
    const b = hashColor('stable-name', PALETTE.accentColors);
    expect(a).toBe(b);
  });

  it('distributes across the palette (not always the same index)', () => {
    const colors = new Set(
      ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta']
        .map(s => hashColor(s, PALETTE.accentColors))
    );
    expect(colors.size).toBeGreaterThan(1);
  });

  it('works with single-element palette', () => {
    expect(hashColor('anything', [0xff0000])).toBe(0xff0000);
  });
});

describe('darkenColor', () => {
  it('reduces brightness with factor < 1', () => {
    const original = 0xffffff;
    const darkened = darkenColor(original, 0.5);
    const r = (darkened >> 16) & 0xff;
    const g = (darkened >> 8) & 0xff;
    const b = darkened & 0xff;
    expect(r).toBeLessThan(255);
    expect(g).toBeLessThan(255);
    expect(b).toBeLessThan(255);
  });

  it('returns black when factor is 0', () => {
    expect(darkenColor(0xffffff, 0)).toBe(0x000000);
  });

  it('preserves color when factor is 1', () => {
    const color = 0x804020;
    expect(darkenColor(color, 1)).toBe(color);
  });

  it('handles pure red channel', () => {
    const darkened = darkenColor(0xff0000, 0.5);
    const r = (darkened >> 16) & 0xff;
    const g = (darkened >> 8) & 0xff;
    const b = darkened & 0xff;
    expect(r).toBe(127);
    expect(g).toBe(0);
    expect(b).toBe(0);
  });
});

describe('lightenColor', () => {
  it('increases brightness with factor > 1', () => {
    const original = 0x404040;
    const lightened = lightenColor(original, 1.5);
    const r = (lightened >> 16) & 0xff;
    expect(r).toBeGreaterThan(0x40);
  });

  it('clamps to 255 maximum per channel', () => {
    const lightened = lightenColor(0xffffff, 2.0);
    const r = (lightened >> 16) & 0xff;
    const g = (lightened >> 8) & 0xff;
    const b = lightened & 0xff;
    expect(r).toBeLessThanOrEqual(255);
    expect(g).toBeLessThanOrEqual(255);
    expect(b).toBeLessThanOrEqual(255);
  });

  it('produces a brighter result than the original', () => {
    const original = 0x3a5a7e;
    const lightened = lightenColor(original, 1.3);
    expect(lightened).toBeGreaterThan(original);
  });
});

describe('relativeLuminance', () => {
  it('black has luminance 0', () => {
    expect(relativeLuminance(0x000000)).toBeCloseTo(0, 4);
  });

  it('white has luminance 1', () => {
    expect(relativeLuminance(0xffffff)).toBeCloseTo(1, 4);
  });

  it('pure green has higher luminance than pure red or blue', () => {
    const rL = relativeLuminance(0xff0000);
    const gL = relativeLuminance(0x00ff00);
    const bL = relativeLuminance(0x0000ff);
    expect(gL).toBeGreaterThan(rL);
    expect(gL).toBeGreaterThan(bL);
  });
});

describe('contrastRatio', () => {
  it('white vs black is 21:1', () => {
    expect(contrastRatio(0xffffff, 0x000000)).toBeCloseTo(21, 0);
  });

  it('identical colors yield 1:1', () => {
    expect(contrastRatio(0x444444, 0x444444)).toBeCloseTo(1, 2);
  });

  it('is always >= 1', () => {
    expect(contrastRatio(0x123456, 0x654321)).toBeGreaterThanOrEqual(1);
  });
});
