import { expect, test } from '@playwright/test';
import { createGridPlan } from '../src/rendering/coordinate-grid';
import type { GridViewport } from '../src/rendering/coordinate-grid';

const viewport: GridViewport = {
  width: 800, height: 600, minX: -4, minY: -3,
  scaleX: 100, scaleY: 100, unitX: 1, unitY: 1,
};

test('ızgara yalnız görünür çizgileri üretir ve negatif koordinatları doğru adlandırır', () => {
  const plan = createGridPlan(viewport);

  expect(plan.majorStepX).toBe(1);
  expect(plan.majorStepY).toBe(1);
  expect(plan.axisLines).toEqual([
    { x1: 400, y1: 0, x2: 400, y2: 600 },
    { x1: 0, y1: 300, x2: 800, y2: 300 },
  ]);
  expect(plan.labels).toContainEqual({ axis: 'x', x: 200, y: 316, text: '-2' });
  expect(plan.labels).toContainEqual({ axis: 'y', x: 407, y: 95, text: '2' });
  expect(plan.labels).toContainEqual({ axis: 'y', x: 407, y: 495, text: '-2' });
  expect(plan.labels.filter(label => label.text === '0')).toHaveLength(1);
  for (const line of [...plan.minorLines, ...plan.majorLines, ...plan.axisLines]) {
    expect(line.x1).toBeGreaterThanOrEqual(0);
    expect(line.x2).toBeLessThanOrEqual(viewport.width);
    expect(line.y1).toBeGreaterThanOrEqual(0);
    expect(line.y2).toBeLessThanOrEqual(viewport.height);
  }
});

test('eksen aralıkları e ve π seçildiğinde sembolik x, gerçek y değerleri gösterilir', () => {
  for (const [unitY, symbol] of [[Math.PI, 'π'], [Math.E, 'e']] as const) {
    const plan = createGridPlan({ ...viewport, unitX: 2, unitY });
    expect(plan.labels.filter(label => label.axis === 'x').map(label => label.text))
      .toEqual([`-4${symbol}`, `-3${symbol}`, `-2${symbol}`, `-${symbol}`, '0', symbol, `2${symbol}`, `3${symbol}`, `4${symbol}`]);
    expect(plan.labels).toContainEqual({ axis: 'y', x: 407, y: 95, text: '4' });
  }
});

test('yakınlaştırma okunabilir aralık seçer, pan sonrasında etiketler görünür alanda kalır', () => {
  const zoomed = createGridPlan({ ...viewport, scaleX: 1_000, scaleY: 1_000 });
  expect(zoomed.majorStepX).toBe(0.1);
  expect(zoomed.majorStepY).toBe(0.1);
  expect(zoomed.labels.filter(label => label.axis === 'x').map(label => label.text))
    .toContain('-3.9');
  expect(zoomed.labels.every(label => label.text.length < 12)).toBe(true);

  const panned = createGridPlan({ ...viewport, minX: 20, minY: 10 });
  expect(panned.axisLines).toHaveLength(0);
  expect(panned.labels.length).toBeGreaterThan(0);
  expect(panned.labels.every(label => label.x >= 0 && label.x <= viewport.width
    && label.y >= 0 && label.y <= viewport.height)).toBe(true);

  const distant = createGridPlan({ ...viewport, minX: 100_000_000 });
  const distantLabels = distant.labels.filter(label => label.axis === 'x').map(label => label.text);
  expect(distantLabels).toContain('100000001');
  expect(new Set(distantLabels).size).toBe(distantLabels.length);
  expect(createGridPlan({ ...viewport, width: 10, height: 10 }).labels).toHaveLength(0);
});

test('aşırı uzaklaştırma, büyük pan ve geçersiz boyutlarda iş miktarı sınırlı kalır', () => {
  const unusualViews = [
    { scaleX: 1e-100, scaleY: 1e-100 },
    { scaleX: 1e100, scaleY: 1e100, minX: 0, minY: 0 },
    { width: 1e12, height: 1e12 },
    { minX: 1e100, minY: -1e100 },
    { width: 1e308, height: 1e308, scaleX: 1e-100, scaleY: 1e-100 },
  ];
  for (const unusual of unusualViews) {
    const plan = createGridPlan({ ...viewport, ...unusual });
    const lines = [...plan.minorLines, ...plan.majorLines, ...plan.axisLines];
    expect(lines.length).toBeLessThanOrEqual(1_006);
    expect(plan.labels.length).toBeLessThanOrEqual(202);
    expect(lines.every(line => Object.values(line).every(Number.isFinite))).toBe(true);
    expect(plan.labels.every(label => Number.isFinite(label.x) && Number.isFinite(label.y)
      && !/NaN|Infinity/.test(label.text))).toBe(true);
  }
  for (const invalid of [{ width: 0 }, { height: 0 }, { scaleY: 0 }, { minY: NaN }, { unitX: Infinity }]) {
    const plan = createGridPlan({ ...viewport, ...invalid });
    expect([...plan.minorLines, ...plan.majorLines, ...plan.axisLines, ...plan.labels]).toHaveLength(0);
  }
});
