/** The viewport and all pointer positions use CSS pixels, independently of display DPR. */
export interface Viewport {
  width: number;
  height: number;
  minX: number;
  minY: number;
  scaleX: number;
  scaleY: number;
  unitX: number;
  unitY: number;
}

export interface CoordinateBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface CoordinateTransform {
  readonly originX: number;
  readonly originY: number;
  readonly pixelsPerUnitX: number;
  readonly pixelsPerUnitY: number;
  readonly bounds: Readonly<CoordinateBounds>;
  xToPixel(x: number): number;
  yToPixel(y: number): number;
  pixelToX(px: number): number;
  pixelToY(py: number): number;
  radiusToPixels(radius: number): { x: number; y: number };
}

/** Precompute one affine transform for a viewport, shared by drawing and input tools. */
export function createCoordinateTransform(view: Viewport): CoordinateTransform {
  if (!Number.isFinite(view.width) || view.width <= 0
    || !Number.isFinite(view.height) || view.height <= 0
    || !Number.isFinite(view.minX) || !Number.isFinite(view.minY)
    || !Number.isFinite(view.scaleX) || view.scaleX <= 0
    || !Number.isFinite(view.scaleY) || view.scaleY <= 0
    || !Number.isFinite(view.unitX) || view.unitX <= 0
    || !Number.isFinite(view.unitY) || view.unitY <= 0) {
    throw new RangeError('Koordinat görünümü sonlu değerler ve pozitif boyut, ölçek ve birimler gerektirir.');
  }

  // The legacy scale/unit axis names refer to grid rows and columns, respectively.
  const originX = -view.minX * view.scaleY;
  const originY = -view.minY * view.scaleX;
  const pixelsPerUnitX = view.scaleY / view.unitY;
  const pixelsPerUnitY = view.scaleX / view.unitX;
  const unitsPerPixelX = 1 / pixelsPerUnitX;
  const unitsPerPixelY = 1 / pixelsPerUnitY;
  if (!Number.isFinite(originX) || !Number.isFinite(originY)
    || !Number.isFinite(pixelsPerUnitX) || pixelsPerUnitX <= 0
    || !Number.isFinite(pixelsPerUnitY) || pixelsPerUnitY <= 0
    || !Number.isFinite(unitsPerPixelX) || unitsPerPixelX <= 0
    || !Number.isFinite(unitsPerPixelY) || unitsPerPixelY <= 0) {
    throw new RangeError('Koordinat dönüşümü sayısal temsil aralığını aşıyor.');
  }

  const bounds: CoordinateBounds = {
    left: -originX * unitsPerPixelX,
    right: (view.width - originX) * unitsPerPixelX,
    top: originY * unitsPerPixelY,
    bottom: (originY - view.height) * unitsPerPixelY,
  };
  if (!Object.values(bounds).every(Number.isFinite)) {
    throw new RangeError('Görünür matematik alanı sayısal temsil aralığını aşıyor.');
  }

  return {
    originX,
    originY,
    pixelsPerUnitX,
    pixelsPerUnitY,
    bounds,
    xToPixel: x => originX + x * pixelsPerUnitX,
    yToPixel: y => originY - y * pixelsPerUnitY,
    pixelToX: px => (px - originX) * unitsPerPixelX,
    pixelToY: py => (originY - py) * unitsPerPixelY,
    radiusToPixels: radius => ({
      x: Math.abs(radius * pixelsPerUnitX),
      y: Math.abs(radius * pixelsPerUnitY),
    }),
  };
}
