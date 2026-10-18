import {
  geometryTolerance,
  getCircleDescriptor,
  getProjectionOnLine,
  numericPoint,
} from './primitives'
import type { CircleLike, NumericPoint, PointLike } from './primitives'

export interface TangentLine {
  type: 'lineWithPoints'
  A: NumericPoint
  B: NumericPoint
}

export type CircleTangentResult =
  | { status: true; tangentPoints: NumericPoint[]; lines: TangentLine[] }
  | {
    status: false
    reason: 'invalidCircle' | 'invalidPoint' | 'inside' | 'degenerate'
    lines: []
  }

export interface CircleTangentLike {
  type: 'circleTangent'
  A: PointLike
  circle: CircleLike
}

export type TangentProjection =
  | { status: true; a: number; b: number; distance: number; lineIndex: number }
  | { status: false }

/** Find a representable second endpoint without introducing a fixed world unit. */
function tangentEndpoint(
  point: NumericPoint,
  directionX: number,
  directionY: number,
  preferredStep: number,
): NumericPoint | null {
  const coordinateStep = Math.max(Math.abs(point.a), Math.abs(point.b)) * Number.EPSILON * 8
  const step = Math.max(preferredStep, coordinateStep, Number.MIN_VALUE)
  for (const sign of [1, -1]) {
    const a = point.a + sign * directionX * step
    const b = point.b + sign * directionY * step
    if (Number.isFinite(a) && Number.isFinite(b) && (a !== point.a || b !== point.b)) {
      return { a, b }
    }
  }
  return null
}

/** Pure circle tangents: no document objects, identifiers or presentation state. */
export function getCircleTangentLines(point: PointLike, circle: CircleLike): CircleTangentResult {
  const descriptor = getCircleDescriptor(circle)
  if (!descriptor.status) return { status: false, reason: 'invalidCircle', lines: [] }
  const source = numericPoint(point)
  if (!source) return { status: false, reason: 'invalidPoint', lines: [] }
  const { m: centerX, n: centerY, r: radius } = descriptor
  if (radius === 0) return { status: false, reason: 'degenerate', lines: [] }

  const dx = source.a - centerX
  const dy = source.b - centerY
  let scale: number
  let normalizedX: number
  let normalizedY: number
  if (Number.isFinite(dx) && Number.isFinite(dy)) {
    scale = Math.max(Math.abs(dx), Math.abs(dy), radius)
    normalizedX = dx / scale
    normalizedY = dy / scale
  } else {
    // Opposite finite coordinates can have an unrepresentable difference.
    scale = Math.max(Math.abs(source.a), Math.abs(source.b), Math.abs(centerX), Math.abs(centerY), radius)
    normalizedX = source.a / scale - centerX / scale
    normalizedY = source.b / scale - centerY / scale
  }
  const distance = Math.hypot(normalizedX, normalizedY)
  const normalizedRadius = radius / scale
  const tolerance = geometryTolerance(distance, normalizedRadius)
  if (distance < normalizedRadius - tolerance || distance === 0) {
    return { status: false, reason: 'inside', lines: [] }
  }
  const radialX = normalizedX / distance
  const radialY = normalizedY / distance

  if (Math.abs(distance - normalizedRadius) <= tolerance) {
    const end = tangentEndpoint(source, -radialY, radialX, radius)
    if (!end) return { status: false, reason: 'degenerate', lines: [] }
    return {
      status: true,
      tangentPoints: [{ ...source }],
      lines: [{ type: 'lineWithPoints', A: source, B: end }],
    }
  }

  const ratio = normalizedRadius / distance
  // (1-q)(1+q) retains accuracy near the surface and never squares a world length.
  const perpendicular = Math.sqrt(Math.max(0, (1 - ratio) * (1 + ratio)))
  const tangentPoints: NumericPoint[] = []
  const lines: TangentLine[] = []
  for (const sign of [1, -1]) {
    const normalX = ratio * radialX - sign * perpendicular * radialY
    const normalY = ratio * radialY + sign * perpendicular * radialX
    const touch = {
      a: centerX + radius * normalX,
      b: centerY + radius * normalY,
    }
    if (!Number.isFinite(touch.a) || !Number.isFinite(touch.b)) {
      return { status: false, reason: 'degenerate', lines: [] }
    }
    const end = touch.a !== source.a || touch.b !== source.b
      ? touch
      : tangentEndpoint(source, -normalY, normalX, radius)
    if (!end) return { status: false, reason: 'degenerate', lines: [] }
    tangentPoints.push(touch)
    lines.push({ type: 'lineWithPoints', A: source, B: end })
  }
  return { status: true, tangentPoints, lines }
}

export function getProjectionOnCircleTangent(
  tangent: CircleTangentLike,
  a: number,
  b: number,
  lineIndex: number | null = null,
): TangentProjection {
  if (!tangent || tangent.type !== 'circleTangent' || !Number.isFinite(a) || !Number.isFinite(b)) {
    return { status: false }
  }
  const result = getCircleTangentLines(tangent.A, tangent.circle)
  if (!result.status) return { status: false }

  const project = (index: number): TangentProjection => {
    const projection = getProjectionOnLine(result.lines[index], a, b)
    if (!projection.status) return { status: false }
    if (!Number.isFinite(projection.distance)) return { status: false }
    return { status: true, a: projection.a, b: projection.b, distance: projection.distance, lineIndex: index }
  }

  if (lineIndex !== null && Number.isInteger(lineIndex) && lineIndex >= 0 && lineIndex < result.lines.length) {
    return project(lineIndex)
  }
  let nearest: TangentProjection = { status: false }
  for (let index = 0; index < result.lines.length; index++) {
    const projection = project(index)
    if (projection.status && (!nearest.status || projection.distance < nearest.distance)) nearest = projection
  }
  return nearest
}

export function getCircleTangentTouchPoint(tangent: CircleTangentLike, pointIndex = 0): NumericPoint | null {
  if (!tangent || tangent.type !== 'circleTangent' || !Number.isInteger(pointIndex) || pointIndex < 0) return null
  const result = getCircleTangentLines(tangent.A, tangent.circle)
  return result.status ? result.tangentPoints[pointIndex] ?? null : null
}
