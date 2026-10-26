import type { EquationLine, FunctionCurve, GeometryDocumentObject, Parameter, VerticalLine } from '../geometry/function-types'
import { angleTowards, unitPoint } from '../geometry/unit-circle'
import { unitCircleParameter } from './object-cards'
import { numericPoint, type NumericPoint } from '../geometry/primitives'
import { isDerivedPoint } from '../document/dependencies'
import type { GeometryPoint } from '../geometry/types'
import { composeExpressions, linearExpression } from '../math/function-algebra'

interface DraggedPoint {
  point: GeometryPoint
  origin: NumericPoint
  /** The stored values, restored exactly when the drag returns to its start. */
  raw: Pick<GeometryPoint, 'a' | 'b'>
}

type DraggedLine =
  | { object: EquationLine; raw: Pick<EquationLine, 'n' | 'func' | 'startX' | 'endX'> }
  | { object: VerticalLine; raw: Pick<VerticalLine, 'x'> }
  | { object: FunctionCurve; raw: Pick<FunctionCurve, 'func' | 'translation'> }

/** A drag that translates a point, or a whole object through its free defining points. */
export interface ObjectDrag {
  cursor: NumericPoint
  points: DraggedPoint[]
  line: DraggedLine | null
  /** A graph's offset is rounded to this step, so its equation stays readable. */
  precision: number
  /** A unit circle's A turns its angle parameter. */
  angle?: { parameter: Parameter; raw: number }
}

/** `value` on the grid of `step`, without float noise in its decimal digits. */
function rounded(value: number, step: number): number {
  const digits = Math.max(0, Math.min(12, -Math.floor(Math.log10(step))))
  const result = Number((Math.round(value / step) * step).toFixed(digits))
  return Object.is(result, -0) ? 0 : result
}

/** f(x − dx) + dy as an expression. */
export function translatedExpression(base: string, dx: number, dy: number): string {
  const parts = [base]
  if (dx !== 0) parts.push(dx > 0 ? `x-${dx}` : `x+${-dx}`)
  if (dy !== 0) parts.unshift(dy > 0 ? `x+${dy}` : `x-${-dy}`)
  return parts.length === 1 ? base : composeExpressions(parts)
}

/** A point that can be moved freely: not computed, not bound to another object, defined. */
function isFreePoint(point: GeometryPoint): boolean {
  return point.definition === undefined && point.onOther.length === 0 && numericPoint(point) !== null
}

/** The points whose translation translates the object, or null when it is not built from points. */
function definingPoints(object: GeometryDocumentObject, objects: readonly GeometryDocumentObject[]): GeometryPoint[] | null {
  switch (object.type) {
    case 'lineWithPoints':
      // A constructed line follows the points it was built from; its helper points follow them.
      return object.construction
        ? object.construction.refs.map(id => objects.find(item => item.id === id))
          .filter((item): item is GeometryPoint => item?.type === 'point')
        : [object.A, object.B]
    case 'lineSegment':
    case 'distanceSegment':
    case 'ray':
    case 'vector':
    case 'circle2':
      return [object.A, object.B]
    case 'circularArc':
      return [object.M, object.A, object.B]
    case 'circle3':
    case 'angle':
      return [object.A, object.B, object.C]
    case 'circleR':
      return [object.A]
    case 'polygon':
      // A regular polygon is built on its first two vertices.
      return object.regular ? object.points.slice(0, 2) : object.points
    default:
      return null
  }
}

/**
 * Start dragging `object` grabbed at `cursor`. A point that is not computed moves itself; lines, circles,
 * polygons, segments and angles move when all their defining points are free; an
 * equation line moves by changing its equation. Null when the object stays in place.
 */
