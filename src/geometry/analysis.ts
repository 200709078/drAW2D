import { differentiate, realEvaluator } from '../math/function-algebra'
import type { FunctionSection, GeometryDocumentObject } from './function-types'
import { getCircleDescriptor, getLineDescriptor, type NumericPoint } from './primitives'
import type { AnalysisKind } from './types'

/** One formula of a graph and the interval where it applies. */
interface GraphPiece {
  expression: string
  low: number | null
  high: number | null
  lowInclusive: boolean
  highInclusive: boolean
}

/** A real function of x on [low, high]; `expression` is set when it has a single formula. */
export interface GraphCurve {
  kind: 'graph'
  evaluate(x: number): number | null
  low: number
  high: number
  expression: string | null
  /** The formulas of a piecewise function, first match wins; absent for a single formula. */
  pieces?: readonly GraphPiece[]
  key: string
}

export type Curve =
  | GraphCurve
  | { kind: 'vertical'; x: number; key: string }
  | { kind: 'circle'; m: number; n: number; r: number; key: string }

/** Analysis searches this many equal intervals before refining. */
const SAMPLES = 512
const MAX_POINTS = 50
const BISECTION_STEPS = 80
/** A sign change whose refined value is not near zero is a pole or a jump, not a root. */
const ROOT_TOLERANCE = 1e-7

function within(x: number, low: number | null, high: number | null, lowInclusive = true, highInclusive = true): boolean {
  return (low === null || (lowInclusive ? x >= low : x > low)) && (high === null || (highInclusive ? x <= high : x < high))
}

function graph(expression: string, low: number | null = null, high: number | null = null,
  lowInclusive = true, highInclusive = true): GraphCurve {
  const evaluate = realEvaluator(expression)
  return {
    kind: 'graph',
    evaluate: x => within(x, low, high, lowInclusive, highInclusive) ? evaluate(x) : null,
    low: low ?? -Infinity,
    high: high ?? Infinity,
    expression,
    key: `${expression}|${low}|${high}|${lowInclusive}|${highInclusive}`,
  }
}

/** The first piece whose interval contains x gives the value. */
function piecewiseEvaluator(pieces: readonly GraphPiece[]): (x: number) => number | null {
  const parts = pieces.map(piece => ({ piece, evaluate: realEvaluator(piece.expression) }))
  return x => {
    for (const { piece, evaluate } of parts) {
      if (within(x, piece.low, piece.high, piece.lowInclusive, piece.highInclusive)) return evaluate(x)
    }
    return null
  }
}

function sections(sectionsList: readonly FunctionSection[]): GraphCurve {
  const parts = sectionsList.map(section => ({ section, curve: graph(section.func, section.startX, section.endX,
    section.startInclusive !== false, section.endInclusive !== false) }))
  return {
    pieces: sectionsList.map(section => ({ expression: section.func, low: section.startX, high: section.endX,
      lowInclusive: section.startInclusive !== false, highInclusive: section.endInclusive !== false })),
    kind: 'graph',
    // The first section whose domain contains x defines the value.
    evaluate: x => {
      for (const { curve } of parts) {
        const value = curve.evaluate(x)
        if (value !== null) return value
      }
      return null
    },
    low: Math.min(...parts.map(part => part.curve.low)),
    high: Math.max(...parts.map(part => part.curve.high)),
    expression: null,
    key: parts.map(part => part.curve.key).join(';'),
  }
}

