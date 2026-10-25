import type { NumericPoint } from './primitives'

/** F(x, y), or null where it is undefined. */
export type BivariateFunction = (x: number, y: number) => number | null

/** The sampled rectangle: math bounds and the number of cells in each direction. */
export interface ImplicitGrid {
  left: number
  right: number
  bottom: number
  top: number
  columns: number
  rows: number
}

/** Corner values in row-major order from the bottom-left; NaN where F is undefined. */
interface Samples {
  grid: ImplicitGrid
  values: Float64Array
  dx: number
  dy: number
}

/** Regula falsi steps that move an interpolated crossing onto the curve. */
const REFINE_STEPS = 8
/** A refined crossing whose |F| is still this fraction of the corner values is a pole or a jump. */
const POLE_RATIO = 1e-2

function sample(f: BivariateFunction, grid: ImplicitGrid): Samples {
  const { left, bottom, columns, rows } = grid
  const dx = (grid.right - left) / columns
  const dy = (grid.top - bottom) / rows
  const values = new Float64Array((columns + 1) * (rows + 1))
  for (let j = 0; j <= rows; j++) {
    const y = bottom + j * dy
    for (let i = 0; i <= columns; i++) {
      const value = f(left + i * dx, y)
      values[j * (columns + 1) + i] = value === null ? Number.NaN : value
    }
  }
  return { grid, values, dx, dy }
}

/** Corners in counterclockwise order: bottom-left, bottom-right, top-right, top-left. */
function cellCorners(samples: Samples, i: number, j: number): { x: number; y: number; value: number }[] {
  const { grid, values, dx, dy } = samples
  const width = grid.columns + 1
  const x = grid.left + i * dx
  const y = grid.bottom + j * dy
  return [
    { x, y, value: values[j * width + i]! },
    { x: x + dx, y, value: values[j * width + i + 1]! },
    { x: x + dx, y: y + dy, value: values[(j + 1) * width + i + 1]! },
    { x, y: y + dy, value: values[(j + 1) * width + i]! },
  ]
}

/**
 * The point between two corners of opposite sign where F is zero, refined along the
 * edge; null when F blows up there instead (a pole such as tan's).
 */
function crossing(f: BivariateFunction, a: { x: number; y: number; value: number }, b: { x: number; y: number; value: number }): NumericPoint | null {
  let low = 0
  let high = 1
  let fLow = a.value
  let fHigh = b.value
  let t = fLow / (fLow - fHigh)
  let value: number | null = null
  for (let step = 0; step < REFINE_STEPS; step++) {
    t = low + (high - low) * fLow / (fLow - fHigh)
    if (!Number.isFinite(t)) t = (low + high) / 2
    t = Math.min(high, Math.max(low, t))
    value = f(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)
    if (value === null) return null
    if (value === 0) break
    // Illinois variant: halve the value of the end that stays, so both ends move.
    if (Math.sign(value) === Math.sign(fLow)) {
      low = t
      fLow = value
      fHigh /= 2
    } else {
      high = t
      fHigh = value
      fLow /= 2
    }
  }
  if (value !== null && Math.abs(value) > POLE_RATIO * Math.min(Math.abs(a.value), Math.abs(b.value))
    && Math.abs(value) > 1e-9) return null
  return { a: a.x + (b.x - a.x) * t, b: a.y + (b.y - a.y) * t }
}

const inside = (value: number) => value >= 0

/** Edge e of cell (i, j): 0 bottom, 1 right, 2 top, 3 left; shared edges get the same key. */
function edgeKey(grid: ImplicitGrid, i: number, j: number, edge: number): number {
  const width = grid.columns + 1
  switch (edge) {
    case 0: return (j * width + i) * 2
    case 1: return (j * width + i + 1) * 2 + 1
    case 2: return ((j + 1) * width + i) * 2
    default: return (j * width + i) * 2 + 1
  }
}

/**
 * The curve F = 0 as polylines in math coordinates, by marching squares with edge
 * crossings refined onto the curve. Cells where F is undefined at a corner are skipped,
 * and crossings at poles are rejected. Features smaller than a cell can be missed.
 */
