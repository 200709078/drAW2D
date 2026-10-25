import { analysisPoints, curveOf } from '../geometry/analysis'
import type { GeometryDocumentObject } from '../geometry/function-types'
import type { GeometryPoint, ObjectId } from '../geometry/types'

/**
 * Analysis point sets (roots, extrema, inflection points, curve intersections) start with
 * one point per solution found when they were made. When a parameter or a drag yields
 * more solutions, `create` makes a named point for each new one; it must add the point to
 * the document at once, so names and IDs stay unique. Points are never removed here: a
 * set with fewer solutions shows the rest as undefined. Returns the points created.
 */
export function growPointSets(objects: readonly GeometryDocumentObject[], create: (a: number, b: number) => GeometryPoint): GeometryPoint[] {
  const byId = new Map<ObjectId, GeometryDocumentObject>()
  const members = new Map<ObjectId, number>()
  for (const object of objects) {
    if (object.id !== null) byId.set(object.id, object)
    if (object.type !== 'point') continue
    for (const constraint of object.onOther) {
      if (constraint.type === 'analysisPoint' && constraint.ownerId !== undefined && constraint.ownerId !== null) {
        members.set(constraint.ownerId, Math.max(members.get(constraint.ownerId) ?? 1, constraint.pointIndex + 1))
      }
    }
  }
  const created: GeometryPoint[] = []
  for (const owner of [...objects]) {
    if (owner.type !== 'point' || !owner.intersectionOwner || owner.id === null) continue
    const constraint = owner.onOther.find(item => item.type === 'analysisPoint')
    if (!constraint || constraint.type !== 'analysisPoint' || constraint.ownerId !== undefined) continue
    const curves = constraint.sourceIds.map(id => {
      const source = id === null ? undefined : byId.get(id)
      return source ? curveOf(source) : null
    })
    const found = analysisPoints(constraint.analysis, curves, constraint.start, constraint.end)
    for (let index = members.get(owner.id) ?? 1; index < found.length; index++) {
      const point = create(found[index]!.a, found[index]!.b)
      point.hideInLabels = true
      point.onOther.push({
        type: 'analysisPoint', analysis: constraint.analysis, sourceIds: [...constraint.sourceIds], pointIndex: index,
        start: constraint.start, end: constraint.end, ownerId: owner.id,
      })
      owner.intersectionPointIds = [...owner.intersectionPointIds ?? [owner.id], point.id]
      if (owner.intersectionStatus === 'empty') owner.intersectionStatus = 'points'
      created.push(point)
    }
  }
  return created
}