/** The curve an object draws, for analysis and hit testing; null for objects that are not curves. */
export function curveOf(object: GeometryDocumentObject): Curve | null {
  try {
    switch (object.type) {
      case 'function':
      case 'lineWithEquation':
        return graph(object.func, object.startX, object.endX, object.startInclusive !== false, object.endInclusive !== false)
      case 'functioncomposition':
      case 'limit':
        return graph(object.func)
      case 'tangent':
        return graph(object.tngLine.func)
      case 'derivative':
        return graph(object.derFunc.func)
      case 'sectionalFunctions':
        return sections(object.secFuncs)
      case 'verLine':
        return { kind: 'vertical', x: object.x, key: `x=${object.x}` }
      case 'lineWithPoints':
      case 'lineSegment': {
        const line = getLineDescriptor(object)
        if (!line.status) return null
        if (line.direction.a === 0) return { kind: 'vertical', x: line.origin.a, key: `x=${line.origin.a}` }
        const slope = line.direction.b / line.direction.a
        const intercept = line.origin.b - slope * line.origin.a
        const ends = line.limited
          ? [line.origin.a + line.min * line.direction.a, line.origin.a + line.max * line.direction.a].sort((p, q) => p - q)
          : [-Infinity, Infinity]
        return {
          kind: 'graph', evaluate: x => x >= ends[0]! && x <= ends[1]! ? slope * x + intercept : null,
          low: ends[0]!, high: ends[1]!, expression: `${slope} * x + ${intercept}`, key: `${slope}x+${intercept}|${ends}`,
        }
      }
      case 'circleR':
      case 'circle2':
      case 'circle3': {
        const circle = getCircleDescriptor(object)
        return circle.status ? { kind: 'circle', m: circle.m, n: circle.n, r: circle.r, key: `c${circle.m},${circle.n},${circle.r}` } : null
      }
      default:
        return null
    }
  } catch {
    return null
  }
}

/** Curves drawn as y = f(x): the only kind a root, an extremum or an integral applies to. */
export function isGraphObject(object: GeometryDocumentObject | null | undefined): boolean {
  return object !== null && object !== undefined && curveOf(object)?.kind === 'graph'
    && object.type !== 'lineWithPoints' && object.type !== 'lineSegment'
}

function bisect(f: (x: number) => number | null, low: number, high: number, fLow: number): number | null {
  let a = low
  let b = high
  let fa = fLow
  for (let step = 0; step < BISECTION_STEPS; step++) {
    const middle = a + (b - a) / 2
    if (middle === a || middle === b) break
    const value = f(middle)
    if (value === null) return null
    if (value === 0) return middle
    if (Math.sign(value) === Math.sign(fa)) {
      a = middle
      fa = value
    } else {
      b = middle
    }
  }
  return a + (b - a) / 2
}

/** Golden-section search for the smallest |f| in [low, high]. */
function minimumOfMagnitude(f: (x: number) => number | null, low: number, high: number): number {
  const ratio = (Math.sqrt(5) - 1) / 2
  let a = low
  let b = high
  for (let step = 0; step < 80; step++) {
    const c = b - ratio * (b - a)
    const d = a + ratio * (b - a)
    const fc = Math.abs(f(c) ?? Infinity)
    const fd = Math.abs(f(d) ?? Infinity)
    if (fc < fd) b = d
    else a = c
  }
  return (a + b) / 2
}

/**
 * Zeros of f in [start, end], ascending. Sign changes are refined by bisection; a sign
 * change across a pole or jump is rejected because the refined value is not near zero.
 * With `touching`, zeros where f does not change sign (double roots such as x² at 0) count too.
 */
