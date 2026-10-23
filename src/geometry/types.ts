import type { MathNumericType } from 'mathjs'
import type { Command } from '../commands/types'

// Eski belge verileri metin, analiz çağrıları mathjs sayısal türlerini taşıyabilir.
// Saf geometri hesapları sınırda sonlu gerçek sayıya dönüştürür; modeller girdiyi saklar.
export type Coordinate = MathNumericType | string
export type ObjectId = number
export type ObjectReference = ObjectId | null

export type GeometryNameGroup =
  | 'point'
  | 'circleR'
  | 'angle'
  | 'arcMeasure'
  | 'line'
  | 'lineSegment'
  | 'distanceSegment'
  | 'polygon'

export interface GeometryModelContext {
  createName(type: GeometryNameGroup): string
  nextId(): ObjectId
  randomColor(): string
}

export interface GeometryObject<Type extends string> {
  type: Type
  name: string | null
  id: ObjectReference
  color: string
  visibility: boolean
  size: number
  temp: boolean
  /**
   * The command as typed, with created points replaced by references. Present when the
   * values depend on parameters or named functions; they are recomputed from it.
   */
  definition?: Command
  /** The definition cannot be evaluated for the current parameter values; last values are kept. */
  invalid?: boolean
}

export type PointConstraint =
  | { type: 'onCircle'; circleId: ObjectReference }
  | { type: 'onLine'; lineId: ObjectReference }
  | { type: 'onCircleTangent'; tangentId: ObjectReference; lineIndex: number }
  | { type: 'onAngle'; angleId: ObjectReference }
  | { type: 'reflectPoint'; sourceId: ObjectReference; centerId: ObjectReference }
  | {
    type: 'intersectLines'
    line1Id: ObjectReference
    line2Id: ObjectReference
    pointIndex: number
    ownerId?: ObjectReference
  }
  | { type: 'circleTangentTouchPoint'; tangentId: ObjectReference; pointIndex: number }
  /** The k-th root, extremum, inflection point or curve intersection in [start, end], ordered by x. */
  | {
    type: 'analysisPoint'
    analysis: AnalysisKind
    sourceIds: ObjectReference[]
    pointIndex: number
    start: number
    end: number
    ownerId?: ObjectReference
  }
  /** A point on the graph of a function: its x is free, its y follows the function. */
  | { type: 'onFunction'; functionId: ObjectReference }
  | { type: 'midpoint'; firstId: ObjectReference; secondId: ObjectReference; ownerId?: ObjectReference }
  | { type: 'reflectLine'; sourceId: ObjectReference; lineId: ObjectReference }
  /** Counterclockwise rotation by `angle` degrees about the center. */
  | { type: 'rotate'; sourceId: ObjectReference; centerId: ObjectReference; angle: number }
  /** Translation by the vector from `fromId` to `toId`. */
  | { type: 'translate'; sourceId: ObjectReference; fromId: ObjectReference; toId: ObjectReference }
  /** A hidden point that gives a constructed line its direction; see LineConstruction. */
  | { type: 'lineHelper'; construction: LineConstructionKind; refs: ObjectReference[]; ownerId?: ObjectReference }

export type LineConstructionKind = 'perpendicular' | 'parallel' | 'bisector' | 'angleBisector'

/** How a constructed line was made: its first point and a hidden helper define it. */
export interface LineConstruction {
  kind: LineConstructionKind
  refs: ObjectReference[]
}

export type AnalysisKind = 'root' | 'extremum' | 'inflection' | 'intersection'

export type IntersectionStatus = 'points' | 'empty' | 'infinite'

export interface GeometryPoint extends GeometryObject<'point'> {
  a: Coordinate
  b: Coordinate
  /** A dependent construction can be undefined while retaining its last position. */
  geometryValid?: boolean
  onOther: PointConstraint[]
  intersectionStatus?: IntersectionStatus
  intersectionOwner?: boolean
  hideInLabels?: boolean
  intersectionPointIds?: ObjectReference[]
}

export interface RadiusCircle extends GeometryObject<'circleR'> {
  A: GeometryPoint
  r: Coordinate
}

export interface TwoPointCircle extends GeometryObject<'circle2'> {
  A: GeometryPoint
  B: GeometryPoint
}

export interface ThreePointCircle extends GeometryObject<'circle3'> {
  A: GeometryPoint
  B: GeometryPoint
  C: GeometryPoint
}

export type GeometryCircle = RadiusCircle | TwoPointCircle | ThreePointCircle

export interface GeometryAngle extends GeometryObject<'angle'> {
  A: GeometryPoint
  B: GeometryPoint
  C: GeometryPoint
}

export interface ArcMeasure extends GeometryObject<'arcMeasure'> {
  A: GeometryPoint
  B: GeometryPoint
  circle: GeometryCircle
}

export interface LineWithPoints extends GeometryObject<'lineWithPoints'> {
  A: GeometryPoint
  B: GeometryPoint
  /** Dik/paralel doğru, kenar orta dikmesi or açıortay: B (and for a bisector A) are hidden helpers. */
  construction?: LineConstruction
}

export interface Ray extends GeometryObject<'ray'> {
  A: GeometryPoint
  B: GeometryPoint
}

export interface Polygon extends GeometryObject<'polygon'> {
  points: GeometryPoint[]
}

export interface LineSegment extends GeometryObject<'lineSegment'> {
  A: GeometryPoint
  B: GeometryPoint
  lineDash: number[]
}

export interface DistanceSegment extends GeometryObject<'distanceSegment'> {
  A: GeometryPoint
  B: GeometryPoint
}

export interface CircleTangent extends GeometryObject<'circleTangent'> {
  A: GeometryPoint
  circle: GeometryCircle
}

// Denklem ve analiz modelleriyle tam belge birleşimi function-types.ts içindedir.
export type BasicGeometryObject =
  | GeometryPoint
  | GeometryCircle
  | GeometryAngle
  | ArcMeasure
  | LineWithPoints
  | LineSegment
  | DistanceSegment
  | CircleTangent
  | Ray
  | Polygon
