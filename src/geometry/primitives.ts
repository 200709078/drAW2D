import { isBigNumber, isComplex, isFraction } from 'mathjs'
import type { Coordinate } from './types'

export interface NumericPoint {
  a: number
  b: number
}

export interface PointLike {
  a: Coordinate
  b: Coordinate
  geometryValid?: boolean
}

export type LineLike =
  | { type: 'lineWithPoints' | 'lineSegment' | 'distanceSegment' | 'ray' | 'vector'; A: PointLike; B: PointLike }
  | { type: 'verLine'; x: number }
  | {
    type: 'lineWithEquation'
    m: number
    n: number
    startX?: number | null
    endX?: number | null
  }

export type CircleLike =
  | { type: 'circleR'; A: PointLike; r: Coordinate }
  | { type: 'circle2'; A: PointLike; B: PointLike }
  | { type: 'circle3'; A: PointLike; B: PointLike; C: PointLike }

export interface AngleLike {
  type: 'angle'
  A: PointLike
  B: PointLike
  C: PointLike
}

export interface LineDescriptor {
  status: true
  origin: NumericPoint
  direction: NumericPoint
  /** Signed distance along the unit direction, in mathematical coordinates. */
  min: number
  max: number
  limited: boolean
}

export interface CircleDescriptor {
  status: true
  m: number
  n: number
  r: number
}

export type Projection =
  | { status: true; a: number; b: number; distance: number }
  | { status: false }

/** Numerical roundoff tolerance, without making small geometry disappear. */
export function geometryTolerance(...values: number[]): number {
  let scale = 0
  for (const value of values) {
    if (Number.isFinite(value)) scale = Math.max(scale, Math.abs(value))
  }
  return Math.max(Number.MIN_VALUE, scale * (16 * Number.EPSILON))
}

/** Convert only finite real coordinates; non-real complex values are invalid. */
export function finiteCoordinate(value: Coordinate): number | null {
  let result: number
  if (typeof value === 'number') result = value
  else if (typeof value === 'bigint') result = Number(value)
  else if (typeof value === 'string') {
    if (value.trim() === '') return null
    result = Number(value)
  } else if (isBigNumber(value)) result = value.toNumber()
  else if (isFraction(value)) result = value.valueOf()
  else if (isComplex(value) && value.im === 0) result = value.re
  else return null
  return Number.isFinite(result) ? result : null
}

export function numericPoint(point: PointLike): NumericPoint | null {
  if (point.geometryValid === false) return null
  const a = finiteCoordinate(point.a)
  const b = finiteCoordinate(point.b)
  return a === null || b === null ? null : { a, b }
}

interface DirectionData {
  direction: NumericPoint
  length: number
}

function directionFromPoints(A: NumericPoint, B: NumericPoint): DirectionData | null {
  let dx = B.a - A.a
  let dy = B.b - A.b
  let scale = Math.max(Math.abs(dx), Math.abs(dy))
  if (scale === 0) return null
  if (!Number.isFinite(scale)) {
    // Opposite large finite coordinates can overflow when subtracted directly.
    scale = Math.max(Math.abs(A.a), Math.abs(A.b), Math.abs(B.a), Math.abs(B.b))
    dx = B.a / scale - A.a / scale
    dy = B.b / scale - A.b / scale
  } else {
    dx /= scale
    dy /= scale
  }
  const length = Math.hypot(dx, dy)
  return {
    direction: { a: dx / length, b: dy / length },
    length: length * scale,
  }
}

export function distanceAB(A: PointLike, B: PointLike): number {
  const start = numericPoint(A)
  const end = numericPoint(B)
  return start && end ? Math.hypot(end.a - start.a, end.b - start.b) : Number.NaN
}

export function getReflectedPoint(source: PointLike, center: PointLike): NumericPoint {
  const point = numericPoint(source)
  const origin = numericPoint(center)
  if (!point || !origin) return { a: Number.NaN, b: Number.NaN }
  const a = origin.a + (origin.a - point.a)
  const b = origin.b + (origin.b - point.b)
  return {
    a: Number.isFinite(a) ? a : Number.NaN,
    b: Number.isFinite(b) ? b : Number.NaN,
  }
}

