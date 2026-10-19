import type { MathNumericType } from 'mathjs'

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