export function implicitPolylines(f: BivariateFunction, grid: ImplicitGrid): NumericPoint[][] {
  const samples = sample(f, grid)
  const points = new Map<number, NumericPoint | null>()
  const pointAt = (i: number, j: number, edge: number, corners: ReturnType<typeof cellCorners>) => {
    const key = edgeKey(grid, i, j, edge)
    if (!points.has(key)) points.set(key, crossing(f, corners[edge]!, corners[(edge + 1) % 4]!))
    return points.get(key) ? key : null
  }
  // Each crossing key joins at most two segments.
  const links = new Map<number, number[]>()
  const link = (from: number, to: number) => {
    for (const [a, b] of [[from, to], [to, from]] as const) {
      const list = links.get(a)
      if (list) list.push(b)
      else links.set(a, [b])
    }
  }
  for (let j = 0; j < grid.rows; j++) {
    for (let i = 0; i < grid.columns; i++) {
      const corners = cellCorners(samples, i, j)
      if (corners.some(corner => Number.isNaN(corner.value))) continue
      const crossed = [0, 1, 2, 3].filter(edge => inside(corners[edge]!.value) !== inside(corners[(edge + 1) % 4]!.value))
      if (!crossed.length) continue
      const keys = crossed.map(edge => pointAt(i, j, edge, corners))
      if (crossed.length === 2) {
        if (keys[0] !== null && keys[1] !== null) link(keys[0], keys[1])
        continue
      }
      // A saddle: the centre value decides which corners are connected.
      const center = f(corners[0]!.x + samples.dx / 2, corners[0]!.y + samples.dy / 2)
      const centerInside = center !== null && inside(center)
      // A centre like corner 0 joins corners 0 and 2, cutting off corners 1 and 3 (and vice versa).
      const pairs = centerInside === inside(corners[0]!.value) ? [[0, 1], [2, 3]] : [[1, 2], [3, 0]]
      for (const [first, second] of pairs) {
        const a = keys[first!]
        const b = keys[second!]
        if (a !== null && a !== undefined && b !== null && b !== undefined) link(a, b)
      }
    }
  }
  const polylines: NumericPoint[][] = []
  const visited = new Set<number>()
  const walk = (start: number) => {
    const line = [start]
    visited.add(start)
    for (let current = start; ;) {
      const next = links.get(current)?.find(key => !visited.has(key))
      if (next === undefined) break
      visited.add(next)
      line.push(next)
      current = next
    }
    return line
  }
  // Open chains start at an end; closed loops anywhere.
  for (const [key, neighbours] of links) if (neighbours.length === 1 && !visited.has(key)) polylines.push(walk(key).map(id => points.get(id)!))
  for (const key of links.keys()) {
    if (visited.has(key)) continue
    const loop = walk(key)
    loop.push(key)
    polylines.push(loop.map(id => points.get(id)!))
  }
  return polylines
}

/**
 * The region F ≥ 0 (or F > 0, which differs only on the curve) as polygons in math
 * coordinates: whole rows of inside cells merged into rectangles, boundary cells cut
 * along the interpolated crossings.
 */
export function implicitRegion(f: BivariateFunction, grid: ImplicitGrid): NumericPoint[][] {
  const samples = sample(f, grid)
  const polygons: NumericPoint[][] = []
  for (let j = 0; j < grid.rows; j++) {
    let run: number | null = null
    const flush = (end: number) => {
      if (run === null) return
      const x0 = grid.left + run * samples.dx
      const x1 = grid.left + end * samples.dx
      const y0 = grid.bottom + j * samples.dy
      const y1 = y0 + samples.dy
      polygons.push([{ a: x0, b: y0 }, { a: x1, b: y0 }, { a: x1, b: y1 }, { a: x0, b: y1 }])
      run = null
    }
    for (let i = 0; i < grid.columns; i++) {
      const corners = cellCorners(samples, i, j)
      const states = corners.map(corner => !Number.isNaN(corner.value) && inside(corner.value))
      if (states.every(Boolean)) {
        run ??= i
        continue
      }
      flush(i)
      if (!states.some(Boolean) || corners.some(corner => Number.isNaN(corner.value))) continue
      const polygon: NumericPoint[] = []
      for (let edge = 0; edge < 4; edge++) {
        const corner = corners[edge]!
        const next = corners[(edge + 1) % 4]!
        if (states[edge]) polygon.push({ a: corner.x, b: corner.y })
        if (states[edge] !== states[(edge + 1) % 4]) {
          // Linear interpolation is enough for the fill; the outline is drawn refined.
          const t = corner.value / (corner.value - next.value)
          polygon.push({ a: corner.x + (next.x - corner.x) * t, b: corner.y + (next.y - corner.y) * t })
        }
      }
      polygons.push(polygon)
    }
    flush(grid.columns)
  }
  return polygons
}

/** Distance from (x, y) to the curve F = 0, estimated as |F| / |∇F|; null where F is undefined. */
export function implicitDistance(f: BivariateFunction, x: number, y: number, step: number): number | null {
  const value = f(x, y)
  const right = f(x + step, y)
  const up = f(x, y + step)
  if (value === null || right === null || up === null) return null
  const gradient = Math.hypot((right - value) / step, (up - value) / step)
  if (gradient === 0) return value === 0 ? 0 : null
  return Math.abs(value) / gradient
}
