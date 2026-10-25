import type { GeometryDocumentObject } from '../geometry/function-types'
import type { LineLike, NumericPoint, PointLike } from '../geometry/primitives'
import type { ObjectReference } from '../geometry/types'
import type { CoordinateTransform } from './coordinate-transform'
import type { FunctionEvaluator } from './function-evaluator'

export type DrawingContext = Pick<CanvasRenderingContext2D,
  'save' | 'restore' | 'beginPath' | 'closePath' | 'moveTo' | 'lineTo' | 'stroke'
  | 'fill' | 'arc' | 'ellipse' | 'rect' | 'clip' | 'setLineDash' | 'fillText'
  | 'strokeStyle' | 'fillStyle' | 'lineWidth' | 'font' | 'textAlign'>

/** One synchronous paint reads document data; it never owns or changes that data. */
export interface PainterFrame {
  ctx: DrawingContext
  transform: CoordinateTransform
  width: number
  height: number
  activeId: ObjectReference
  objects: readonly GeometryDocumentObject[]
  evaluator: FunctionEvaluator
  /** Positions and shapes recorded for traced objects; drawn beneath the scene. */
  traces?: readonly TraceFrame[]
}

export interface PointTrace {
  color: string
  radius: number
  points: readonly NumericPoint[]
}

/** A copy of a line or curve as it was, in plane coordinates. */
export type TraceShape =
  | { kind: 'line'; line: LineLike }
  | { kind: 'circle'; center: NumericPoint; r: number }
  | { kind: 'path'; lines: readonly (readonly NumericPoint[])[] }

export interface ShapeTrace {
  color: string
  width: number
  shapes: readonly TraceShape[]
}

export type TraceFrame = PointTrace | ShapeTrace

export interface StrokeStyle {
  color: string
  width: number
  dash?: readonly number[]
}

export interface MarkerStyle {
  color: string
  radius: number
  outlineColor?: string
  label?: string | null
}

export interface TextStyle {
  color: string
  align?: CanvasTextAlign
  font?: string
}

export interface VisibleLine {
  start: NumericPoint
  end: NumericPoint
}

/** Draw descriptors directly: guides and previews do not allocate geometry models. */
export interface DrawingPrimitives {
  point(point: PointLike, style: MarkerStyle): void
  line(line: LineLike, style: StrokeStyle): VisibleLine | null
  circle(center: NumericPoint, radius: number, style: StrokeStyle): boolean
  text(point: NumericPoint, text: string, style: TextStyle): void
  textPixel(x: number, y: number, text: string, style: TextStyle): void
  /** Mathematical angles, counterclockwise, in degrees. */
  arc(center: NumericPoint, radius: number, start: number, span: number, style: StrokeStyle): void
}
