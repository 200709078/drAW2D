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

/** A defined sample: mathematical x and its screen position. */
interface Sample extends PlotPoint {
  mathX: number
}

/** Largest allowed distance, in pixels, between the drawn polyline and the curve. */
const TOLERANCE_PX = 0.5
/** Below this horizontal width a segment that is still not straight is tested for a jump. */
const MIN_REFINE_WIDTH_PX = 1 / 1024
/** A break narrower than float resolution that still spans more than this is a jump, not a steep curve. */
const JUMP_PX = 1
/** Extra evaluations per screen pixel; bounds the cost of pathological curves such as sin(1/x). */
const EXTRA_SAMPLES_PER_PIXEL = 8
const MAX_BISECTION_STEPS = 64
/** Open domain ends are approached to this fraction of a pixel instead of being evaluated. */
const OPEN_END_OFFSET_PX = 1e-9

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

/** Pixel differences below this are float noise for values of the given size. */
function resolution(a: number, b: number, c = 0): number {
  return Math.max(1, Math.abs(a), Math.abs(b), Math.abs(c)) * 64 * Number.EPSILON
}

/**
 * Vertical distance of `middle` from the chord a–b beyond float resolution; samples
 * need not be evenly spaced.
 */
function deviation(a: PlotPoint, middle: PlotPoint, b: PlotPoint): number {
  const ratio = b.x === a.x ? 0.5 : (middle.x - a.x) / (b.x - a.x)
  // Scale before subtracting so huge off-screen values cannot overflow to Infinity - Infinity.
  const magnitude = Math.max(1, Math.abs(a.y), Math.abs(middle.y), Math.abs(b.y))
  const distance = Math.abs(middle.y / magnitude - (a.y / magnitude + (b.y / magnitude - a.y / magnitude) * ratio)) * magnitude
  return Math.max(0, distance - resolution(a.y, middle.y, b.y))
}

