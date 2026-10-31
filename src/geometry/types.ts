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
  | 'vector'
  | 'measure'

export interface GeometryModelContext {
  createName(type: GeometryNameGroup): string
  nextId(): ObjectId
  randomColor(): string
}

export type LineStyle = 'solid' | 'dashed' | 'dotted'

export interface GeometryObject<Type extends string> {
  type: Type
  name: string | null
  id: ObjectReference
  color: string
  visibility: boolean
  size: number
  temp: boolean
  /** Absent means a solid stroke. */
  lineStyle?: LineStyle
  /** A vector's dashed construction is not drawn. */
  guidesHidden?: boolean
  /** The name is not drawn on the plane. */
  labelHidden?: boolean
  /** A point leaves a trace of the positions it passes through. */
  trace?: boolean
  /**
   * The command as typed, with created points replaced by references. Present when the
   * values depend on parameters or named functions; they are recomputed from it.
   */
  definition?: Command
  /** The definition cannot be evaluated for the current parameter values; last values are kept. */
  invalid?: boolean
  /** The object is the image of another under a transformation. */
  imageOf?: ImageOf
  /** The vector expression that gave this vector or point (`u+v`, `A+u`), as typed. */
  vectorExpression?: string
}

export interface VectorTerm {
  vectorId: ObjectReference
  coefficient: number
}

export type PointConstraint =
  | { type: 'onCircle'; circleId: ObjectReference }
  | { type: 'onLine'; lineId: ObjectReference }
  | { type: 'onCircleTangent'; tangentId: ObjectReference; lineIndex: number }
  | { type: 'onAngle'; angleId: ObjectReference }
  | { type: 'reflectPoint'; sourceId: ObjectReference; centerId: ObjectReference; ownerId?: ObjectReference; pointIndex?: number }
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
  | { type: 'reflectLine'; sourceId: ObjectReference; lineId: ObjectReference; ownerId?: ObjectReference; pointIndex?: number }
  /** Counterclockwise rotation by `angle` degrees about the center. */
  | {
    type: 'rotate'; sourceId: ObjectReference; centerId: ObjectReference; angle: number
    ownerId?: ObjectReference; pointIndex?: number
  }
  /** The point `baseId` moved by the sum of the terms: the tip of `u+v`, or `A+u`. */
  | { type: 'vectorSum'; baseId: ObjectReference; terms: VectorTerm[]; ownerId?: ObjectReference; pointIndex?: number }
  /** Translation by the vector from `fromId` to `toId`, or by the vector object `vectorId`. */
  | {
    type: 'translate'; sourceId: ObjectReference; fromId: ObjectReference; toId: ObjectReference
    vectorId?: ObjectReference; ownerId?: ObjectReference; pointIndex?: number
  }
  /**
   * A hidden point that stands for an object without points of its own, so it can be
   * transformed: a line's origin (0) and a point one unit along it (1), a circle's
   * centre (0) and the point of the circle to the right of it (1).
   */
  | { type: 'anchor'; objectId: ObjectReference; index: number; ownerId?: ObjectReference; pointIndex?: number }
  /** Vertex `index` (2, 3, ...) of the regular polygon with consecutive vertices first, second, counterclockwise. */
  | {
    type: 'regularVertex'; firstId: ObjectReference; secondId: ObjectReference; sides: number; index: number
    ownerId?: ObjectReference
  }
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
  /** A regular polygon on its first two vertices; the others are constructed. */
  regular?: { sides: number }
}

export type TransformKind = 'reflectPoint' | 'reflectLine' | 'rotate' | 'translate'

/**
 * An object that is the image of another under a transformation. Its points are hidden
 * helpers owned by it; this records the transformation for its card.
 */
export interface ImageOf {
  kind: TransformKind
  sourceId: ObjectReference
  /** The centre, the mirror line, the vector's start and end, or the vector object. */
  refs: ObjectReference[]
  /** Rotation angle in degrees. */
  angle?: number
}

/** An arrow from A to B. */
export interface Vector extends GeometryObject<'vector'> {
  A: GeometryPoint
  B: GeometryPoint
}

/** The arc of the circle about M through A, from A counterclockwise to the ray MB. */
export interface CircularArc extends GeometryObject<'circularArc'> {
  M: GeometryPoint
  A: GeometryPoint
  B: GeometryPoint
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
  | Vector
  | CircularArc