export function getLineDescriptor(line: LineLike): LineDescriptor | { status: false } {
  if (line.type === 'verLine') {
    if (!Number.isFinite(line.x)) return { status: false }
    return {
      status: true, origin: { a: line.x, b: 0 }, direction: { a: 0, b: 1 },
      min: -Infinity, max: Infinity, limited: false,
    }
  }
  if (line.type === 'lineWithEquation') {
    if (!Number.isFinite(line.m) || !Number.isFinite(line.n)) return { status: false }
    const length = Math.hypot(1, line.m)
    const direction = { a: 1 / length, b: line.m / length }
    const start = line.startX ?? -Infinity
    const end = line.endX ?? Infinity
    if ((!Number.isFinite(start) && start !== -Infinity)
      || (!Number.isFinite(end) && end !== Infinity) || start > end) return { status: false }
    const limited = start !== -Infinity || end !== Infinity
    return {
      status: true, origin: { a: 0, b: line.n }, direction,
      min: start / direction.a, max: end / direction.a, limited,
    }
  }
  const A = numericPoint(line.A)
  const B = numericPoint(line.B)
  if (!A || !B) return { status: false }
  const limited = line.type !== 'lineWithPoints'
  const vector = directionFromPoints(A, B)
  if (!vector) {
    // A zero-length segment still represents its single endpoint.
    return limited
      ? { status: true, origin: A, direction: { a: 1, b: 0 }, min: 0, max: 0, limited }
      : { status: false }
  }
  // A ray starts at A and continues through B without end.
  if (line.type === 'ray') return { status: true, origin: A, direction: vector.direction, min: 0, max: Infinity, limited }
  if (limited && !Number.isFinite(vector.length)) return { status: false }
  return {
    status: true, origin: A, direction: vector.direction,
    min: limited ? 0 : -Infinity, max: limited ? vector.length : Infinity, limited,
  }
}

function translate(base: number, offset: number, scale: number): number {
  const result = base + offset * scale
  return Number.isFinite(result) ? result : (base / scale + offset) * scale
}

/** Translated, scaled circumcenter calculation avoids squares of world positions. */
export function getCircle3RA(
  circle: Extract<CircleLike, { type: 'circle3' }>,
): CircleDescriptor | { status: false } {
  const A = numericPoint(circle.A)
  const B = numericPoint(circle.B)
  const C = numericPoint(circle.C)
  if (!A || !B || !C) return { status: false }
  let bx = B.a - A.a
  let by = B.b - A.b
  let cx = C.a - A.a
  let cy = C.b - A.b
  let scale = Math.max(Math.abs(bx), Math.abs(by), Math.abs(cx), Math.abs(cy))
  if (scale === 0) return { status: false }
  if (!Number.isFinite(scale)) {
    scale = Math.max(Math.abs(A.a), Math.abs(A.b), Math.abs(B.a), Math.abs(B.b), Math.abs(C.a), Math.abs(C.b))
    bx = B.a / scale - A.a / scale
    by = B.b / scale - A.b / scale
    cx = C.a / scale - A.a / scale
    cy = C.b / scale - A.b / scale
  } else {
    bx /= scale
    by /= scale
    cx /= scale
    cy /= scale
  }
  const cross = bx * cy - by * cx
  if (Math.abs(cross) <= geometryTolerance(bx * cy, by * cx)) return { status: false }
  const bSquared = bx * bx + by * by
  const cSquared = cx * cx + cy * cy
  const ux = (bSquared * cy - cSquared * by) / (2 * cross)
  const uy = (bx * cSquared - cx * bSquared) / (2 * cross)
  const m = translate(A.a, ux, scale)
  const n = translate(A.b, uy, scale)
  const r = Math.hypot(ux, uy) * scale
  return Number.isFinite(m) && Number.isFinite(n) && Number.isFinite(r)
    ? { status: true, m, n, r }
    : { status: false }
}