export function zerosOf(f: (x: number) => number | null, start: number, end: number, touching = true): number[] {
  if (!(end > start) || !Number.isFinite(start) || !Number.isFinite(end)) return []
  const xs = Array.from({ length: SAMPLES + 1 }, (_, index) => start + (end - start) * index / SAMPLES)
  const ys = xs.map(f)
  const scale = Math.max(1, ...ys.map(value => (value === null ? 0 : Math.min(Math.abs(value), 1e12))))
  const zeros: number[] = []
  const add = (x: number) => {
    if (!zeros.some(other => Math.abs(other - x) <= (end - start) * 1e-9)) zeros.push(x)
  }
  for (let index = 0; index <= SAMPLES; index++) {
    const y = ys[index]
    if (y === null || y === undefined) continue
    if (y === 0) {
      add(xs[index]!)
      continue
    }
    const next = ys[index + 1]
    if (next !== null && next !== undefined && next !== 0 && Math.sign(next) !== Math.sign(y)) {
      const root = bisect(f, xs[index]!, xs[index + 1]!, y)
      const value = root === null ? null : f(root)
      if (root !== null && value !== null && Math.abs(value) <= ROOT_TOLERANCE * Math.max(1, Math.abs(y), Math.abs(next))) add(root)
    }
    const previous = ys[index - 1]
    if (touching && previous !== null && previous !== undefined && next !== null && next !== undefined
      && Math.abs(y) <= Math.abs(previous) && Math.abs(y) <= Math.abs(next)
      && Math.sign(previous) === Math.sign(y) && Math.sign(next) === Math.sign(y)) {
      const x = minimumOfMagnitude(f, xs[index - 1]!, xs[index + 1]!)
      const value = f(x)
      if (value !== null && Math.abs(value) <= 1e-9 * scale) add(x)
    }
  }
  return zeros.sort((p, q) => p - q).slice(0, MAX_POINTS)
}

const memo = new Map<string, NumericPoint[]>()

function remember(key: string, compute: () => NumericPoint[]): NumericPoint[] {
  const cached = memo.get(key)
  if (cached) return cached
  const points = compute()
  memo.set(key, points)
  if (memo.size > 256) memo.delete(memo.keys().next().value!)
  return points
}

function onGraph(curve: GraphCurve, xs: readonly number[]): NumericPoint[] {
  return xs.flatMap(x => {
    const y = curve.evaluate(x)
    return y === null ? [] : [{ a: x, b: y }]
  })
}

function derivativeOf(expression: string, order: number): string {
  let result = expression
  for (let step = 0; step < order; step++) result = differentiate(result)
  return result
}

/** f', f'' of a single formula or, piece by piece, of a piecewise function. */
function derivativeCurve(curve: GraphCurve, order: number): ((x: number) => number | null) | null {
  if (curve.pieces) return piecewiseEvaluator(curve.pieces.map(piece => ({ ...piece, expression: derivativeOf(piece.expression, order) })))
  if (curve.expression === null) return null
  const evaluate = realEvaluator(derivativeOf(curve.expression, order))
  return x => x >= curve.low && x <= curve.high ? evaluate(x) : null
}

/** f is defined around x and its values on both sides meet: no pole or jump there. */
function continuousAt(f: (x: number) => number | null, x: number): boolean {
  const center = f(x)
  if (center === null) return false
  const delta = Math.max(1, Math.abs(x)) * 1e-7
  const left = f(x - delta)
  const right = f(x + delta)
  if (left === null || right === null) return false
  const tolerance = 1e-4 * Math.max(1, Math.abs(center))
  return Math.abs(left - center) <= tolerance && Math.abs(right - center) <= tolerance
}

/**
 * Where g changes sign in [start, end] and f is continuous: the extrema (g = f') or
 * inflection points (g = f'') of f. A sign change where g jumps or is undefined, at a
 * corner such as |x| at 0, counts; one where f itself breaks does not.
 */
function signChanges(g: (x: number) => number | null, f: (x: number) => number | null, start: number, end: number): number[] {
  if (!(end > start) || !Number.isFinite(start) || !Number.isFinite(end)) return []
  const xs = Array.from({ length: SAMPLES + 1 }, (_, index) => start + (end - start) * index / SAMPLES)
  const ys = xs.map(g)
  const found: number[] = []
  const add = (x: number) => {
    if (!found.some(other => Math.abs(other - x) <= (end - start) * 1e-9)) found.push(x)
  }
  let previous: number | null = null
  for (let index = 0; index <= SAMPLES; index++) {
    const y = ys[index]!
    if (y === null) continue
    if (y === 0) {
      // A sampled zero: a sign change when the neighbours differ.
      const before = ys[index - 1]
      const after = ys[index + 1]
      if (before && after && Math.sign(before) !== Math.sign(after)
        && continuousAt(f, xs[index]!)) add(xs[index]!)
      continue
    }
    if (previous !== null && Math.sign(ys[previous]!) !== Math.sign(y) && index - previous <= 2) {
      // Undefined samples in between (a corner hit exactly) are skipped by the bisection.
      const x = bisectSign(g, xs[previous]!, xs[index]!, ys[previous]!)
      if (continuousAt(f, x)) add(x)
    }
    previous = index
  }
  return found.sort((p, q) => p - q).slice(0, MAX_POINTS)
}

