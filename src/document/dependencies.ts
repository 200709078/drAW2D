import type { GeometryDocumentObject } from '../geometry/function-types'
import { getObjectIntersection, type IntersectionResult } from '../geometry/intersections'
import {
  getCircleDescriptor, getProjectionOnAngle, getProjectionOnCircle, getProjectionOnLine, getReflectedPoint,
  type CircleLike, type Projection,
} from '../geometry/primitives'
import { getCircleTangentTouchPoint, getProjectionOnCircleTangent } from '../geometry/tangents'
import type { GeometryPoint, ObjectId, PointConstraint } from '../geometry/types'

type ConstraintOf<Type extends PointConstraint['type']> = Extract<PointConstraint, { type: Type }>

export function pointConstraint<Type extends PointConstraint['type']>(
  object: GeometryDocumentObject | null | undefined,
  type: Type,
): ConstraintOf<Type> | null {
  if (object?.type !== 'point') return null
  return (object.onOther.find(constraint => constraint.type === type) as ConstraintOf<Type> | undefined) ?? null
}

/** A dependent point's value is derived; tools and sliders must not edit it directly. */
export function isDerivedPoint(point: GeometryPoint): boolean {
  return point.onOther.some(constraint => constraint.type === 'reflectPoint'
    || constraint.type === 'intersectLines' || constraint.type === 'circleTangentTouchPoint')
}

function constraintReferences(constraint: PointConstraint): (ObjectId | null | undefined)[] {
  switch (constraint.type) {
    case 'onCircle': return [constraint.circleId]
    case 'onLine': return [constraint.lineId]
    case 'onCircleTangent': return [constraint.tangentId]
    case 'onAngle': return [constraint.angleId]
    case 'reflectPoint': return [constraint.sourceId, constraint.centerId]
    case 'intersectLines': return [constraint.line1Id, constraint.line2Id, constraint.ownerId]
    case 'circleTangentTouchPoint': return [constraint.tangentId]
  }
}

/** Document objects that this object reads; embedded helper models are not document members. */
export function directReferences(object: GeometryDocumentObject): ObjectId[] {
  const references: (ObjectId | null | undefined)[] = []
  if (object.type === 'point') {
    for (const constraint of object.onOther) references.push(...constraintReferences(constraint))
  }
  for (const key of ['A', 'B', 'C', 'circle'] as const) {
    if (key in object) references.push((object as Partial<Record<typeof key, { id: ObjectId | null }>>)[key]?.id)
  }
  return references.filter((id): id is ObjectId => typeof id === 'number')
}

/** The given objects and everything that transitively depends on them. */
export function collectDependents(objects: readonly GeometryDocumentObject[], roots: Iterable<ObjectId>): Set<ObjectId> {
  const result = new Set(roots)
  // Objects are appended after their dependencies, so one ordered pass is a topological walk.
  for (const object of objects) {
    if (object.id !== null && !result.has(object.id) && directReferences(object).some(id => result.has(id))) {
      result.add(object.id)
    }
  }
  return result
}

/**
 * Recompute every constrained point from the objects it depends on, in document order.
 * An undefined construction keeps its last position and is marked invalid until it recovers.
 */
export function resolveConstraints(objects: readonly GeometryDocumentObject[]): void {
  const byId = new Map<ObjectId, GeometryDocumentObject>()
  for (const object of objects) if (object.id !== null) byId.set(object.id, object)
  const circles = new Map<ObjectId, CircleLike | null>()
  const intersections = new Map<string, IntersectionResult>()

  const circleFor = (id: ObjectId | null): CircleLike | null => {
    const circle = id === null ? undefined : byId.get(id)
    if (!circle || (circle.type !== 'circleR' && circle.type !== 'circle2' && circle.type !== 'circle3')) return null
    if (!circles.has(circle.id!)) {
      const data = getCircleDescriptor(circle)
      circles.set(circle.id!, data.status ? { type: 'circleR', A: { a: data.m, b: data.n }, r: data.r } : null)
    }
    return circles.get(circle.id!)!
  }
  const get = (id: ObjectId | null | undefined) => id === null || id === undefined ? undefined : byId.get(id)

  for (const point of objects) {
    if (point.type !== 'point') continue
    for (const constraint of point.onOther) {
      const a = Number(point.a)
      const b = Number(point.b)
      let result: Projection = { status: false }
      switch (constraint.type) {
        case 'onCircle': {
          const circle = circleFor(constraint.circleId)
          if (circle) result = getProjectionOnCircle(circle, a, b)
          break
        }
        case 'onLine': {
          const line = get(constraint.lineId)
          if (line && (line.type === 'lineWithPoints' || line.type === 'lineSegment' || line.type === 'distanceSegment'
            || line.type === 'verLine' || line.type === 'lineWithEquation')) result = getProjectionOnLine(line, a, b)
          break
        }
        case 'onCircleTangent': {
          const tangent = get(constraint.tangentId)
          if (tangent?.type === 'circleTangent') result = getProjectionOnCircleTangent(tangent, a, b, constraint.lineIndex)
          break
        }
        case 'onAngle': {
          const angle = get(constraint.angleId)
          if (angle?.type === 'angle') result = getProjectionOnAngle(angle, a, b)
          break
        }
        case 'reflectPoint': {
          const source = get(constraint.sourceId)
          const center = get(constraint.centerId)
          if (source?.type === 'point' && center?.type === 'point') {
            const reflected = getReflectedPoint(source, center)
            if (Number.isFinite(reflected.a) && Number.isFinite(reflected.b)) result = { status: true, ...reflected, distance: 0 }
          }
          break
        }
        case 'intersectLines': {
          const key = `${constraint.line1Id}:${constraint.line2Id}`
          let intersection = intersections.get(key)
          if (!intersection) {
            intersection = getObjectIntersection(get(constraint.line1Id), get(constraint.line2Id))
            intersections.set(key, intersection)
          }
          const location = intersection.points[constraint.pointIndex ?? 0]
          if (location) result = { status: true, ...location, distance: 0 }
          point.intersectionStatus = intersection.reason
          break
        }
        case 'circleTangentTouchPoint': {
          const tangent = get(constraint.tangentId)
          const location = tangent?.type === 'circleTangent' ? getCircleTangentTouchPoint(tangent, constraint.pointIndex ?? 0) : null
          if (location) result = { status: true, ...location, distance: 0 }
          break
        }
      }
      if (result.status) {
        point.a = result.a
        point.b = result.b
        delete point.geometryValid
      } else {
        point.geometryValid = false
      }
    }
  }
}
