import type {
  BasicGeometryObject,
  Coordinate,
  GeometryObject,
  GeometryPoint,
  LineWithPoints,
  ObjectId,
  ObjectReference,
} from './types'

export type FunctionNameGroup =
  | 'verLine'
  | 'line'
  | 'sequence'
  | 'limit'
  | 'function'
  | 'functioncomposition'
  | 'tangent'
  | 'tangentHX'
  | 'derivative'
  | 'curve'
  | 'region'

export interface FunctionModelContext {
  createName(type: FunctionNameGroup): string
  nextId(): ObjectId
  randomColor(): string
  createPoint(a: Coordinate, b: Coordinate, temp: boolean): GeometryPoint
  createLineWithPoints(A: GeometryPoint, B: GeometryPoint, temp: boolean): LineWithPoints
}

export interface FunctionDomain {
  startX: number | null
  endX: number | null
  startInclusive?: boolean
  endInclusive?: boolean
}

export interface VerticalLine extends GeometryObject<'verLine'> {
  x: number
}

export interface EquationLine extends GeometryObject<'lineWithEquation'>, FunctionDomain {
  m: number
  n: number
  func: string
}

export interface Sequence extends GeometryObject<'sequence'> {
  func: string
  start: number
  end: number
}

export interface Limit extends GeometryObject<'limit'> {
  func: string
  approachVal: number
  approachValRight: number
  approachValLeft: number
  lineDash: number[]
}

export interface FunctionCurve extends GeometryObject<'function'>, FunctionDomain {
  func: string
  /** A graph dragged on the plane: `func` is `base` moved by (dx, dy). */
  translation?: { base: string; dx: number; dy: number }
}

export interface FunctionComposition extends GeometryObject<'functioncomposition'>, FunctionDomain {
  funcs: string[]
  func: string
}

export interface Tangent extends GeometryObject<'tangent'> {
  func: string
  derivativeExpression: string
  approachVal: number
  tngLine: EquationLine
  lineDash: number[]
}

export interface TangentHX extends GeometryObject<'tangentHX'> {
  func: string
  derivativeExpression: string
  approachVal: number
  h: number
  haveH: boolean
  tngLine: EquationLine
  aodLine: LineWithPoints
  lineDash: number[]
}

export interface Derivative extends GeometryObject<'derivative'> {
  func: FunctionCurve
  derFunc: FunctionCurve
  lineDash: number[]
}

export type FunctionSection = FunctionCurve | EquationLine

export interface SectionalFunctions extends GeometryObject<'sectionalFunctions'> {
  cmd: string
  secFuncs: FunctionSection[]
}

/** A named number: a slider, or a value computed from other parameters (`definition`). */
export interface Parameter extends GeometryObject<'parameter'> {
  value: number
  min: number
  max: number
  step: number
  /** Shown as a slider on the plane, at this CSS-pixel position of the canvas (left end of the track). */
  onCanvas?: { x: number; y: number }
}

/** The area between a function's graph and the x axis from `start` to `end`; its value is computed. */
export interface Integral extends GeometryObject<'integral'> {
  sourceId: ObjectReference
  start: number
  end: number
}

/** Vertical, horizontal and oblique asymptotes of a graph; vertical ones are searched in [start, end]. */
export interface Asymptote extends GeometryObject<'asymptote'> {
  sourceId: ObjectReference
  start: number
  end: number
}

/** The area of a polygon or circle; its value is computed. */
export interface AreaMeasure extends GeometryObject<'area'> {
  sourceId: ObjectReference
}

/** The slope of a line, shown with a slope triangle; its value is computed. */
export interface SlopeMeasure extends GeometryObject<'slope'> {
  sourceId: ObjectReference
}

export type VectorMeasureKind = 'length' | 'dot' | 'angle'

/** The length of a vector, or the inner product or angle of two; its value is computed. */
export interface VectorMeasure extends GeometryObject<'vectorMeasure'> {
  measure: VectorMeasureKind
  sourceIds: ObjectReference[]
}

/**
 * A parametric curve (x(t), y(t)) for t in [start, end]. The expressions are stored in
 * x, the typed variable is only for display. A polar curve r(θ) keeps its r in `polar`.
 */
export interface ParametricCurve extends GeometryObject<'curve'> {
  xFunc: string
  yFunc: string
  variable: string
  start: number
  end: number
  polar?: string
  /** The expressions as typed (a polar curve: r in x, y empty), for its card. */
  typed: { x: string; y: string }
}

/** The curve F(x, y) = 0 of an equation `left = right`; `func` is left − right in x and y. */
export interface ImplicitCurve extends GeometryObject<'implicit'> {
  func: string
  left: string
  right: string
}

export type InequalityOperator = '<' | '<=' | '>' | '>='

/**
 * The region where `left operator right`; `func` is left − right in x and y. When one
 * side is y alone (or x), `bound` is the other side, so the region is bounded by a graph.
 */
export interface Inequality extends GeometryObject<'inequality'> {
  func: string
  left: string
  right: string
  operator: InequalityOperator
  bound?: { variable: 'x' | 'y'; expression: string; below: boolean }
}

/** The values a unit circle can show; `A` is the point on the circle with the ray OA and the arc θ. */
export type UnitCirclePart = 'A' | 'sin' | 'cos' | 'tan' | 'cot' | 'sec' | 'csc'

/**
 * The circle x² + y² = 1 with the angle θ (degrees, from a parameter) and the
 * trigonometric values chosen on its card, each drawn as a segment of its own colour.
 */
export interface UnitCircle extends GeometryObject<'unitCircle'> {
  angle: number
  /** Shown parts in UNIT_CIRCLE_PARTS order; absent means only the circle. */
  show?: UnitCirclePart[]
  /** Absent means degrees. */
  angleUnit?: 'radian'
}

export type FunctionGeometryObject =
  | VerticalLine
  | EquationLine
  | Sequence
  | Limit
  | FunctionCurve
  | FunctionComposition
  | Tangent
  | TangentHX
  | Derivative
  | SectionalFunctions
  | Integral
  | Asymptote
  | AreaMeasure
  | SlopeMeasure
  | VectorMeasure
  | ParametricCurve
  | ImplicitCurve
  | Inequality
  | UnitCircle

export type GeometryDocumentObject = BasicGeometryObject | FunctionGeometryObject | Parameter