/** Narrow a sign change of g to float precision; undefined values are stepped over. */
function bisectSign(g: (x: number) => number | null, low: number, high: number, gLow: number): number {
  let a = low
  let b = high
  for (let step = 0; step < BISECTION_STEPS; step++) {
    const middle = a + (b - a) / 2
    if (middle === a || middle === b) break
    let value = g(middle)
    if (value === null) value = g(middle + (b - a) * 1e-6)
    if (value === null) return middle
    if (value === 0) return middle
    if (Math.sign(value) === Math.sign(gLow)) a = middle
    else b = middle
  }
  return a + (b - a) / 2
}

function intersect(first: Curve, second: Curve, start: number, end: number): NumericPoint[] {
  if (first.kind !== 'graph') {
    if (second.kind === 'graph') return intersect(second, first, start, end)
    return []
  }
  const low = Math.max(start, first.low)
  const high = Math.min(end, first.high)
  if (second.kind === 'vertical') return second.x >= low && second.x <= high ? onGraph(first, [second.x]) : []
  if (second.kind === 'graph') {
    const lower = Math.max(low, second.low)
    const upper = Math.min(high, second.high)
    return onGraph(first, zerosOf(x => {
      const f = first.evaluate(x)
      const g = second.evaluate(x)
      return f === null || g === null ? null : f - g
    }, lower, upper))
  }
  // Circle: the graph meets the upper or the lower semicircle.
  const { m, n, r } = second
  const lower = Math.max(low, m - r)
  const upper = Math.min(high, m + r)
  const xs = [1, -1].flatMap(side => zerosOf(x => {
    const f = first.evaluate(x)
    const radicand = r * r - (x - m) * (x - m)
    return f === null || radicand < 0 ? null : f - (n + side * Math.sqrt(radicand))
  }, lower, upper))
  return onGraph(first, [...new Set(xs)].sort((p, q) => p - q))
}

/** Analysis results in [start, end], ordered by x. */
export function analysisPoints(analysis: AnalysisKind, curves: readonly (Curve | null)[], start: number, end: number): NumericPoint[] {
  if (curves.some(curve => curve === null)) return []
  const key = `${analysis}|${curves.map(curve => curve!.key).join('|')}|${start}|${end}`
  return remember(key, () => {
    const [first, second] = curves as Curve[]
    if (analysis === 'intersection') return first && second ? intersect(first, second, start, end).slice(0, MAX_POINTS) : []
    if (first?.kind !== 'graph') return []
    const low = Math.max(start, first.low)
    const high = Math.min(end, first.high)
    if (analysis === 'root') return onGraph(first, zerosOf(first.evaluate, low, high))
    // Extrema and inflection points are where the first or second derivative changes sign.
    const derivative = derivativeCurve(first, analysis === 'extremum' ? 1 : 2)
    return derivative ? onGraph(first, signChanges(derivative, first.evaluate, low, high)) : []
  })
}

export interface Asymptotes {
  /** x values of vertical asymptotes in the search range, ascending. */
  vertical: number[]
  /** y = m x + n at −∞ and +∞ (one entry when both sides share it). */
  lines: { m: number; n: number }[]
}

