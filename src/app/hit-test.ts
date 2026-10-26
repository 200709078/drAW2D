import { asymptotesOf, curveOf, isGraphObject } from '../geometry/analysis'
import { arcData } from '../geometry/constructions'
import type { GeometryDocumentObject } from '../geometry/function-types'
import { implicitDistance } from '../geometry/implicit'
import { unitPoint } from '../geometry/unit-circle'
import { getProjectionOnAngle, getProjectionOnCircle, getProjectionOnLine, numericPoint, type NumericPoint } from '../geometry/primitives'
import { getProjectionOnCircleTangent } from '../geometry/tangents'
import type { GeometryPoint } from '../geometry/types'
import type { CoordinateTransform } from '../rendering/coordinate-transform'
import { bivariate, curveLines } from '../rendering/curve-geometry'
import type { FunctionEvaluator } from '../rendering/function-evaluator'
import { distanceToPolylines } from '../rendering/parametric-plotter'

export type Hit =
  | { kind: 'point'; object: GeometryPoint }
  | { kind: 'object'; object: Exclude<GeometryDocumentObject, GeometryPoint> }

/** The graph an asymptote belongs to, looked up in the objects being tested. */
function curveSource(id: number | null, options: HitTestOptions) {
  const source = options.objects?.find(object => object.id === id)
  const curve = source ? curveOf(source) : null
  return curve?.kind === 'graph' ? curve : null
}

export interface HitTestOptions {
  transform: CoordinateTransform
  evaluator: FunctionEvaluator
  /** Selection radius in CSS pixels, independent of zoom. */
  tolerance?: number
  /** Canvas size in CSS pixels; parametric curves are sampled for this view. */
  width?: number
  height?: number
  /** The document, for objects drawn from another one (asymptotes); set by hitTest. */
  objects?: readonly GeometryDocumentObject[]
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
    case 'vector':
      return scaled(getProjectionOnLine(object, a, b))
    case 'unitCircle': {
      // The circle, and A while it is shown.
      const circle = Math.abs(Math.hypot(a, b) - 1) * pixelsPerUnit
      if (!object.show?.includes('A')) return circle
      const A = unitPoint(object.angle)
      return Math.min(circle, Math.hypot(transform.xToPixel(A.a) - transform.xToPixel(a), transform.yToPixel(A.b) - transform.yToPixel(b)))
    }
    case 'circularArc': {
      const arc = arcData(object)
      if (!arc) return null
      const angle = Math.atan2(b - arc.n, a - arc.m) * 180 / Math.PI
      const relative = ((angle - arc.start) % 360 + 360) % 360
      if (relative <= arc.span) return Math.abs(Math.hypot(a - arc.m, b - arc.n) - arc.r) * pixelsPerUnit
      // Beyond the ends, the nearer end point.
      const ends = [arc.start, arc.start + arc.span].map(degrees => {
        const radians = degrees * Math.PI / 180
        return Math.hypot(a - (arc.m + arc.r * Math.cos(radians)), b - (arc.n + arc.r * Math.sin(radians)))
      })
      return Math.min(...ends) * pixelsPerUnit
    }
    case 'curve': {
      const width = options.width ?? (transform.bounds.right - transform.bounds.left) * transform.pixelsPerUnitX
      const height = options.height ?? (transform.bounds.top - transform.bounds.bottom) * transform.pixelsPerUnitY
      const distance = distanceToPolylines(curveLines(object, transform, width, height), { x: transform.xToPixel(a), y: transform.yToPixel(b) })
      return Number.isFinite(distance) ? distance : null
    }
    case 'implicit': {
      const distance = implicitDistance(bivariate(object.func), a, b, 1e-6 * Math.max(1, Math.abs(a), Math.abs(b)))
      return distance === null ? null : distance * pixelsPerUnit
    }
    case 'inequality': {
      // Only the boundary selects a region, so the plane under it can still be panned.
      const bound = object.bound
      if (bound?.variable === 'y') {
        const y = options.evaluator.evaluate(bound.expression, a)
        return y === null ? null : Math.abs(transform.yToPixel(y) - transform.yToPixel(b))
      }
      if (bound?.variable === 'x') return Math.abs(transform.xToPixel(Number(bound.expression)) - transform.xToPixel(a))
      const distance = implicitDistance(bivariate(object.func), a, b, 1e-6 * Math.max(1, Math.abs(a), Math.abs(b)))
      return distance === null ? null : distance * pixelsPerUnit
    }
    case 'asymptote': {
      const source = curveSource(object.sourceId, options)
      if (!source) return null
      const { vertical, lines } = asymptotesOf(source, object.start, object.end)
      const distances = [
        ...vertical.map(x => Math.abs(transform.xToPixel(x) - transform.xToPixel(a))),
        ...lines.map(({ m, n }) => scaled(getProjectionOnLine({ type: 'lineWithEquation', m, n }, a, b)) ?? Infinity),
      ]
      return distances.length ? Math.min(...distances) : null
    }
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
export function hitTest(objects: readonly GeometryDocumentObject[], position: NumericPoint, hitOptions: HitTestOptions): Hit | null {
  const options = { ...hitOptions, objects }
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
