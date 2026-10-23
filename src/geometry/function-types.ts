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
}

/** The area between a function's graph and the x axis from `start` to `end`; its value is computed. */
export interface Integral extends GeometryObject<'integral'> {
  sourceId: ObjectReference
  start: number
  end: number
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

export type GeometryDocumentObject = BasicGeometryObject | FunctionGeometryObject | Parameter