/** Values settle: the last step is small and smaller than the one before. Aitken's Δ² estimates the limit. */
function limitOf(values: readonly (number | null)[], tolerance: number): number | null {
  if (values.some(value => value === null || !Number.isFinite(value))) return null
  const [a, b, c] = (values as number[]).slice(-3) as [number, number, number]
  const first = b - a
  const second = c - b
  if (Math.abs(second) > tolerance || (Math.abs(second) > 1e-12 && Math.abs(second) >= Math.abs(first))) return null
  const curvature = second - first
  const estimate = Math.abs(curvature) > 1e-300 && Math.abs(second) > 1e-12 ? c - second * second / curvature : c
  return Number.isFinite(estimate) ? estimate : c
}

/** Round away float noise: values within a billionth of a round number become that number. */
function tidy(value: number): number {
  const rounded = Math.round(value * 1e6) / 1e6
  const result = Math.abs(rounded - value) <= 1e-9 * Math.max(1, Math.abs(value)) ? rounded : Number(value.toPrecision(12))
  return Object.is(result, -0) ? 0 : result
}

/** y = m x + n that f approaches as x → side·∞, if it approaches a line. */
function lineAtInfinity(f: (x: number) => number | null, side: 1 | -1): { m: number; n: number } | null {
  const xs = [1e3, 1e4, 1e5, 1e6, 1e7].map(x => side * x)
  const ys = xs.map(f)
  if (ys.some(y => y === null)) return null
  const slopes = xs.slice(1).map((x, index) => (ys[index + 1]! - ys[index]!) / (x - xs[index]!))
  const m = limitOf(slopes, 1e-3)
  if (m === null) return null
  const slope = tidy(m)
  const n = limitOf(xs.map((x, index) => ys[index]! - slope * x), 1e-2)
  return n === null ? null : { m: slope, n: tidy(n) }
}

/** The values grow without bound as x → at from the given side (1/x, log x); not when they settle. */
function divergesAt(f: (x: number) => number | null, at: number, side: 1 | -1): boolean {
  const scale = Math.max(1, Math.abs(at))
  const values = [3, 5, 7, 9].map(exponent => f(at + side * scale * 10 ** -exponent))
  if (values.some(value => value === null)) return false
  const steps = values.slice(1).map((value, index) => value! - values[index]!)
  const direction = Math.sign(steps[0]!)
  if (direction === 0 || steps.some(step => Math.sign(step) !== direction)) return false
  // Converging limits shrink these steps geometrically; logarithms keep them, poles grow them.
  return steps.every((step, index) => index === 0 || Math.abs(step) >= Math.abs(steps[index - 1]!) / 2)
}

const asymptoteMemo = new Map<string, Asymptotes>()

/** Asymptotes of a graph: vertical ones at poles and divergent domain ends in [start, end], and lines at ±∞. */
export function asymptotesOf(curve: GraphCurve, start: number, end: number): Asymptotes {
  const key = `${curve.key}|${start}|${end}`
  const cached = asymptoteMemo.get(key)
  if (cached) return cached
  const f = curve.evaluate
  const lines: { m: number; n: number }[] = []
  for (const side of [-1, 1] as const) {
    const line = lineAtInfinity(f, side)
    if (line && !lines.some(other => Math.abs(other.m - line.m) <= 1e-9 && Math.abs(other.n - line.n) <= 1e-6)) lines.push(line)
  }
  const vertical: number[] = []
  const low = Math.max(start, curve.low)
  const high = Math.min(end, curve.high)
  if (high > low && Number.isFinite(low) && Number.isFinite(high)) {
    const xs = Array.from({ length: SAMPLES + 1 }, (_, index) => low + (high - low) * index / SAMPLES)
    const ys = xs.map(f)
    const candidates: number[] = []
    for (let index = 0; index < SAMPLES; index++) {
      const y = ys[index]!
      const next = ys[index + 1]!
      if (y !== null && next !== null) {
        // A sign change that is not a root, or a peak of |f|.
        if (Math.sign(y) !== Math.sign(next) && y !== 0 && next !== 0) candidates.push(bisectSign(f, xs[index]!, xs[index + 1]!, y))
        const after = ys[index + 2]
        if (after !== null && after !== undefined && Math.abs(next) > Math.abs(y) && Math.abs(next) > Math.abs(after)) {
          candidates.push(peakOfMagnitude(f, xs[index]!, xs[index + 2]!))
        }
      } else if (y !== null || next !== null) {
        // A domain end: where the defined side stops.
        candidates.push(domainEnd(f, y !== null ? xs[index]! : xs[index + 1]!, y !== null ? xs[index + 1]! : xs[index]!))
      }
    }
    for (const candidate of candidates) {
      const x = tidy(candidate)
      if (vertical.some(other => Math.abs(other - x) <= (high - low) * 1e-6)) continue
      if (divergesAt(f, candidate, -1) || divergesAt(f, candidate, 1)) vertical.push(x)
    }
  }
  const result = { vertical: vertical.sort((p, q) => p - q).slice(0, MAX_POINTS), lines }
  asymptoteMemo.set(key, result)
  if (asymptoteMemo.size > 64) asymptoteMemo.delete(asymptoteMemo.keys().next().value!)
  return result
}

