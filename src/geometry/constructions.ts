import type { GeometryDocumentObject, VectorMeasure } from './function-types'
import {
  getCircleDescriptor, getLineDescriptor, getReflectedPoint, normalizeDegree, numericPoint, type NumericPoint, type PointLike,
} from './primitives'
import type { ObjectReference, PointConstraint, Vector } from './types'

type Lookup = (id: ObjectReference | undefined) => GeometryDocumentObject | undefined

const LINE_TYPES = new Set(['lineWithPoints', 'lineSegment', 'distanceSegment', 'ray', 'vector', 'verLine', 'lineWithEquation'])
const CIRCLE_TYPES = new Set(['circleR', 'circle2', 'circle3'])

function pointOf(object: GeometryDocumentObject | undefined): NumericPoint | null {
  return object?.type === 'point' ? numericPoint(object) : null
}

function lineDirection(object: GeometryDocumentObject | undefined): { origin: NumericPoint; direction: NumericPoint } | null {
  if (!object || !LINE_TYPES.has(object.type)) return null
  const line = getLineDescriptor(object as Parameters<typeof getLineDescriptor>[0])
  return line.status ? { origin: line.origin, direction: line.direction } : null
}

export function isLineObject(object: GeometryDocumentObject | null | undefined): boolean {
  return object !== null && object !== undefined && LINE_TYPES.has(object.type)
}

const finite = (point: NumericPoint): NumericPoint | null => Number.isFinite(point.a) && Number.isFinite(point.b) ? point : null

