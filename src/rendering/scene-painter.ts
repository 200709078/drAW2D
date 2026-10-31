import { paintAnalysisObject } from './analysis-painter'
import { createCanvasPrimitives } from './canvas-primitives'
import { paintCanvasSliders } from './canvas-slider'
import { paintCurveObject } from './curve-painter'
import { paintUnitCircle } from './unit-circle-painter'
import { paintGeometryObject } from './geometry-painter'
import type { DrawingPrimitives, PainterFrame, ShapeTrace } from './painter-types'

const TAU = Math.PI * 2

/** Translucent copies of a traced line or curve as it was at each recorded change. */
function paintShapeTrace(frame: PainterFrame, primitives: DrawingPrimitives, trace: ShapeTrace): void {
  const { ctx, transform } = frame
  const style = { color: `${trace.color}80`, width: trace.width }
  // Lines and circles stroke themselves; paths are then stroked together.
  for (const shape of trace.shapes) {
    if (shape.kind === 'line') primitives.line(shape.line, style)
    else if (shape.kind === 'circle') primitives.circle(shape.center, shape.r, style)
  }
  ctx.save()
  ctx.beginPath()
  for (const shape of trace.shapes) {
    if (shape.kind !== 'path') continue
    for (const line of shape.lines) {
      line.forEach((point, index) => {
        const x = transform.xToPixel(point.a)
        const y = transform.yToPixel(point.b)
        if (index === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
    }
  }
  ctx.strokeStyle = style.color
  ctx.lineWidth = style.width
  ctx.stroke()
  ctx.restore()
}

/** Translucent copies of traced points at every recorded position inside the view, and of traced lines and curves. */
function paintTraces(frame: PainterFrame, primitives: DrawingPrimitives): void {
  const { ctx, transform, width, height } = frame
  for (const trace of frame.traces ?? []) {
    if ('shapes' in trace) {
      paintShapeTrace(frame, primitives, trace)
      continue
    }
    ctx.save()
    ctx.fillStyle = `${trace.color}80`
    ctx.beginPath()
    for (const point of trace.points) {
      const x = transform.xToPixel(point.a)
      const y = transform.yToPixel(point.b)
      if (x < -trace.radius || y < -trace.radius || x > width + trace.radius || y > height + trace.radius) continue
      ctx.moveTo(x + trace.radius, y)
      ctx.arc(x, y, trace.radius, 0, TAU)
    }
    ctx.fill()
    ctx.restore()
  }
}

/**
 * The document scene is a read-only render pass. Ordering is supplied by the
 * caller so this module never sorts or mutates document objects.
 */
export function paintDocumentScene(frame: PainterFrame): void {
  const primitives = createCanvasPrimitives(frame)
  paintTraces(frame, primitives)
  for (const object of frame.objects) {
    // A definition without a value for the current parameters is not drawn.
    if (object.invalid) continue
    switch (object.type) {
      case 'point':
      case 'circleR':
      case 'circle2':
      case 'circle3':
      case 'verLine':
      case 'lineWithEquation':
      case 'lineWithPoints':
      case 'lineSegment':
      case 'distanceSegment':
      case 'ray':
      case 'polygon':
      case 'circleTangent':
      case 'angle':
      case 'arcMeasure':
      case 'vector':
      case 'circularArc':
      case 'area':
      case 'slope':
      case 'vectorMeasure':
        paintGeometryObject(frame, primitives, object)
        break
      case 'curve':
      case 'implicit':
      case 'inequality':
      case 'asymptote':
        paintCurveObject(frame, primitives, object)
        break
      case 'unitCircle':
        paintUnitCircle(frame, primitives, object)
        break
      case 'sequence':
      case 'limit':
      case 'function':
      case 'functioncomposition':
      case 'tangent':
      case 'tangentHX':
      case 'derivative':
      case 'sectionalFunctions':
      case 'integral':
        paintAnalysisObject(frame, primitives, object)
        break
    }
  }
  paintCanvasSliders(frame)
}
