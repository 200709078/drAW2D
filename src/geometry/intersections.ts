import {
  geometryTolerance,
  getCircleDescriptor,
  getLineDescriptor,
} from './primitives'
import { isBigNumber, isComplex, isFraction } from 'mathjs'
import type { CircleLike, LineDescriptor, LineLike, NumericPoint, PointLike } from './primitives'
import type { Coordinate } from './types'

export type Intersectable = LineLike | CircleLike

export type LineIntersectionResult =
  | { status: true; reason: 'point'; a: number; b: number }
  | { status: false; reason: 'empty' | 'infinite' }

export type IntersectionResult =
  | { status: true; reason: 'points'; points: NumericPoint[] }
  | { status: false; reason: 'empty' | 'infinite'; points: [] }

const empty = (): IntersectionResult => ({ status: false, reason: 'empty', points: [] })

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isCoordinate(value: unknown): value is Coordinate {
  return typeof value === 'number' || typeof value === 'string' || typeof value === 'bigint'
    || isBigNumber(value) || isComplex(value) || isFraction(value)
}

function isPointLike(value: unknown): value is PointLike {
  return isRecord(value) && isCoordinate(value.a) && isCoordinate(value.b)
}

function isOptionalNumber(value: unknown): value is number | null | undefined {
  return value === null || value === undefined || typeof value === 'number'
}

export function isIntersectableLine(value: unknown): value is LineLike {
  if (!isRecord(value)) return false
  if (value.type === 'verLine') return typeof value.x === 'number'
  if (value.type === 'lineWithEquation') {
    return typeof value.m === 'number' && typeof value.n === 'number'
      && isOptionalNumber(value.startX) && isOptionalNumber(value.endX)
  }
  return (value.type === 'lineWithPoints' || value.type === 'lineSegment' || value.type === 'distanceSegment')
    && isPointLike(value.A) && isPointLike(value.B)
}

export function isIntersectableCircle(value: unknown): value is CircleLike {
  if (!isRecord(value) || !isPointLike(value.A)) return false
  if (value.type === 'circleR') return isCoordinate(value.r)
  if (value.type === 'circle2') return isPointLike(value.B)
  return value.type === 'circle3' && isPointLike(value.B) && isPointLike(value.C)
}

function cross(a: NumericPoint, b: NumericPoint): number {
  return a.a * b.b - a.b * b.a
}

function dot(a: NumericPoint, b: NumericPoint): number {
  return a.a * b.a + a.b * b.b
}

function difference(a: NumericPoint, b: NumericPoint): NumericPoint {
  return { a: a.a - b.a, b: a.b - b.b }
}

function midpoint(first: number, second: number): number {
  const delta = second - first
  return Number.isFinite(delta) ? first + delta / 2 : first / 2 + second / 2
}

function projectedDelta(point: NumericPoint, origin: NumericPoint, direction: NumericPoint): number {
  const dx = point.a - origin.a
  const dy = point.b - origin.b
  let scale = Math.max(Math.abs(dx), Math.abs(dy))
  if (scale === 0) return 0
  if (Number.isFinite(scale)) return scale * ((dx / scale) * direction.a + (dy / scale) * direction.b)
  scale = Math.max(Math.abs(point.a), Math.abs(point.b), Math.abs(origin.a), Math.abs(origin.b))
  return scale * ((point.a / scale - origin.a / scale) * direction.a
    + (point.b / scale - origin.b / scale) * direction.b)
}

function crossIsZero(a: NumericPoint, b: NumericPoint): boolean {
  const result = cross(a, b)
  return Number.isFinite(result) && Math.abs(result) <= geometryTolerance(a.a * b.b, a.b * b.a)
}

function finitePoint(point: NumericPoint): boolean {
  return Number.isFinite(point.a) && Number.isFinite(point.b)
}

function pointResult(point: NumericPoint): LineIntersectionResult {
  return finitePoint(point)
    ? { status: true, reason: 'point', a: point.a, b: point.b }
    : { status: false, reason: 'empty' }
}

function pointsResult(candidates: NumericPoint[]): IntersectionResult {
  // A small circle still has distinct intersections. Only identical floating
  // point coordinates are merged; no world-unit snapping tolerance is used.
  const points = candidates.filter((point, index) => finitePoint(point)
    && !candidates.slice(0, index).some(other => point.a === other.a && point.b === other.b))
  return points.length ? { status: true, reason: 'points', points } : empty()
}

function inDomain(line: LineDescriptor, parameter: number): boolean {
  if (!Number.isFinite(parameter)) return !line.limited && !Number.isNaN(parameter)
  const tolerance = geometryTolerance(parameter, line.min, line.max)
  return parameter >= line.min - tolerance && parameter <= line.max + tolerance
}