export function getCircleDescriptor(circle: CircleLike): CircleDescriptor | { status: false } {
  if (circle.type === 'circle3') return getCircle3RA(circle)
  const A = numericPoint(circle.A)
  if (!A) return { status: false }
  const r = circle.type === 'circleR' ? finiteCoordinate(circle.r) : distanceAB(A, circle.B)
  return r !== null && Number.isFinite(r) && r >= 0
    ? { status: true, m: A.a, n: A.b, r }
    : { status: false }
}

/** Slope/intercept is a display convenience; geometric calculations use vectors. */
export function createLineEquation(A: PointLike, B: PointLike): { m: number; c: number } {
  const line = getLineDescriptor({ type: 'lineWithPoints', A, B })
  if (!line.status || line.direction.a === 0) return { m: Number.NaN, c: Number.NaN }
  const m = line.direction.b / line.direction.a
  let c = line.origin.b - m * line.origin.a
  if (!Number.isFinite(c)) {
    const scale = Math.max(Math.abs(line.origin.a), Math.abs(line.origin.b))
    c = (line.origin.b / scale - m * (line.origin.a / scale)) * scale
  }
  return Number.isFinite(m) && Number.isFinite(c) ? { m, c } : { m: Number.NaN, c: Number.NaN }
}

/** Dot a translated point with a unit vector without squaring large values. */
function dotDelta(point: NumericPoint, origin: NumericPoint, direction: NumericPoint): number {
  const dx = point.a - origin.a
  const dy = point.b - origin.b
  let scale = Math.max(Math.abs(dx), Math.abs(dy))
  if (scale === 0) return 0
  if (Number.isFinite(scale)) {
    return scale * ((dx / scale) * direction.a + (dy / scale) * direction.b)
  }
  scale = Math.max(Math.abs(point.a), Math.abs(point.b), Math.abs(origin.a), Math.abs(origin.b))
  return scale * (
    (point.a / scale - origin.a / scale) * direction.a
    + (point.b / scale - origin.b / scale) * direction.b
  )
}

function projectionOnDescriptor(line: LineDescriptor, a: number, b: number): Projection {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return { status: false }
  const point = { a, b }
  const parameter = dotDelta(point, line.origin, line.direction)
  let projectedA: number
  let projectedB: number
  if (line.limited && (parameter <= line.min || parameter >= line.max)) {
    const clamped = Math.max(line.min, Math.min(line.max, parameter))
    projectedA = line.origin.a + clamped * line.direction.a
    projectedB = line.origin.b + clamped * line.direction.b
  } else {
    const normal = { a: -line.direction.b, b: line.direction.a }
    const signedDistance = dotDelta(point, line.origin, normal)
    projectedA = a - signedDistance * normal.a
    projectedB = b - signedDistance * normal.b
  }
  const distance = Math.hypot(a - projectedA, b - projectedB)
  return Number.isFinite(projectedA) && Number.isFinite(projectedB) && Number.isFinite(distance)
    ? { status: true, a: projectedA, b: projectedB, distance }
    : { status: false }
}

export function getProjectionOnLine(line: LineLike, a: number, b: number): Projection {
  const descriptor = getLineDescriptor(line)
  return descriptor.status ? projectionOnDescriptor(descriptor, a, b) : { status: false }
}

export function getProjectionOnSegment(A: PointLike, B: PointLike, a: number, b: number): Projection {
  return getProjectionOnLine({ type: 'lineSegment', A, B }, a, b)
}

export function getProjectionOnCircle(circle: CircleLike, a: number, b: number): Projection {
  const descriptor = getCircleDescriptor(circle)
  if (!descriptor.status || !Number.isFinite(a) || !Number.isFinite(b)) return { status: false }
  const origin = { a: descriptor.m, b: descriptor.n }
  const vector = directionFromPoints(origin, { a, b })
  const direction = vector?.direction ?? { a: 1, b: 0 }
  const projectedA = descriptor.m + descriptor.r * direction.a
  const projectedB = descriptor.n + descriptor.r * direction.b
  const distance = Math.hypot(a - projectedA, b - projectedB)
  return Number.isFinite(projectedA) && Number.isFinite(projectedB) && Number.isFinite(distance)
    ? { status: true, a: projectedA, b: projectedB, distance }
    : { status: false }
}

