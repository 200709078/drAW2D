import { paintAnalysisObject } from './analysis-painter'
import { createCanvasPrimitives } from './canvas-primitives'
import { paintGeometryObject } from './geometry-painter'
import type { PainterFrame } from './painter-types'

const TAU = Math.PI * 2

/** Translucent copies of traced points at every recorded position inside the view. */
function paintTraces(frame: PainterFrame): void {
  const { ctx, transform, width, height } = frame
  for (const trace of frame.traces ?? []) {
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
  paintTraces(frame)
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
        paintGeometryObject(frame, primitives, object)
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
}