/** Where a constructed point is, from the objects it is built on; null while undefined. */
export function constructedLocation(constraint: PointConstraint, get: Lookup): NumericPoint | null {
  switch (constraint.type) {
    case 'midpoint': {
      const A = pointOf(get(constraint.firstId))
      const B = pointOf(get(constraint.secondId))
      return A && B ? finite({ a: A.a / 2 + B.a / 2, b: A.b / 2 + B.b / 2 }) : null
    }
    case 'reflectLine': {
      const P = pointOf(get(constraint.sourceId))
      const line = lineDirection(get(constraint.lineId))
      if (!P || !line) return null
      // Reflect across the line through its projection.
      const dx = P.a - line.origin.a
      const dy = P.b - line.origin.b
      const along = dx * line.direction.a + dy * line.direction.b
      const foot = { a: line.origin.a + along * line.direction.a, b: line.origin.b + along * line.direction.b }
      return finite(getReflectedPoint(P, foot))
    }
    case 'rotate': {
      const P = pointOf(get(constraint.sourceId))
      const C = pointOf(get(constraint.centerId))
      if (!P || !C || !Number.isFinite(constraint.angle)) return null
      const radians = constraint.angle * Math.PI / 180
      // Quarter turns are exact, so a line turned by 90° is exactly vertical.
      const quarter = constraint.angle / 90
      const exact = Number.isInteger(quarter) ? ((quarter % 4) + 4) % 4 : null
      const cos = exact === null ? Math.cos(radians) : [1, 0, -1, 0][exact]!
      const sin = exact === null ? Math.sin(radians) : [0, 1, 0, -1][exact]!
      const dx = P.a - C.a
      const dy = P.b - C.b
      return finite({ a: C.a + dx * cos - dy * sin, b: C.b + dx * sin + dy * cos })
    }
    case 'translate': {
      const P = pointOf(get(constraint.sourceId))
      const vector = constraint.vectorId === undefined ? undefined : get(constraint.vectorId)
      const ends = vector?.type === 'vector' ? [vector.A, vector.B] : [get(constraint.fromId), get(constraint.toId)]
      const from = pointOf(ends[0])
      const to = pointOf(ends[1])
      return P && from && to ? finite({ a: P.a + (to.a - from.a), b: P.b + (to.b - from.b) }) : null
    }
    case 'vectorSum': {
      const base = pointOf(get(constraint.baseId))
      if (!base) return null
      const sum = { a: base.a, b: base.b }
      for (const { vectorId, coefficient } of constraint.terms) {
        const vector = get(vectorId)
        const from = vector?.type === 'vector' ? pointOf(vector.A) : null
        const to = vector?.type === 'vector' ? pointOf(vector.B) : null
        if (!from || !to) return null
        sum.a += coefficient * (to.a - from.a)
        sum.b += coefficient * (to.b - from.b)
      }
      return finite(sum)
    }
    case 'anchor': {
      const object = get(constraint.objectId)
      if (object && CIRCLE_TYPES.has(object.type)) {
        const circle = getCircleDescriptor(object as Parameters<typeof getCircleDescriptor>[0])
        return circle.status ? { a: circle.m + (constraint.index === 1 ? circle.r : 0), b: circle.n } : null
      }
      const line = lineDirection(object)
      if (!line) return null
      return finite({ a: line.origin.a + constraint.index * line.direction.a, b: line.origin.b + constraint.index * line.direction.b })
    }
    case 'regularVertex': {
      const A = pointOf(get(constraint.firstId))
      const B = pointOf(get(constraint.secondId))
      if (!A || !B || (A.a === B.a && A.b === B.b)) return null
      // The centre lies to the left of AB; turning A about it by 2π/n gives B.
      const n = constraint.sides
      const half = { a: (B.a - A.a) / 2, b: (B.b - A.b) / 2 }
      const height = 1 / Math.tan(Math.PI / n)
      const center = { a: A.a + half.a - half.b * height, b: A.b + half.b + half.a * height }
      const angle = 2 * Math.PI * constraint.index / n
      const dx = A.a - center.a
      const dy = A.b - center.b
      return finite({ a: center.a + dx * Math.cos(angle) - dy * Math.sin(angle), b: center.b + dx * Math.sin(angle) + dy * Math.cos(angle) })
    }
    case 'lineHelper': {
      const [first, second, third] = constraint.refs.map(id => get(id))
      switch (constraint.construction) {
        case 'perpendicular':
        case 'parallel': {
          const P = pointOf(first)
          const line = lineDirection(second)
          if (!P || !line) return null
          const { a, b } = line.direction
          return constraint.construction === 'parallel' ? finite({ a: P.a + a, b: P.b + b }) : finite({ a: P.a - b, b: P.b + a })
        }
        case 'bisector': {
          // The second point of the perpendicular bisector: the midpoint moved across AB.
          const A = pointOf(first)
          const B = pointOf(second)
          if (!A || !B || (A.a === B.a && A.b === B.b)) return null
          return finite({ a: (A.a + B.a) / 2 - (B.b - A.b), b: (A.b + B.b) / 2 + (B.a - A.a) })
        }
        case 'angleBisector': {
          const A = pointOf(first)
          const B = pointOf(second)
          const C = pointOf(third)
          if (!A || !B || !C) return null
          const u = { a: A.a - B.a, b: A.b - B.b }
          const v = { a: C.a - B.a, b: C.b - B.b }
          const lu = Math.hypot(u.a, u.b)
          const lv = Math.hypot(v.a, v.b)
          if (lu === 0 || lv === 0) return null
          let direction = { a: u.a / lu + v.a / lv, b: u.b / lu + v.b / lv }
          // A straight angle bisects along the normal of its arms.
          if (Math.hypot(direction.a, direction.b) < 1e-12) direction = { a: -u.b / lu, b: u.a / lu }
          return finite({ a: B.a + direction.a, b: B.b + direction.b })
        }
      }
      return null
    }
    default:
      return null
  }
}

/** Shoelace area of a simple polygon; null when a vertex is undefined. */
export function polygonArea(points: readonly { a: unknown; b: unknown; geometryValid?: boolean }[]): number | null {
  const vertices = points.map(point => numericPoint(point as Parameters<typeof numericPoint>[0]))
  if (vertices.some(vertex => vertex === null) || vertices.length < 3) return null
  let twice = 0
  for (let index = 0; index < vertices.length; index++) {
    const p = vertices[index]!
    const q = vertices[(index + 1) % vertices.length]!
    twice += p.a * q.b - q.a * p.b
  }
  return Math.abs(twice) / 2
}

