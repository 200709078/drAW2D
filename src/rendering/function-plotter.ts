import type { createCoordinateTransform } from './coordinate-transform'
import type { FunctionEvaluator } from './function-evaluator'

export interface FunctionPlotOptions {
  expression: string
  transform: ReturnType<typeof createCoordinateTransform>
  width: number
  height: number
  color: string
  lineWidth: number
  startX?: number | null
  endX?: number | null
  startInclusive?: boolean
  endInclusive?: boolean
  dashed?: boolean
}

type PlotContext = Pick<CanvasRenderingContext2D,
  'save' | 'restore' | 'beginPath' | 'rect' | 'clip' | 'stroke'
  | 'moveTo' | 'lineTo' | 'setLineDash' | 'strokeStyle' | 'lineWidth'>

interface PlotPoint {
  x: number
  y: number
}

/** Clip vertical excursions before passing coordinates to Canvas, even at 1e308. */
function clipSegment(a: PlotPoint, b: PlotPoint, height: number): [PlotPoint, PlotPoint] | null {
  if ((a.y < 0 && b.y < 0) || (a.y > height && b.y > height)) return null

  function intersection(boundary: number): PlotPoint {
    // Dividing first avoids overflow in b.y - a.y and cancellation in a.y + t * dy.
    const magnitude = Math.max(1, Math.abs(a.y), Math.abs(b.y), Math.abs(boundary))
    const t = (boundary / magnitude - a.y / magnitude) / (b.y / magnitude - a.y / magnitude)
    return { x: a.x + (b.x - a.x) * Math.min(1, Math.max(0, t)), y: boundary }
  }

  const start = a.y < 0 ? intersection(0) : a.y > height ? intersection(height) : a
  const end = b.y < 0 ? intersection(0) : b.y > height ? intersection(height) : b
  return [start, end]
}

/** Sample logical screen pixels; document objects and expression caches stay separate. */
export function drawFunctionPlot(ctx: PlotContext, options: FunctionPlotOptions, evaluator: FunctionEvaluator): void {
  const { expression, transform, width, height, color, lineWidth } = options
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0
    || !Number.isFinite(lineWidth) || lineWidth <= 0) return

  const lower = Math.max(transform.bounds.left, options.startX ?? transform.bounds.left)
  const upper = Math.min(transform.bounds.right, options.endX ?? transform.bounds.right)
  if (!Number.isFinite(lower) || !Number.isFinite(upper) || lower > upper) return
  const firstPixel = Math.max(0, transform.xToPixel(lower))
  const lastPixel = Math.min(width, transform.xToPixel(upper))
  if (!Number.isFinite(firstPixel) || !Number.isFinite(lastPixel) || firstPixel > lastPixel) return

  function pointAt(pixel: number): PlotPoint | null {
    if (options.startInclusive === false && lower === options.startX && pixel === firstPixel) return null
    if (options.endInclusive === false && upper === options.endX && pixel === lastPixel) return null
    const x = Math.min(upper, Math.max(lower, transform.pixelToX(pixel)))
    const value = evaluator.evaluate(expression, x)
    if (value === null) return null
    const y = transform.yToPixel(value)
    return Number.isFinite(y) ? { x: pixel, y } : null
  }

  function discontinuous(a: PlotPoint, b: PlotPoint): boolean {
    if (Math.abs(b.y - a.y) <= height
      || !((a.y < 0 && b.y > height) || (b.y < 0 && a.y > height))) return false
    // One extra sample only for suspicious cross-screen jumps preserves steep lines
    // while avoiding a straight connection between opposite branches of an asymptote.
    const midpoint = pointAt(a.x + (b.x - a.x) / 2)
    return midpoint === null || Math.abs(midpoint.y - (a.y / 2 + b.y / 2)) > height / 2
  }

  let previous: PlotPoint | null = null
  let pen: PlotPoint | null = null
  function sample(pixel: number): void {
    const point = pointAt(pixel)
    if (point === null) {
      previous = pen = null
      return
    }
    const segment = previous === null || discontinuous(previous, point)
      ? null : clipSegment(previous, point, height)
    if (segment === null) {
      pen = null
    } else {
      const [start, end] = segment
      if (pen === null || pen.x !== start.x || pen.y !== start.y) ctx.moveTo(start.x, start.y)
      ctx.lineTo(end.x, end.y)
      pen = end
    }
    previous = point
  }

  ctx.save()
  try {
    ctx.beginPath()
    ctx.rect(0, 0, width, height)
    ctx.clip()
    ctx.beginPath()
    ctx.strokeStyle = color
    ctx.lineWidth = lineWidth
    ctx.setLineDash(options.dashed ? [2, 5] : [])
    sample(firstPixel)
    for (let pixel = Math.floor(firstPixel) + 1; pixel < lastPixel; pixel++) sample(pixel)
    if (lastPixel > firstPixel) sample(lastPixel)
    ctx.stroke()
  } finally {
    ctx.restore()
  }
}
