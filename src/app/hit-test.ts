import { curveOf, isGraphObject } from '../geometry/analysis'
import type { GeometryDocumentObject } from '../geometry/function-types'
import { getProjectionOnAngle, getProjectionOnCircle, getProjectionOnLine, numericPoint, type NumericPoint } from '../geometry/primitives'
import { getProjectionOnCircleTangent } from '../geometry/tangents'
import type { GeometryPoint } from '../geometry/types'
import type { CoordinateTransform } from '../rendering/coordinate-transform'
import type { FunctionEvaluator } from '../rendering/function-evaluator'

export type Hit =
  | { kind: 'point'; object: GeometryPoint }
  | { kind: 'object'; object: Exclude<GeometryDocumentObject, GeometryPoint> }

export interface HitTestOptions {
  transform: CoordinateTransform
  evaluator: FunctionEvaluator
  /** Selection radius in CSS pixels, independent of zoom. */
  tolerance?: number
}

export const HIT_TOLERANCE_PX = 10

const SEQUENCE_VARIABLE = /(?<![a-zA-Z0-9_])n(?![a-zA-Z0-9_])/g

/** Distance in CSS pixels from the cursor to a hittable object, or null when it has no outline there. */
function objectDistance(object: GeometryDocumentObject, position: NumericPoint, options: HitTestOptions): number | null {
  const { a, b } = position
  const { transform } = options
  // Lines and circles are measured in mathematical units; scale by the mean pixel density.
  const pixelsPerUnit = Math.sqrt(transform.pixelsPerUnitX * transform.pixelsPerUnitY)
  const scaled = (projection: { status: true; distance: number } | { status: false }) =>
    projection.status ? projection.distance * pixelsPerUnit : null
  switch (object.type) {
    case 'lineWithEquation':
    case 'verLine':
    case 'lineSegment':
    case 'distanceSegment':
    case 'lineWithPoints':
    case 'ray':
      return scaled(getProjectionOnLine(object, a, b))
    case 'polygon': {
      const distances = object.points.map((point, index) => {
        const next = object.points[(index + 1) % object.points.length]!
        return scaled(getProjectionOnLine({ type: 'lineSegment', A: point, B: next }, a, b))
      }).filter((distance): distance is number => distance !== null)
      return distances.length ? Math.min(...distances) : null
    }
    case 'circleTangent':
      return scaled(getProjectionOnCircleTangent(object, a, b))
    case 'circleR':
    case 'circle2':
    case 'circle3':
      return scaled(getProjectionOnCircle(object, a, b))
    case 'angle':
      return scaled(getProjectionOnAngle(object, a, b))
    case 'sequence': {
      const y = options.evaluator.evaluate(object.func.replace(SEQUENCE_VARIABLE, 'x'), a)
      return y === null ? null : Math.abs(transform.yToPixel(y) - transform.yToPixel(b))
    }
    default: {
      // Function graphs: the vertical distance at the cursor's x.
      if (!isGraphObject(object)) return null
      const curve = curveOf(object)
      const y = curve?.kind === 'graph' ? curve.evaluate(a) : null
      return y === null ? null : Math.abs(transform.yToPixel(y) - transform.yToPixel(b))
    }
  }
}

/** Points win over other objects; within each group the nearest visible, defined object wins. */
export function hitTest(objects: readonly GeometryDocumentObject[], position: NumericPoint, options: HitTestOptions): Hit | null {
  const tolerance = options.tolerance ?? HIT_TOLERANCE_PX
  const { transform } = options
  const cursorX = transform.xToPixel(position.a)
  const cursorY = transform.yToPixel(position.b)
  let point: GeometryPoint | null = null
  let pointDistance = tolerance
  let other: Exclude<GeometryDocumentObject, GeometryPoint> | null = null
  let otherDistance = tolerance
  for (const object of objects) {
    if (!object.visibility || object.invalid) continue
    if (object.type === 'point') {
      const location = numericPoint(object)
      if (!location) continue
      const distance = Math.hypot(transform.xToPixel(location.a) - cursorX, transform.yToPixel(location.b) - cursorY)
      if (distance < pointDistance) {
        point = object
        pointDistance = distance
      }
    } else if (!point) {
      const distance = objectDistance(object, position, options)
      if (distance !== null && distance < otherDistance) {
        other = object
        otherDistance = distance
      }
    }
  }
  if (point) return { kind: 'point', object: point }
  return other ? { kind: 'object', object: other } : null
}
