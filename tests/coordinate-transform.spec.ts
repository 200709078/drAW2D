import { expect, test } from '@playwright/test';
import { createCoordinateTransform } from '../src/rendering/coordinate-transform';
import type { Viewport } from '../src/rendering/coordinate-transform';

const viewport: Viewport = {
  width: 800, height: 600, minX: -4, minY: -3,
  scaleX: 100, scaleY: 100, unitX: 1, unitY: 1,
};

test('matematik koordinatları ve CSS pikselleri her iki yönde yuvarlamadan dönüşür', () => {
  const views: Viewport[] = [
    viewport,
    { ...viewport, minX: 20.125, minY: -10.75 },
    { ...viewport, minX: -2.25, minY: 0.875, scaleX: 137.5, scaleY: 42.25, unitX: 0.2, unitY: 5 },
    { ...viewport, minX: -7.2, minY: 4.4, scaleX: 66.6, scaleY: 111.1, unitX: Math.E, unitY: Math.PI },
  ];
  for (const view of views) {
    const transform = createCoordinateTransform(view);
    for (const value of [-13.375, -Math.PI, -0.000123456789, 0, 0.000123456789, Math.E, 17.625]) {
      expect(transform.pixelToX(transform.xToPixel(value))).toBeCloseTo(value, 10);
      expect(transform.pixelToY(transform.yToPixel(value))).toBeCloseTo(value, 10);
      expect(transform.xToPixel(value)).toBeCloseTo((value / view.unitY - view.minX) * view.scaleY, 10);
      expect(transform.yToPixel(value)).toBeCloseTo((-value / view.unitX - view.minY) * view.scaleX, 10);
    }
    for (const pixel of [-250.125, 0, 0.123456789, 400.25, 937.875]) {
      expect(transform.xToPixel(transform.pixelToX(pixel))).toBeCloseTo(pixel, 10);
      expect(transform.yToPixel(transform.pixelToY(pixel))).toBeCloseTo(pixel, 10);
    }
  }
});

test('orijin, eksen yönleri, sınırlar ve yarıçap aynı dönüşümü kullanır', () => {
  const transform = createCoordinateTransform({
    ...viewport, scaleX: 120, scaleY: 80, unitX: 2, unitY: 4,
  });

  expect(transform.originX).toBe(320);
  expect(transform.originY).toBe(360);
  expect(transform.pixelsPerUnitX).toBe(20);
  expect(transform.pixelsPerUnitY).toBe(60);
  expect(transform.xToPixel(0)).toBe(transform.originX);
  expect(transform.yToPixel(0)).toBe(transform.originY);
  expect(transform.xToPixel(1)).toBeGreaterThan(transform.xToPixel(0));
  expect(transform.yToPixel(1)).toBeLessThan(transform.yToPixel(0));
  expect(transform.bounds).toEqual({ left: -16, right: 24, top: 6, bottom: -4 });
  expect(transform.pixelToX(0)).toBe(transform.bounds.left);
  expect(transform.pixelToX(viewport.width)).toBe(transform.bounds.right);
  expect(transform.pixelToY(0)).toBe(transform.bounds.top);
  expect(transform.pixelToY(viewport.height)).toBe(transform.bounds.bottom);
  expect(transform.radiusToPixels(2.5)).toEqual({ x: 50, y: 150 });
  expect(transform.radiusToPixels(-2.5)).toEqual({ x: 50, y: 150 });
  expect(transform.radiusToPixels(0)).toEqual({ x: 0, y: 0 });
});

test('dönüşüm kurulduktan sonra kaynak görünüm değişse de tutarlı bir anlık görüntü kalır', () => {
  const source = { ...viewport };
  const transform = createCoordinateTransform(source);
  source.minX = 100;
  source.scaleX = 1;
  source.unitY = Math.PI;

  expect(transform.xToPixel(2)).toBe(600);
  expect(transform.yToPixel(2)).toBe(100);
  expect(transform.pixelToX(600)).toBe(2);
  expect(transform.pixelToY(100)).toBe(2);
});

test('geçersiz veya temsil edilemeyen görünümler açıkça reddedilir', () => {
  const invalidViews: Partial<Viewport>[] = [
    { width: 0 }, { width: -1 }, { height: 0 }, { height: Infinity },
    { minX: NaN }, { minY: Infinity },
    { scaleX: 0 }, { scaleY: -1 }, { scaleX: NaN }, { scaleY: Infinity },
    { unitX: 0 }, { unitY: -1 }, { unitX: NaN }, { unitY: Infinity },
    { minX: 1e308, scaleY: 100 },
    { minY: -1e308, scaleX: 100 },
    { scaleY: 1e308, unitY: 1e-308 },
    { scaleX: 1e-308, unitX: 1e308 },
    { scaleX: Number.MIN_VALUE, unitX: 1 },
    { width: 1e308, scaleY: 1e-308 },
  ];
  for (const invalid of invalidViews) {
    expect(() => createCoordinateTransform({ ...viewport, ...invalid })).toThrow(RangeError);
  }
});