export function beginObjectDrag(object: GeometryDocumentObject, objects: readonly GeometryDocumentObject[],
  cursor: NumericPoint, precision = 1e-6, grab = 0.1): ObjectDrag | null {
  if (object.invalid || object.imageOf) return null
  // A unit circle stays at O; only its A moves, within `grab` (plane units) of the cursor.
  if (object.type === 'unitCircle') {
    const parameter = object.show?.includes('A') ? unitCircleParameter(object, objects) : null
    const A = unitPoint(object.angle)
    if (!parameter || Math.hypot(cursor.a - A.a, cursor.b - A.b) > grab) return null
    return { cursor, points: [], line: null, precision, angle: { parameter, raw: parameter.value } }
  }
  const dragged = (points: readonly GeometryPoint[]): ObjectDrag | null => {
    const unique = [...new Set(points)]
    if (!unique.length || !unique.every(isFreePoint)) return null
    return {
      cursor,
      points: unique.map(point => ({ point, origin: numericPoint(point)!, raw: { a: point.a, b: point.b } })),
      line: null,
      precision,
    }
  }
  // A point bound to a line, circle or graph slides along it; constraint resolution keeps it there.
  if (object.type === 'point') {
    const origin = isDerivedPoint(object) ? null : numericPoint(object)
    return origin ? { cursor, points: [{ point: object, origin, raw: { a: object.a, b: object.b } }], line: null, precision } : null
  }
  // Lines given by an equation that depends on nothing else.
  if (object.type === 'lineWithEquation' && !object.definition) {
    const { n, func, startX, endX } = object
    return { cursor, points: [], line: { object, raw: { n, func, startX, endX } }, precision }
  }
  if (object.type === 'verLine' && !object.definition) return { cursor, points: [], line: { object, raw: { x: object.x } }, precision }
  // A graph of its own (not built on parameters or other functions) moves as f(x − dx) + dy.
  if (object.type === 'function' && !object.definition) {
    return { cursor, points: [], line: { object, raw: { func: object.func, translation: object.translation } }, precision }
  }
  const points = definingPoints(object, objects)
  return points ? dragged(points) : null
}

/** Move the dragged object by the cursor's offset from where it was grabbed. */
export function moveObjectDrag(drag: ObjectDrag, position: NumericPoint): void {
  const dx = position.a - drag.cursor.a
  const dy = position.b - drag.cursor.b
  const home = dx === 0 && dy === 0
  if (drag.angle) {
    const { parameter, raw } = drag.angle
    parameter.value = home ? raw : angleTowards(position, parameter.value, parameter.min, parameter.max)
    return
  }
  // Back at the start, the stored values are restored exactly so history sees no change.
  for (const { point, origin, raw } of drag.points) {
    point.a = home ? raw.a : origin.a + dx
    point.b = home ? raw.b : origin.b + dy
  }
  const line = drag.line
  if (!line) return
  if (line.object.type === 'function') {
    const { object, raw } = line as Extract<DraggedLine, { object: FunctionCurve }>
    const base = raw.translation?.base ?? raw.func
    const offset = {
      dx: rounded((raw.translation?.dx ?? 0) + dx, drag.precision),
      dy: rounded((raw.translation?.dy ?? 0) + dy, drag.precision),
    }
    if (home || (offset.dx === (raw.translation?.dx ?? 0) && offset.dy === (raw.translation?.dy ?? 0))) {
      object.func = raw.func
      if (raw.translation) object.translation = raw.translation
      else delete object.translation
      return
    }
    if (offset.dx === 0 && offset.dy === 0) {
      object.func = base
      delete object.translation
      return
    }
    object.func = translatedExpression(base, offset.dx, offset.dy)
    object.translation = { base, ...offset }
    return
  }
  if (line.object.type === 'verLine') {
    const { raw } = line as Extract<DraggedLine, { object: VerticalLine }>
    line.object.x = home ? raw.x : raw.x + dx
    return
  }
  const { object, raw } = line as Extract<DraggedLine, { object: EquationLine }>
  if (home) {
    Object.assign(object, raw)
    return
  }
  // y = m(x - dx) + n + dy
  object.n = raw.n + dy - object.m * dx
  object.func = linearExpression(object.m, object.n)
  object.startX = raw.startX === null ? null : raw.startX + dx
  object.endX = raw.endX === null ? null : raw.endX + dx
}
