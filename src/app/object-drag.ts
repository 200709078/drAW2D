import type { EquationLine, GeometryDocumentObject, VerticalLine } from '../geometry/function-types'
import { numericPoint, type NumericPoint } from '../geometry/primitives'
import { isDerivedPoint } from '../document/dependencies'
import type { GeometryPoint } from '../geometry/types'
import { linearExpression } from '../math/function-algebra'

interface DraggedPoint {
  point: GeometryPoint
  origin: NumericPoint
  /** The stored values, restored exactly when the drag returns to its start. */
  raw: Pick<GeometryPoint, 'a' | 'b'>
}

type DraggedLine =
  | { object: EquationLine; raw: Pick<EquationLine, 'n' | 'func' | 'startX' | 'endX'> }
  | { object: VerticalLine; raw: Pick<VerticalLine, 'x'> }

/** A drag that translates a point, or a whole object through its free defining points. */
export interface ObjectDrag {
  cursor: NumericPoint
  points: DraggedPoint[]
  line: DraggedLine | null
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
    case 'circle2':
      return [object.A, object.B]
    case 'circle3':
    case 'angle':
      return [object.A, object.B, object.C]
    case 'circleR':
      return [object.A]
    case 'polygon':
      return object.points
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
  cursor: NumericPoint): ObjectDrag | null {
  if (object.invalid) return null
  const dragged = (points: readonly GeometryPoint[]): ObjectDrag | null => {
    const unique = [...new Set(points)]
    if (!unique.length || !unique.every(isFreePoint)) return null
    return {
      cursor,
      points: unique.map(point => ({ point, origin: numericPoint(point)!, raw: { a: point.a, b: point.b } })),
      line: null,
    }
  }
  // A point bound to a line, circle or graph slides along it; constraint resolution keeps it there.
  if (object.type === 'point') {
    const origin = isDerivedPoint(object) ? null : numericPoint(object)
    return origin ? { cursor, points: [{ point: object, origin, raw: { a: object.a, b: object.b } }], line: null } : null
  }
  // Lines given by an equation that depends on nothing else.
  if (object.type === 'lineWithEquation' && !object.definition) {
    const { n, func, startX, endX } = object
    return { cursor, points: [], line: { object, raw: { n, func, startX, endX } } }
  }
  if (object.type === 'verLine' && !object.definition) return { cursor, points: [], line: { object, raw: { x: object.x } } }
  const points = definingPoints(object, objects)
  return points ? dragged(points) : null
}

/** Move the dragged object by the cursor's offset from where it was grabbed. */
export function moveObjectDrag(drag: ObjectDrag, position: NumericPoint): void {
  const dx = position.a - drag.cursor.a
  const dy = position.b - drag.cursor.b
  const home = dx === 0 && dy === 0
  // Back at the start, the stored values are restored exactly so history sees no change.
  for (const { point, origin, raw } of drag.points) {
    point.a = home ? raw.a : origin.a + dx
    point.b = home ? raw.b : origin.b + dy
  }
  const line = drag.line
  if (!line) return
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
