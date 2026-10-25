import type { CoordinateTransform } from './coordinate-transform'

export interface PixelPoint {
  x: number
  y: number
}

export interface ParametricCurveSpec {
  x(t: number): number | null
  y(t: number): number | null
  start: number
  end: number
}

/** Uniform samples before refinement. */
const INITIAL_SAMPLES = 512
const MAX_DEPTH = 14
/** Largest allowed distance, in pixels, between the polyline and the curve. */
const TOLERANCE_PX = 0.5
/** Longer pieces are subdivided even when straight, so sharp turns between samples are found. */
const MAX_SEGMENT_PX = 12
const EVALUATION_BUDGET = 40_000
/** Beyond this the canvas cannot represent coordinates reliably; the path breaks. */
const LIMIT_PX = 1e6

interface Sample extends PixelPoint {
  t: number
}

/**
 * The curve (x(t), y(t)) as polylines in CSS pixels. Pieces are subdivided while they
 * bend more than half a pixel or are long; the path breaks where the curve is undefined
 * or jumps (a gap that stays wide at the finest subdivision).
 */
export function parametricPolylines(curve: ParametricCurveSpec, transform: CoordinateTransform, height: number): PixelPoint[][] {
  const { start, end } = curve
  if (!(end > start) || !Number.isFinite(start) || !Number.isFinite(end)) return []
  let budget = EVALUATION_BUDGET
  const at = (t: number): Sample | null => {
    budget--
    const a = curve.x(t)
    const b = curve.y(t)
    if (a === null || b === null) return null
    const x = transform.xToPixel(a)
    const y = transform.yToPixel(b)
    return Math.abs(x) < LIMIT_PX && Math.abs(y) < LIMIT_PX ? { x, y, t } : null
  }
  const lines: PixelPoint[][] = []
  let current: PixelPoint[] | null = null
  const emit = (point: PixelPoint) => {
    if (!current) {
      current = [point]
      lines.push(current)
    } else {
      const last = current[current.length - 1]!
      if (last.x !== point.x || last.y !== point.y) current.push(point)
    }
  }
  const breakPath = () => { current = null }

  function refine(a: Sample | null, b: Sample | null, ta: number, tb: number, depth: number): void {
    const tm = ta + (tb - ta) / 2
    if (depth >= MAX_DEPTH || budget <= 0 || tm === ta || tm === tb) {
      // At the finest level a wide gap is a jump, not a steep piece of curve.
      if (a && b && Math.hypot(b.x - a.x, b.y - a.y) <= Math.max(2, height / 8)) {
        emit(a)
        emit(b)
      } else {
        breakPath()
      }
      return
    }
    const m = at(tm)
    if (a && b && m) {
      const chord = Math.hypot(b.x - a.x, b.y - a.y)
      const deviation = chord === 0 ? Math.hypot(m.x - a.x, m.y - a.y)
        : Math.abs((b.x - a.x) * (a.y - m.y) - (a.x - m.x) * (b.y - a.y)) / chord
      if (deviation <= TOLERANCE_PX && chord <= MAX_SEGMENT_PX) {
        emit(a)
        emit(b)
        return
      }
    }
    if (!a && !b && !m) {
      breakPath()
      return
    }
    refine(a, m, ta, tm, depth + 1)
    refine(m, b, tm, tb, depth + 1)
  }

  let previous = at(start)
  for (let index = 1; index <= INITIAL_SAMPLES; index++) {
    const t = index === INITIAL_SAMPLES ? end : start + (end - start) * index / INITIAL_SAMPLES
    const next = at(t)
    refine(previous, next, start + (end - start) * (index - 1) / INITIAL_SAMPLES, t, 0)
    previous = next
  }
  return lines.filter(line => line.length > 1)
}

/** Shortest distance in pixels from a point to polylines; Infinity when there are none. */
export function distanceToPolylines(lines: readonly (readonly PixelPoint[])[], point: PixelPoint): number {
  let best = Infinity
  for (const line of lines) {
    for (let index = 0; index + 1 < line.length; index++) {
      const a = line[index]!
      const b = line[index + 1]!
      const dx = b.x - a.x
      const dy = b.y - a.y
      const length = dx * dx + dy * dy
      const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / length))
      best = Math.min(best, Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy)))
    }
  }
  return best
}
