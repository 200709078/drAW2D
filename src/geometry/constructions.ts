import type { GeometryDocumentObject } from './function-types'
import { getLineDescriptor, getReflectedPoint, numericPoint, type NumericPoint } from './primitives'
import type { ObjectReference, PointConstraint } from './types'

type Lookup = (id: ObjectReference | undefined) => GeometryDocumentObject | undefined

const LINE_TYPES = new Set(['lineWithPoints', 'lineSegment', 'distanceSegment', 'ray', 'verLine', 'lineWithEquation'])

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
      const cos = Math.cos(radians)
      const sin = Math.sin(radians)
      const dx = P.a - C.a
      const dy = P.b - C.b
      return finite({ a: C.a + dx * cos - dy * sin, b: C.b + dx * sin + dy * cos })
    }
    case 'translate': {
      const P = pointOf(get(constraint.sourceId))
      const from = pointOf(get(constraint.fromId))
      const to = pointOf(get(constraint.toId))
      return P && from && to ? finite({ a: P.a + (to.a - from.a), b: P.b + (to.b - from.b) }) : null
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