/** Golden-section search for the largest |f| in [low, high]. */
function peakOfMagnitude(f: (x: number) => number | null, low: number, high: number): number {
  const ratio = (Math.sqrt(5) - 1) / 2
  let a = low
  let b = high
  for (let step = 0; step < 80; step++) {
    const c = b - ratio * (b - a)
    const d = a + ratio * (b - a)
    if (Math.abs(f(c) ?? 0) > Math.abs(f(d) ?? 0)) b = d
    else a = c
  }
  return (a + b) / 2
}

/** The last defined x between a defined `inside` and an undefined `outside`. */
function domainEnd(f: (x: number) => number | null, inside: number, outside: number): number {
  let a = inside
  let b = outside
  for (let step = 0; step < BISECTION_STEPS; step++) {
    const middle = a + (b - a) / 2
    if (middle === a || middle === b) break
    if (f(middle) === null) b = middle
    else a = middle
  }
  return a
}

/** ∫ f from a to b by adaptive Simpson; null where f is undefined on the interval. */
export function definiteIntegral(f: (x: number) => number | null, a: number, b: number): number | null {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null
  if (a === b) return 0
  if (a > b) {
    const value = definiteIntegral(f, b, a)
    return value === null ? null : -value
  }
  let undefinedValue = false
  const at = (x: number) => {
    const value = f(x)
    if (value === null) undefinedValue = true
    return value ?? 0
  }
  const simpson = (l: number, r: number, fl: number, fm: number, fr: number) => (r - l) / 6 * (fl + 4 * fm + fr)
  const adapt = (l: number, r: number, fl: number, fm: number, fr: number, whole: number, depth: number): number => {
    const m = (l + r) / 2
    const lm = (l + m) / 2
    const rm = (m + r) / 2
    const flm = at(lm)
    const frm = at(rm)
    const left = simpson(l, m, fl, flm, fm)
    const right = simpson(m, r, fm, frm, fr)
    if (depth <= 0 || Math.abs(left + right - whole) <= 1e-10 * Math.max(1, Math.abs(whole))) return left + right + (left + right - whole) / 15
    return adapt(l, m, fl, flm, fm, left, depth - 1) + adapt(m, r, fm, frm, fr, right, depth - 1)
  }
  // Split into pieces first so narrow features are not missed by the first estimate.
  const pieces = 64
  let total = 0
  for (let index = 0; index < pieces; index++) {
    const l = a + (b - a) * index / pieces
    const r = a + (b - a) * (index + 1) / pieces
    const fl = at(l)
    const fm = at((l + r) / 2)
    const fr = at(r)
    total += adapt(l, r, fl, fm, fr, simpson(l, r, fl, fm, fr), 18)
    if (undefinedValue) return null
  }
  return Number.isFinite(total) ? total : null
}