/**
 * Draw y = f(x) over the visible part of its domain.
 *
 * One sample per screen pixel is taken first. Where three neighbouring samples are not
 * collinear within half a pixel, or a sample is undefined, the interval is subdivided
 * adaptively. Domain boundaries are located to float precision, so sqrt(x) starts at the
 * origin; a boundary that the function approaches without converging (log, 1/x) is an
 * asymptote and the branch is extended to the screen edge. A break that remains at
 * float resolution is a pole or jump: its sides are never connected.
 */
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

  // Open ends of an explicit domain are approached, never evaluated.
  const unitsPerPixel = 1 / transform.pixelsPerUnitX
  const openStart = options.startInclusive === false && lower === options.startX
  const openEnd = options.endInclusive === false && upper === options.endX
  const inward = (x: number) => Math.max(Math.abs(x) * 4 * Number.EPSILON, unitsPerPixel * OPEN_END_OFFSET_PX)
  const minimumX = openStart ? lower + inward(lower) : lower
  const maximumX = openEnd ? upper - inward(upper) : upper
  if (minimumX > maximumX) return

  let budget = Math.ceil((lastPixel - firstPixel + 1) * EXTRA_SAMPLES_PER_PIXEL)

  function evaluateAt(mathX: number): Sample | null {
    if (!(mathX >= minimumX && mathX <= maximumX)) return null
    const value = evaluator.evaluate(expression, mathX)
    if (value === null) return null
    const y = transform.yToPixel(value)
    return Number.isFinite(y) ? { x: transform.xToPixel(mathX), y, mathX } : null
  }

  function extraSample(mathX: number): Sample | null {
    budget--
    return evaluateAt(mathX)
  }

  // --- Path output ------------------------------------------------------------------
  let pen: PlotPoint | null = null
  function line(a: PlotPoint, b: PlotPoint): void {
    const segment = clipSegment(a, b, height)
    if (segment === null) {
      pen = null
      return
    }
    const [start, end] = segment
    if (pen === null || pen.x !== start.x || pen.y !== start.y) ctx.moveTo(start.x, start.y)
    ctx.lineTo(end.x, end.y)
    pen = end
  }
  function breakPath(): void { pen = null }

  // --- Boundaries, asymptotes and jumps ----------------------------------------------
  /** Last defined sample between a defined sample and an undefined position. */
  function boundary(defined: Sample, undefinedX: number): Sample {
    let inside = defined
    let outside = undefinedX
    for (let step = 0; step < MAX_BISECTION_STEPS && budget > 0; step++) {
      const middle = inside.mathX + (outside - inside.mathX) / 2
      if (middle === inside.mathX || middle === outside) break
      const sample = extraSample(middle)
      if (sample) inside = sample
      else outside = middle
    }
    return inside
  }

  /**
   * Where a branch ends at `end` coming from `from`: if the values keep growing as the
   * break is approached, return a point beyond the screen edge in that direction.
   */
  function asymptoteExtension(end: Sample, from: Sample): PlotPoint | null {
    const distance = end.mathX - from.mathX
    if (distance === 0 || budget <= 0) return null
    const values: number[] = []
    for (const exponent of [8, 16, 24, 32]) {
      const sample = extraSample(end.mathX - distance * 2 ** -exponent)
      if (!sample) return null
      values.push(sample.y)
    }
    const steps = values.slice(1).map((value, index) => value - values[index]!)
    const direction = Math.sign(steps[0]!)
    if (direction === 0 || steps.some(step => Math.sign(step) !== direction)) return null
    // Converging limits shrink these steps geometrically; logarithms keep them, poles grow them.
    for (let index = 1; index < steps.length; index++) {
      if (Math.abs(steps[index]!) < Math.abs(steps[index - 1]!) / 2) return null
    }
    return { x: end.x, y: direction > 0 ? Math.max(end.y, height) + height : Math.min(end.y, 0) - height }
  }

  /** Finish a branch at its last defined sample, extending it along an asymptote. */
  function endBranch(end: Sample, from: Sample): void {
    const extension = asymptoteExtension(end, from)
    if (extension) line(end, extension)
    breakPath()
  }

  /** Start a branch at its first defined sample, coming from an asymptote. */
  function startBranch(start: Sample, toward: Sample): void {
    breakPath()
    const extension = asymptoteExtension(start, toward)
    if (extension) line(extension, start)
  }

  /** a and b are defined, their midpoint is not: draw both sides up to the gap. */
  function splitAtGap(a: Sample, b: Sample, gapX: number, depth: number): void {
    const left = boundary(a, gapX)
    const right = boundary(b, gapX)
    refine(a, left, depth + 1)
    endBranch(left, a)
    startBranch(right, b)
    refine(right, b, depth + 1)
  }

  /** A sub-pixel interval that is still not straight: either a steep curve or a jump. */
  function resolveBreak(a: Sample, b: Sample, depth: number): void {
    let left = a
    let right = b
    for (let step = 0; step < MAX_BISECTION_STEPS && budget > 0; step++) {
      const middleX = left.mathX + (right.mathX - left.mathX) / 2
      if (middleX === left.mathX || middleX === right.mathX) break
      const middle = extraSample(middleX)
      if (!middle) {
        splitAtGap(a, b, middleX, depth)
        return
      }
      // Follow the half that holds the larger part of the change.
      if (Math.abs(middle.y - left.y) >= Math.abs(right.y - middle.y)) right = middle
      else left = middle
    }
    if (Math.abs(right.y - left.y) <= JUMP_PX + resolution(left.y, right.y)) {
      line(a, b)
      return
    }
    line(a, left)
    endBranch(left, a)
    startBranch(right, b)
    line(right, b)
  }

  const offScreenTogether = (a: PlotPoint, b: PlotPoint) => (a.y < 0 && b.y < 0) || (a.y > height && b.y > height)

  function refine(a: Sample, b: Sample, depth: number): void {
    if (a.mathX === b.mathX) {
      line(a, b)
      return
    }
    // Each pixel interval gets its midpoint even when the budget is spent, so gaps and
    // poles are never bridged blindly; deeper refinement needs budget.
    if (budget <= 0 && depth > 0) {
      if (Math.abs(b.y - a.y) <= height) line(a, b)
      else breakPath()
      return
    }
    const middleX = a.mathX + (b.mathX - a.mathX) / 2
    const middle = extraSample(middleX)
    if (!middle) {
      if (budget > 0) splitAtGap(a, b, middleX, depth)
      else breakPath()
      return
    }
    if (budget <= 0) {
      if (Math.abs(b.y - a.y) <= height && deviation(a, middle, b) <= height / 2) {
        line(a, middle)
        line(middle, b)
      } else {
        breakPath()
      }
      return
    }
    // Nothing is visible while all three samples are beyond the same edge.
    if (offScreenTogether(a, middle) && offScreenTogether(middle, b)) {
      line(a, b)
      return
    }
    if (deviation(a, middle, b) <= TOLERANCE_PX) {
      line(a, b)
      return
    }
    if (b.x - a.x <= MIN_REFINE_WIDTH_PX) {
      resolveBreak(a, b, depth)
      return
    }
    refine(a, middle, depth + 1)
    refine(middle, b, depth + 1)
  }

  // --- Pixel samples ---------------------------------------------------------------
  const positions: number[] = [firstPixel]
  for (let pixel = Math.floor(firstPixel) + 1; pixel < lastPixel; pixel++) positions.push(pixel)
  if (lastPixel > firstPixel) positions.push(lastPixel)
  const xs = positions.map((pixel, index) => {
    if (index === 0) return minimumX
    if (index === positions.length - 1 && lastPixel > firstPixel) return maximumX
    return Math.min(maximumX, Math.max(minimumX, transform.pixelToX(pixel)))
  })

  ctx.save()
  try {
    ctx.beginPath()
    ctx.rect(0, 0, width, height)
    ctx.clip()
    ctx.beginPath()
    ctx.strokeStyle = color
    ctx.lineWidth = lineWidth
    ctx.setLineDash(options.dashed ? [2, 5] : [])

    const samples = xs.map(evaluateAt)
    // A sample whose neighbours are collinear with it within tolerance needs no subdivision.
    const curved = samples.map((current, index) => {
      const before = samples[index - 1]
      const after = samples[index + 1]
      if (before === undefined || after === undefined) return false
      if (!before || !current || !after) return true
      return deviation(before, current, after) > TOLERANCE_PX
    })

    for (let index = 0; index + 1 < samples.length; index++) {
      const a = samples[index]!
      const b = samples[index + 1]!
      if (a && b) {
        if (Math.abs(b.y - a.y) > height || curved[index] || curved[index + 1]) refine(a, b, 0)
        else line(a, b)
      } else if (a) {
        const end = boundary(a, xs[index + 1]!)
        refine(a, end, 0)
        endBranch(end, a)
      } else if (b) {
        const start = boundary(b, xs[index]!)
        startBranch(start, b)
        refine(start, b, 0)
      }
    }
    // A single defined sample, e.g. a one-point domain, has no neighbour to connect to.
    if (samples.length === 1 && samples[0]) line(samples[0], samples[0])
    ctx.stroke()
  } finally {
    ctx.restore()
  }
}
