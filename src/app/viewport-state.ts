import { createCoordinateTransform, type CoordinateTransform, type Viewport } from '../rendering/coordinate-transform'

// Grid steps along each axis; x also offers e and π for trigonometric and exponential graphs.
export const HORIZONTAL_UNITS = [1 / 10, 1 / 5, 1 / 2, 1, 2, Math.E, Math.PI, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000] as const
export const VERTICAL_UNITS = [1 / 10, 1 / 5, 1 / 2, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000] as const

const ZOOM_IN = 1.05
const ZOOM_OUT = 0.95
export const AXIS_DRAG_STEP = 35
/** Continuous zoom keeps pixels per mathematical unit within this range on both axes. */
const MIN_PIXELS_PER_UNIT = 1e-3
const MAX_PIXELS_PER_UNIT = 1e7

export interface ViewSnapshot {
  scaleX: number
  scaleY: number
  minX: number
  minY: number
  tickX: number
  tickY: number
}

export type ViewAxis = 'xAxis' | 'yAxis'

export interface PixelPoint {
  x: number
  y: number
}

interface Pinch {
  view: ViewSnapshot
  /** Mathematical point under the starting midpoint of the two pointers. */
  anchor: { x: number; y: number }
  distance: number
}

interface AxisDrag {
  axis: ViewAxis
  start: PixelPoint
  anchor: number
  view: ViewSnapshot
}

/**
 * Pan/zoom state of the drawing plane. As in the grid module, `scaleX`/`unitX` belong to
 * the vertical direction and `scaleY`/`unitY` to the horizontal one.
 */
export class ViewportState {
  private view: ViewSnapshot = { scaleX: 100, scaleY: 100, minX: -5, minY: -5, tickX: 3, tickY: 3 }
  private standard: ViewSnapshot = { ...this.view }
  private cachedKey = ''
  private cachedTransform: CoordinateTransform | null = null
  private axisDrag: AxisDrag | null = null
  private panStart: { pixel: PixelPoint; minX: number; minY: number } | null = null
  private pinchStart: Pinch | null = null

  get snapshot(): Readonly<ViewSnapshot> { return this.view }
  get unitX(): number { return VERTICAL_UNITS[this.view.tickX]! }
  get unitY(): number { return HORIZONTAL_UNITS[this.view.tickY]! }
  get isDragging(): boolean { return this.axisDrag !== null || this.panStart !== null }
  get isPinching(): boolean { return this.pinchStart !== null }
  get draggedAxis(): ViewAxis | null { return this.axisDrag?.axis ?? null }

  viewport(width: number, height: number): Viewport {
    const { minX, minY, scaleX, scaleY } = this.view
    return { width, height, minX, minY, scaleX, scaleY, unitX: this.unitX, unitY: this.unitY }
  }

  /** Reuse one transform until the surface size or the view changes. */
  transform(width: number, height: number): CoordinateTransform {
    const view = this.viewport(width, height)
    const key = Object.values(view).join(',')
    if (key !== this.cachedKey || !this.cachedTransform) {
      this.cachedTransform = createCoordinateTransform(view)
      this.cachedKey = key
    }
    return this.cachedTransform
  }

  saveStandard(): void { this.standard = { ...this.view } }

  resetStandard(): void {
    this.view = { ...this.standard }
    this.endDrag()
  }

  setOrigin(minX: number, minY: number): void {
    this.view = { ...this.view, minX, minY }
  }

  /** One wheel step. The mathematical point under the cursor stays under the cursor. */
  zoom(zoomIn: boolean, anchor: PixelPoint, transform: CoordinateTransform): boolean {
    const x = transform.pixelToX(anchor.x)
    const y = transform.pixelToY(anchor.y)
    const next = { ...this.view }
    const step = zoomIn ? -1 : 1
    let changed = false
    if (HORIZONTAL_UNITS[next.tickY + step] !== undefined) {
      next.tickY += step
      next.scaleY *= zoomIn ? ZOOM_IN : ZOOM_OUT
      changed = true
    }
    if (VERTICAL_UNITS[next.tickX + step] !== undefined) {
      next.tickX += step
      next.scaleX *= zoomIn ? ZOOM_IN : ZOOM_OUT
      changed = true
    }
    if (!changed) return false
    this.view = this.anchored(next, { x, y }, anchor)
    return true
  }

  /**
   * Scale by an arbitrary factor (trackpad or touch pinch) around a pixel. The grid unit
   * stays the same; the grid chooses readable intervals from the resulting pixel density.
   */
  zoomBy(factor: number, anchor: PixelPoint, transform: CoordinateTransform): boolean {
    const scaled = this.scaled(this.view, factor)
    if (!scaled) return false
    this.view = this.anchored(scaled, { x: transform.pixelToX(anchor.x), y: transform.pixelToY(anchor.y) }, anchor)
    return true
  }

