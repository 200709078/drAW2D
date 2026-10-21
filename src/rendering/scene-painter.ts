import { paintAnalysisObject } from './analysis-painter'
import { createCanvasPrimitives } from './canvas-primitives'
import { paintGeometryObject } from './geometry-painter'
import type { PainterFrame } from './painter-types'

/**
 * The document scene is a read-only render pass. Ordering is supplied by the
 * caller so this module never sorts or mutates document objects.
 */
export function paintDocumentScene(frame: PainterFrame): void {
  const primitives = createCanvasPrimitives(frame)
  for (const object of frame.objects) {
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
        paintAnalysisObject(frame, primitives, object)
        break
    }
  }
}