/** Centre, radius and counterclockwise angles (degrees) of an arc about M from A to the ray MB. */
export function arcData(arc: { M: PointLike; A: PointLike; B: PointLike }): { m: number; n: number; r: number; start: number; span: number } | null {
  const M = numericPoint(arc.M)
  const A = numericPoint(arc.A)
  const B = numericPoint(arc.B)
  if (!M || !A || !B) return null
  const r = Math.hypot(A.a - M.a, A.b - M.b)
  if (!(r > 0) || (B.a === M.a && B.b === M.b)) return null
  const start = normalizeDegree(Math.atan2(A.b - M.b, A.a - M.a) * 180 / Math.PI)
  const end = normalizeDegree(Math.atan2(B.b - M.b, B.a - M.a) * 180 / Math.PI)
  // B on the ray MA closes the circle.
  const span = normalizeDegree(end - start) || 360
  return { m: M.a, n: M.b, r, start, span }
}

/** The slope of a line-like object; null for vertical or undefined lines. */
export function slopeOf(object: GeometryDocumentObject | undefined): number | null {
  const line = lineDirection(object)
  if (!line || Math.abs(line.direction.a) < 1e-12) return null
  return line.direction.b / line.direction.a
}

/** The sum a vector was computed as; none for a vector between two points. */
export function vectorSumOf(vector: Vector): Extract<PointConstraint, { type: 'vectorSum' }> | null {
  for (const constraint of vector.B.onOther) {
    if (constraint.type === 'vectorSum' && constraint.ownerId === vector.id) return constraint
  }
  return null
}

function vectorComponents(object: GeometryDocumentObject | undefined): NumericPoint | null {
  if (object?.type !== 'vector') return null
  const A = numericPoint(object.A)
  const B = numericPoint(object.B)
  return A && B ? { a: B.a - A.a, b: B.b - A.b } : null
}

/** A length, an inner product or an angle in degrees between 0 and 180; null while undefined. */
export function vectorMeasureValue(item: VectorMeasure, get: Lookup): number | null {
  const [u, v] = item.sourceIds.map(id => vectorComponents(get(id)))
  if (!u) return null
  if (item.measure === 'length') return Math.hypot(u.a, u.b)
  if (!v) return null
  const dot = u.a * v.a + u.b * v.b
  if (item.measure === 'dot') return dot
  // A zero vector has no direction.
  if (!Math.hypot(u.a, u.b) || !Math.hypot(v.a, v.b)) return null
  return Math.abs(Math.atan2(u.a * v.b - u.b * v.a, dot)) * 180 / Math.PI
}

const samePlace = (P: NumericPoint | null, Q: NumericPoint | null) =>
  P !== null && Q !== null && Math.hypot(P.a - Q.a, P.b - Q.b) < 1e-9

/**
 * The dashed sides showing how a sum is built. Two vectors from the same point make a
 * parallelogram; otherwise the terms are laid tip to tail from the result's start. A side
 * that is already drawn as one of the vectors is left out. A single term has nothing to show.
 */
export function vectorGuides(vector: Vector, get: Lookup): { A: NumericPoint; B: NumericPoint }[] {
  const sum = vectorSumOf(vector)
  const start = numericPoint(vector.A)
  if (!sum || !start) return []
  const terms = sum.terms.map(term => {
    const source = get(term.vectorId)
    const components = vectorComponents(source)
    return { source: source as Vector, step: components && { a: components.a * term.coefficient, b: components.b * term.coefficient } }
  })
  if (terms.some(term => !term.step)) return []
  const moving = terms.filter(term => term.step!.a !== 0 || term.step!.b !== 0)
  if (moving.length < 2) return []
  const sides: { A: NumericPoint; B: NumericPoint }[] = []
  const walk = (order: typeof moving) => {
    let A = start
    for (const { step } of order) {
      const B = { a: A.a + step!.a, b: A.b + step!.b }
      if (!moving.some(({ source }) => samePlace(numericPoint(source.A), A) && samePlace(numericPoint(source.B), B))) sides.push({ A, B })
      A = B
    }
  }
  walk(moving)
  if (moving.length === 2 && moving.every(({ source }) => samePlace(numericPoint(source.A), start))) walk([...moving].reverse())
  return sides
}