function atParameter(line: LineDescriptor, parameter: number): NumericPoint {
  return {
    a: line.origin.a + line.direction.a * parameter,
    b: line.origin.b + line.direction.b * parameter,
  }
}

function pointOnLine(point: NumericPoint, line: LineDescriptor): boolean {
  const delta = difference(point, line.origin)
  return crossIsZero(delta, line.direction) && inDomain(line, dot(delta, line.direction))
}

function collinearIntersection(first: LineDescriptor, second: LineDescriptor): LineIntersectionResult {
  const offset = dot(difference(second.origin, first.origin), first.direction)
  const orientation = dot(first.direction, second.direction)
  if (!Number.isFinite(offset) || !Number.isFinite(orientation)) return { status: false, reason: 'empty' }
  const secondStart = offset + orientation * second.min
  const secondEnd = offset + orientation * second.max
  const start = Math.max(first.min, Math.min(secondStart, secondEnd))
  const end = Math.min(first.max, Math.max(secondStart, secondEnd))
  if (start > end) {
    if (start - end > geometryTolerance(start, end)) return { status: false, reason: 'empty' }
    return pointResult(atParameter(first, start / 2 + end / 2))
  }
  if (start === end) return pointResult(atParameter(first, start))
  return { status: false, reason: 'infinite' }
}

/** Intersect two lines or bounded segments without allocating document models. */
export function getLineIntersection(firstObject: LineLike, secondObject: LineLike): LineIntersectionResult {
  const first = getLineDescriptor(firstObject)
  const second = getLineDescriptor(secondObject)
  if (!first.status || !second.status) return { status: false, reason: 'empty' }

  // A zero-length segment is a point, rather than an arbitrary infinite line.
  if (first.min === first.max) {
    const point = atParameter(first, first.min)
    return pointOnLine(point, second) ? pointResult(point) : { status: false, reason: 'empty' }
  }
  if (second.min === second.max) {
    const point = atParameter(second, second.min)
    return pointOnLine(point, first) ? pointResult(point) : { status: false, reason: 'empty' }
  }

  const delta = difference(second.origin, first.origin)
  if (crossIsZero(first.direction, second.direction)) {
    return crossIsZero(delta, first.direction)
      ? collinearIntersection(first, second)
      : { status: false, reason: 'empty' }
  }

  const determinant = cross(first.direction, second.direction)
  const firstParameter = cross(delta, second.direction) / determinant
  const secondParameter = cross(delta, first.direction) / determinant
  if (!inDomain(first, firstParameter) || !inDomain(second, secondParameter)) return { status: false, reason: 'empty' }
  const fromFirst = atParameter(first, firstParameter)
  const fromSecond = atParameter(second, secondParameter)
  // Averaging the two evaluations gives the same coordinates after swapping
  // inputs and reduces cancellation when one origin is far from the crossing.
  return pointResult({ a: fromFirst.a / 2 + fromSecond.a / 2, b: fromFirst.b / 2 + fromSecond.b / 2 })
}

export function getLineCircleIntersection(lineObject: LineLike, circleObject: CircleLike): IntersectionResult {
  const line = getLineDescriptor(lineObject)
  const circle = getCircleDescriptor(circleObject)
  if (!line.status || !circle.status) return empty()
  const center = { a: circle.m, b: circle.n }
  if (line.min === line.max) {
    const point = atParameter(line, line.min)
    const distance = Math.hypot(point.a - center.a, point.b - center.b)
    return Math.abs(distance - circle.r) <= geometryTolerance(distance, circle.r) ? pointsResult([point]) : empty()
  }
  if (circle.r === 0) return pointOnLine(center, line) ? pointsResult([center]) : empty()

  const signedDistance = projectedDelta(center, line.origin, { a: -line.direction.b, b: line.direction.a })
  let distance = Math.abs(signedDistance)
  if (!Number.isFinite(distance)) return empty()
  if (distance > circle.r) {
    // Only compensate roundoff at a tangent. Positive chord lengths below are
    // preserved even when the two intersections are extremely close together.
    if (distance - circle.r > geometryTolerance(distance, circle.r)) return empty()
    distance = circle.r
  }
  const ratio = distance / circle.r
  const halfChord = circle.r * Math.sqrt((1 - ratio) * (1 + ratio))
  const foot = {
    a: center.a + line.direction.b * signedDistance,
    b: center.b - line.direction.a * signedDistance,
  }
  const centerParameter = projectedDelta(center, line.origin, line.direction)
  const orientation = line.direction.a < 0 || (line.direction.a === 0 && line.direction.b < 0) ? -1 : 1
  const offsets = halfChord === 0 ? [0] : [orientation * halfChord, -orientation * halfChord]
  return pointsResult(offsets.filter(offset => inDomain(line, centerParameter + offset)).map(offset => ({
    a: foot.a + line.direction.a * offset,
    b: foot.b + line.direction.b * offset,
  })))
}