export function getProjectionOnAngle(angle: AngleLike, a: number, b: number): Projection {
  if (!numericPoint(angle.A) || !numericPoint(angle.B) || !numericPoint(angle.C)) return { status: false }
  const AB = getProjectionOnSegment(angle.A, angle.B, a, b)
  const BC = getProjectionOnSegment(angle.B, angle.C, a, b)
  if (!AB.status) return BC
  if (!BC.status) return AB
  return AB.distance <= BC.distance ? AB : BC
}

export function normalizeDegree(degree: number): number {
  const result = degree % 360
  const normalized = result < 0 ? result + 360 : result
  return normalized === 360 || Object.is(normalized, -0) ? 0 : normalized
}

export function calculateAngle(angle: AngleLike): { angleBA: number; angleBC: number } {
  const A = numericPoint(angle.A)
  const B = numericPoint(angle.B)
  const C = numericPoint(angle.C)
  if (!A || !B || !C) return { angleBA: Number.NaN, angleBC: Number.NaN }
  const BA = directionFromPoints(B, A)
  const BC = directionFromPoints(B, C)
  return {
    angleBA: BA ? normalizeDegree(Math.atan2(BA.direction.b, BA.direction.a) * 180 / Math.PI) : Number.NaN,
    angleBC: BC ? normalizeDegree(Math.atan2(BC.direction.b, BC.direction.a) * 180 / Math.PI) : Number.NaN,
  }
}

export function getAngleMeasure(angle: AngleLike): number {
  const { angleBA, angleBC } = calculateAngle(angle)
  return normalizeDegree(angleBC - angleBA)
}

export function getPointAngleOnCircle(point: PointLike, circle: CircleDescriptor): number {
  const numeric = numericPoint(point)
  if (!numeric) return Number.NaN
  const vector = directionFromPoints({ a: circle.m, b: circle.n }, numeric)
  return vector ? normalizeDegree(Math.atan2(vector.direction.b, vector.direction.a) * 180 / Math.PI) : 0
}

export function isPointAtCircleCenter(point: PointLike, circle: CircleDescriptor, epsilon = 0.0001): boolean {
  const numeric = numericPoint(point)
  return numeric !== null && Number.isFinite(epsilon) && epsilon >= 0
    && Math.hypot(numeric.a - circle.m, numeric.b - circle.n) <= epsilon
}

export function isPointOnCircleData(point: PointLike, circle: CircleDescriptor, epsilon = 0.01): boolean {
  const numeric = numericPoint(point)
  return numeric !== null && Number.isFinite(epsilon) && epsilon >= 0
    && Math.abs(Math.hypot(numeric.a - circle.m, numeric.b - circle.n) - circle.r) <= epsilon
}

/** Arc endpoints are excluded; epsilon is expressed in degrees. */
export function isAngleInCcwArc(angle: number, start: number, span: number, epsilon = 0.0001): boolean {
  if (![angle, start, span, epsilon].every(Number.isFinite) || span < 0 || epsilon < 0) return false
  const relative = normalizeDegree(angle - start)
  return relative > epsilon && relative < Math.min(span, 360) - epsilon
}

export function getPositiveArcMeasure(A: PointLike, B: PointLike, circle: CircleLike): {
  circleData: CircleDescriptor
  startAngle: number
  span: number
} | null {
  const circleData = getCircleDescriptor(circle)
  if (!circleData.status || !numericPoint(A) || !numericPoint(B)) return null
  const startAngle = getPointAngleOnCircle(A, circleData)
  const endAngle = getPointAngleOnCircle(B, circleData)
  return { circleData, startAngle, span: normalizeDegree(endAngle - startAngle) }
}