  /** Two pointers: the point under their midpoint follows the midpoint, their distance sets the scale. */
  beginPinch(first: PixelPoint, second: PixelPoint, transform: CoordinateTransform): void {
    this.endDrag()
    const middle = midpoint(first, second)
    this.pinchStart = {
      view: { ...this.view },
      anchor: { x: transform.pixelToX(middle.x), y: transform.pixelToY(middle.y) },
      distance: Math.max(1, Math.hypot(second.x - first.x, second.y - first.y)),
    }
  }

  pinch(first: PixelPoint, second: PixelPoint): boolean {
    const start = this.pinchStart
    if (!start) return false
    const factor = Math.hypot(second.x - first.x, second.y - first.y) / start.distance
    const scaled = this.scaled(start.view, factor) ?? this.view
    this.view = this.anchored(scaled, start.anchor, midpoint(first, second))
    return true
  }

  endPinch(): void {
    this.pinchStart = null
  }

  beginPan(pixel: PixelPoint): void {
    this.panStart = { pixel, minX: this.view.minX, minY: this.view.minY }
  }

  beginAxisDrag(axis: ViewAxis, pixel: PixelPoint, transform: CoordinateTransform): void {
    this.axisDrag = {
      axis,
      start: pixel,
      anchor: axis === 'xAxis' ? transform.pixelToX(pixel.x) : transform.pixelToY(pixel.y),
      view: { ...this.view },
    }
  }

  /** Continue the active pan or axis drag; returns false when none is active. */
  drag(pixel: PixelPoint): boolean {
    if (this.panStart) {
      const { pixel: start, minX, minY } = this.panStart
      this.setOrigin(minX - (pixel.x - start.x) / this.view.scaleY, minY - (pixel.y - start.y) / this.view.scaleX)
      return true
    }
    const drag = this.axisDrag
    if (!drag) return false
    const next = { ...this.view }
    if (drag.axis === 'xAxis') {
      // Dragging right compresses the x axis by one grid step every AXIS_DRAG_STEP pixels.
      const tick = clampTick(drag.view.tickY + Math.trunc((pixel.x - drag.start.x) / AXIS_DRAG_STEP), HORIZONTAL_UNITS.length)
      next.tickY = tick
      next.scaleY = drag.view.scaleY * stepFactor(tick - drag.view.tickY)
      next.minX = drag.anchor / HORIZONTAL_UNITS[tick]! - drag.start.x / next.scaleY
    } else {
      const tick = clampTick(drag.view.tickX + Math.trunc((drag.start.y - pixel.y) / AXIS_DRAG_STEP), VERTICAL_UNITS.length)
      next.tickX = tick
      next.scaleX = drag.view.scaleX * stepFactor(tick - drag.view.tickX)
      next.minY = -drag.start.y / next.scaleX - drag.anchor / VERTICAL_UNITS[tick]!
    }
    this.view = next
    return true
  }

  endDrag(): void {
    this.axisDrag = null
    this.panStart = null
    this.pinchStart = null
  }

  /** The view scaled by `factor`, or null when that would leave the representable range. */
  private scaled(view: ViewSnapshot, factor: number): ViewSnapshot | null {
    if (!Number.isFinite(factor) || factor <= 0) return null
    const next = { ...view, scaleX: view.scaleX * factor, scaleY: view.scaleY * factor }
    const densities = [next.scaleY / HORIZONTAL_UNITS[next.tickY]!, next.scaleX / VERTICAL_UNITS[next.tickX]!]
    return densities.every(density => density >= MIN_PIXELS_PER_UNIT && density <= MAX_PIXELS_PER_UNIT) ? next : null
  }

  private anchored(next: ViewSnapshot, point: { x: number; y: number }, pixel: PixelPoint): ViewSnapshot {
    const unitY = HORIZONTAL_UNITS[next.tickY]!
    const unitX = VERTICAL_UNITS[next.tickX]!
    return {
      ...next,
      minX: point.x / unitY - pixel.x / next.scaleY,
      minY: -pixel.y / next.scaleX - point.y / unitX,
    }
  }
}

function midpoint(first: PixelPoint, second: PixelPoint): PixelPoint {
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 }
}

function clampTick(tick: number, length: number): number {
  return Math.max(0, Math.min(length - 1, tick))
}

function stepFactor(delta: number): number {
  return delta >= 0 ? ZOOM_OUT ** delta : ZOOM_IN ** -delta
}