export function getCircleCircleIntersection(firstObject: CircleLike, secondObject: CircleLike): IntersectionResult {
  const first = getCircleDescriptor(firstObject)
  const second = getCircleDescriptor(secondObject)
  if (!first.status || !second.status) return empty()
  const dx = second.m - first.m
  const dy = second.n - first.n
  const distance = Math.hypot(dx, dy)
  if (distance === 0) {
    if (first.r !== second.r) return empty()
    return first.r === 0
      ? pointsResult([{ a: first.m, b: first.n }])
      : { status: false, reason: 'infinite', points: [] }
  }
  const radiusDifference = Math.abs(first.r - second.r)
  if (Number.isFinite(distance)
    && radiusDifference - distance > geometryTolerance(radiusDifference, distance)) return empty()

  // Normalize lengths before products: tiny and huge circles must not lose
  // their intersections merely because squaring a radius under/overflows.
  let scale: number
  let d: number
  let ux: number
  let uy: number
  if (Number.isFinite(distance)) {
    scale = Math.max(distance, first.r, second.r)
    d = distance / scale
    ux = dx / distance
    uy = dy / distance
  } else {
    // Subtraction of opposite finite centers can itself overflow. Work in a
    // common coordinate scale before subtracting in that exceptional case.
    scale = Math.max(Math.abs(first.m), Math.abs(first.n), Math.abs(second.m), Math.abs(second.n), first.r, second.r)
    const scaledX = second.m / scale - first.m / scale
    const scaledY = second.n / scale - first.n / scale
    d = Math.hypot(scaledX, scaledY)
    ux = scaledX / d
    uy = scaledY / d
  }
  const r1 = first.r / scale
  const r2 = second.r / scale
  if (first.r === second.r) {
    if (first.r === 0) return empty()
    // Equal radii have a midpoint chord, even if d/r underflows to zero.
    // Dividing by d would discard valid intersections in that case.
    let ratio = Number.isFinite(distance) ? (distance / 2) / first.r : (d / 2) / r1
    if (ratio > 1) {
      if (ratio - 1 > geometryTolerance(ratio, 1)) return empty()
      ratio = 1
    }
    const height = first.r * Math.sqrt((1 - ratio) * (1 + ratio))
    const foot = { a: midpoint(first.m, second.m), b: midpoint(first.n, second.n) }
    return pointsResult(height === 0 ? [foot] : [
      { a: foot.a - height * uy, b: foot.b + height * ux },
      { a: foot.a + height * uy, b: foot.b - height * ux },
    ])
  }
  const tolerance = geometryTolerance(d, r1, r2)
  if (d - r1 - r2 > tolerance || Math.abs(r1 - r2) - d > tolerance) return empty()

  const along = (d / 2 + (((first.r - second.r) / scale) * (r1 + r2)) / (2 * d)) * scale
  // Kahan's rearrangement of Heron's formula keeps the near-tangent height
  // positive whenever the floating point lengths describe a real triangle.
  const sides = (Number.isFinite(distance) ? [distance, first.r, second.r] : [d, r1, r2]).sort((a, b) => b - a)
  const sideScale = Number.isFinite(distance) ? scale : 1
  const largest = sides[0] / sideScale
  const middle = sides[1] / sideScale
  const smallest = sides[2] / sideScale
  const difference = (sides[0] - sides[1]) / sideScale
  const factors = [
    largest + (middle + smallest),
    smallest - difference,
    smallest + difference,
    largest + (middle - smallest),
  ]
  if (factors.some(value => value < -tolerance)) return empty()
  const height = (factors.reduce((product, value) => product * Math.sqrt(Math.max(0, value)), 1) / (2 * d)) * scale
  const foot = { a: first.m + along * ux, b: first.n + along * uy }
  return pointsResult(height === 0 ? [foot] : [
    { a: foot.a - height * uy, b: foot.b + height * ux },
    { a: foot.a + height * uy, b: foot.b - height * ux },
  ])
}

/** Runtime boundary used by tools and restored documents. */
export function getObjectIntersection(first: unknown, second: unknown): IntersectionResult {
  if (isIntersectableLine(first) && isIntersectableLine(second)) {
    const intersection = getLineIntersection(first, second)
    return intersection.status
      ? pointsResult([{ a: intersection.a, b: intersection.b }])
      : { status: false, reason: intersection.reason, points: [] }
  }
  if (isIntersectableLine(first) && isIntersectableCircle(second)) return getLineCircleIntersection(first, second)
  if (isIntersectableCircle(first) && isIntersectableLine(second)) return getLineCircleIntersection(second, first)
  if (isIntersectableCircle(first) && isIntersectableCircle(second)) return getCircleCircleIntersection(first, second)
  return empty()
}
