import { arcData } from '../geometry/constructions'
import type { GeometryDocumentObject } from '../geometry/function-types'
import { getCircleDescriptor, getLineDescriptor, numericPoint, type LineLike, type NumericPoint } from '../geometry/primitives'
import type { ObjectId } from '../geometry/types'
import type { CoordinateTransform } from '../rendering/coordinate-transform'
import { curveLines, implicitLines } from '../rendering/curve-geometry'
import type { FunctionEvaluator } from '../rendering/function-evaluator'
import { drawFunctionPlot } from '../rendering/function-plotter'
import type { TraceShape, TraceFrame } from '../rendering/painter-types'

/** Positions kept per traced point; the oldest are dropped first. */
const POINT_LIMIT = 20000
/** Vertices kept per traced line or curve; the oldest copies are dropped first. */
const VERTEX_LIMIT = 150000

/** Objects that can leave a trace: points and everything drawn as a stroke of its own. */
const TRACEABLE = new Set<GeometryDocumentObject['type']>([
  'point', 'lineWithPoints', 'lineSegment', 'ray', 'vector', 'lineWithEquation', 'verLine', 'circleR', 'circle2',
  'circle3', 'polygon', 'circularArc', 'function', 'functioncomposition', 'derivative', 'tangent', 'sectionalFunctions',
  'curve', 'implicit',
])

export function isTraceable(object: GeometryDocumentObject): boolean {
  return TRACEABLE.has(object.type)
}

export interface TraceView {
  transform: CoordinateTransform
  width: number
  height: number
  evaluator: FunctionEvaluator
}

interface Trail {
  /** Positions of a point. */
  points: NumericPoint[]
  /** Copies of a line or curve, each with the key of what it was drawn from. */
  shapes: TraceShape[]
  keys: string[]
  vertices: number
}

/** The plot of y = f(x) on the current view, as polylines in plane coordinates. */
function plotLines(expression: string, view: TraceView, startX: number | null = null, endX: number | null = null,
  startInclusive?: boolean, endInclusive?: boolean): NumericPoint[][] {
  const { transform } = view
  const lines: NumericPoint[][] = []
  let current: NumericPoint[] | null = null
  const point = (x: number, y: number) => ({ a: transform.pixelToX(x), b: transform.pixelToY(y) })
  // The plotter draws onto any context; this one keeps the path instead.
  const recorder = {
    save() {}, restore() {}, beginPath() {}, rect() {}, clip() {}, stroke() {}, setLineDash() {},
    strokeStyle: '', lineWidth: 1,
    moveTo(x: number, y: number) {
      current = [point(x, y)]
      lines.push(current)
    },
    lineTo(x: number, y: number) {
      if (!current) {
        current = []
        lines.push(current)
      }
      current.push(point(x, y))
    },
  }
  drawFunctionPlot(recorder, {
    expression, transform, width: view.width, height: view.height, color: '#000', lineWidth: 1,
    startX, endX, startInclusive, endInclusive,
  }, view.evaluator)
  return lines.filter(line => line.length > 1)
}

