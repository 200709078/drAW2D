import type { ParametricCurve } from '../geometry/function-types'
import { implicitPolylines, implicitRegion, type BivariateFunction, type ImplicitGrid } from '../geometry/implicit'
import type { NumericPoint } from '../geometry/primitives'
import { realEvaluator, realEvaluator2 } from '../math/function-algebra'
import type { CoordinateTransform } from './coordinate-transform'
import { parametricPolylines, type PixelPoint } from './parametric-plotter'

/** Marching-squares cell size in CSS pixels. */
const CELL_PX = 6
const CACHE_SIZE = 32

const caches = new Map<string, Map<string, unknown>>()

/** Curves are recomputed only when their expression or the view changes. */
function cached<Value>(kind: string, key: string, compute: () => Value): Value {
  let cache = caches.get(kind)
  if (!cache) caches.set(kind, cache = new Map())
  if (cache.has(key)) return cache.get(key) as Value
  const value = compute()
  cache.set(key, value)
  if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value!)
  return value
}

function viewKey(transform: CoordinateTransform, width: number, height: number): string {
  return `${transform.originX},${transform.originY},${transform.pixelsPerUnitX},${transform.pixelsPerUnitY},${width},${height}`
}

/** The visible rectangle in whole cells, aligned to the plane so cells do not shimmer while panning. */
function gridFor(transform: CoordinateTransform): ImplicitGrid {
  const cellX = CELL_PX / transform.pixelsPerUnitX
  const cellY = CELL_PX / transform.pixelsPerUnitY
  const { left, right, bottom, top } = transform.bounds
  const grid = {
    left: Math.floor(left / cellX) * cellX,
    right: Math.ceil(right / cellX) * cellX,
    bottom: Math.floor(bottom / cellY) * cellY,
    top: Math.ceil(top / cellY) * cellY,
    columns: 0,
    rows: 0,
  }
  grid.columns = Math.max(1, Math.round((grid.right - grid.left) / cellX))
  grid.rows = Math.max(1, Math.round((grid.top - grid.bottom) / cellY))
  return grid
}

export function bivariate(expression: string, sign = 1): BivariateFunction {
  const f = realEvaluator2(expression)
  return sign === 1 ? f : (x, y) => {
    const value = f(x, y)
    return value === null ? null : -value
  }
}

/** The curve F(x, y) = 0 in the view, as polylines in math coordinates. */
export function implicitLines(expression: string, transform: CoordinateTransform, width: number, height: number): NumericPoint[][] {
  return cached('implicit', `${expression}|${viewKey(transform, width, height)}`,
    () => implicitPolylines(bivariate(expression), gridFor(transform)))
}

/** The region where sign·F ≥ 0 in the view, as polygons in math coordinates. */
export function implicitFill(expression: string, sign: 1 | -1, transform: CoordinateTransform, width: number, height: number): NumericPoint[][] {
  return cached('region', `${sign}|${expression}|${viewKey(transform, width, height)}`,
    () => implicitRegion(bivariate(expression, sign), gridFor(transform)))
}

/** A parametric or polar curve in the view, as polylines in CSS pixels. */
export function curveLines(curve: Pick<ParametricCurve, 'xFunc' | 'yFunc' | 'start' | 'end'>, transform: CoordinateTransform,
  width: number, height: number): PixelPoint[][] {
  return cached('curve', `${curve.xFunc}|${curve.yFunc}|${curve.start}|${curve.end}|${viewKey(transform, width, height)}`, () => {
    const x = realEvaluator(curve.xFunc)
    const y = realEvaluator(curve.yFunc)
    return parametricPolylines({ x, y, start: curve.start, end: curve.end }, transform, height)
  })
}