/** The plain shape an object has now, with a key that changes exactly when the shape does. */
function shapeOf(object: GeometryDocumentObject, view: TraceView): { key: string; shape: TraceShape } | null {
  const line = (data: LineLike): { key: string; shape: TraceShape } | null => {
    if (!getLineDescriptor(data).status) return null
    return { key: JSON.stringify(data), shape: { kind: 'line', line: data } }
  }
  const path = (key: string, lines: NumericPoint[][]) => lines.length ? { key, shape: { kind: 'path', lines } as TraceShape } : null
  switch (object.type) {
    case 'lineWithPoints':
    case 'lineSegment':
    case 'ray':
    case 'vector': {
      const A = numericPoint(object.A)
      const B = numericPoint(object.B)
      return A && B ? line({ type: object.type === 'vector' ? 'lineSegment' : object.type, A, B }) : null
    }
    case 'lineWithEquation':
      return line({ type: 'lineWithEquation', m: object.m, n: object.n, startX: object.startX, endX: object.endX })
    case 'verLine':
      return line({ type: 'verLine', x: object.x })
    case 'circleR':
    case 'circle2':
    case 'circle3': {
      const circle = getCircleDescriptor(object)
      return circle.status ? { key: `${circle.m},${circle.n},${circle.r}`, shape: { kind: 'circle', center: { a: circle.m, b: circle.n }, r: circle.r } } : null
    }
    case 'polygon': {
      const vertices = object.points.map(point => numericPoint(point))
      if (vertices.some(vertex => vertex === null)) return null
      const closed = [...vertices, vertices[0]!] as NumericPoint[]
      return path(JSON.stringify(closed), [closed])
    }
    case 'circularArc': {
      const arc = arcData(object)
      if (!arc) return null
      const steps = 64
      const points = Array.from({ length: steps + 1 }, (_, index) => {
        const angle = (arc.start + arc.span * index / steps) * Math.PI / 180
        return { a: arc.m + arc.r * Math.cos(angle), b: arc.n + arc.r * Math.sin(angle) }
      })
      return path(JSON.stringify(arc), [points])
    }
    case 'function':
    case 'functioncomposition':
      return path(object.func, plotLines(object.func, view, object.startX, object.endX))
    case 'derivative':
      return path(object.derFunc.func, plotLines(object.derFunc.func, view))
    case 'tangent':
      return line({ type: 'lineWithEquation', m: object.tngLine.m, n: object.tngLine.n })
    case 'sectionalFunctions': {
      const lines = object.secFuncs.flatMap(section => plotLines(section.func, view, section.startX, section.endX,
        section.startInclusive, section.endInclusive))
      return path(JSON.stringify(object.secFuncs.map(section => [section.func, section.startX, section.endX])), lines)
    }
    case 'curve': {
      const { transform } = view
      const lines = curveLines(object, transform, view.width, view.height)
        .map(line => line.map(point => ({ a: transform.pixelToX(point.x), b: transform.pixelToY(point.y) })))
      return path(`${object.xFunc}|${object.yFunc}|${object.start}|${object.end}`, lines)
    }
    case 'implicit':
      return path(object.func, implicitLines(object.func, view.transform, view.width, view.height))
    default:
      return null
  }
}

function vertexCount(shape: TraceShape): number {
  return shape.kind === 'path' ? shape.lines.reduce((sum, line) => sum + line.length, 0) : 2
}

/**
 * Traces live outside the document, in plane coordinates, so they stay in place when the
 * view moves and never enter the history.
 */
export class TraceRecorder {
  private readonly trails = new Map<ObjectId, Trail>()

  /** Add the current positions and shapes of traced objects; forget traces that were switched off. */
  record(objects: readonly GeometryDocumentObject[], view: TraceView): void {
    const traced = new Set<ObjectId>()
    for (const object of objects) {
      if (!object.trace || object.id === null || !isTraceable(object) || object.invalid) continue
      traced.add(object.id)
      if (!object.visibility) continue
      let trail = this.trails.get(object.id)
      if (!trail) this.trails.set(object.id, trail = { points: [], shapes: [], keys: [], vertices: 0 })
      if (object.type === 'point') {
        const position = numericPoint(object)
        const last = trail.points.at(-1)
        if (!position || (last?.a === position.a && last.b === position.b)) continue
        trail.points.push(position)
        if (trail.points.length > POINT_LIMIT) trail.points.splice(0, trail.points.length - POINT_LIMIT)
        continue
      }
      const current = shapeOf(object, view)
      if (!current || trail.keys.at(-1) === current.key) continue
      trail.shapes.push(current.shape)
      trail.keys.push(current.key)
      trail.vertices += vertexCount(current.shape)
      while (trail.vertices > VERTEX_LIMIT && trail.shapes.length > 1) {
        trail.vertices -= vertexCount(trail.shapes.shift()!)
        trail.keys.shift()
      }
    }
    for (const id of this.trails.keys()) if (!traced.has(id)) this.trails.delete(id)
  }

  frames(objects: readonly GeometryDocumentObject[]): TraceFrame[] {
    const frames: TraceFrame[] = []
    for (const object of objects) {
      const trail = object.id === null ? undefined : this.trails.get(object.id)
      if (!trail) continue
      if (trail.points.length) frames.push({ color: object.color, radius: object.size, points: trail.points })
      if (trail.shapes.length) frames.push({ color: object.color, width: object.size, shapes: trail.shapes })
    }
    return frames
  }

  clear(): void {
    this.trails.clear()
  }
}
