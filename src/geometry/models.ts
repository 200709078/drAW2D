import type {
  ArcMeasure,
  CircleTangent,
  Coordinate,
  DistanceSegment,
  GeometryAngle,
  GeometryCircle,
  GeometryModelContext,
  GeometryPoint,
  IntersectionStatus,
  LineSegment,
  LineWithPoints,
  ObjectReference,
  PointConstraint,
  RadiusCircle,
  ThreePointCircle,
  TwoPointCircle,
} from './types'

// Kimlik/isim üretimi mevcut belgeden gelir. Bağımlılıklar nesnelere eklenmez:
// geri alma geçmişi bu nesne grafiğini structuredClone ile saklıyor.
export function createGeometryModels(context: GeometryModelContext) {
  // declare alanları JS üretmez; constructor sırası ve optional alanların
  // başlangıçta bulunmaması eski motorla aynı kalır.
  class mPoint implements GeometryPoint {
    declare type: 'point'
    declare name: string | null
    declare id: ObjectReference
    declare a: Coordinate
    declare b: Coordinate
    declare color: string
    declare visibility: boolean
    declare size: number
    declare temp: boolean
    declare onOther: PointConstraint[]
    declare intersectionStatus?: IntersectionStatus
    declare intersectionOwner?: boolean
    declare hideInLabels?: boolean
    declare intersectionPointIds?: ObjectReference[]

    constructor(a: Coordinate, b: Coordinate, temp = false) {
      this.type = 'point'
      this.name = temp ? null : context.createName('point')
      this.id = temp ? null : context.nextId()
      this.a = a
      this.b = b
      this.color = context.randomColor()
      this.visibility = true
      this.size = 3
      this.temp = temp
      this.onOther = []
    }
  }

  class mCircleR implements RadiusCircle {
    declare type: 'circleR'
    declare name: string
    declare id: ObjectReference
    declare A: GeometryPoint
    declare r: Coordinate
    declare color: string
    declare visibility: boolean
    declare size: number
    declare temp: boolean

    constructor(A: GeometryPoint, r: Coordinate, temp = false) {
      this.type = 'circleR'
      this.name = context.createName('circleR')
      this.id = temp ? null : context.nextId()
      this.A = A
      this.r = r
      this.color = context.randomColor()
      this.visibility = true
      this.size = 1
      this.temp = temp
    }
  }

  class mCircle2 implements TwoPointCircle {
    declare type: 'circle2'
    declare name: string
    declare id: ObjectReference
    declare A: GeometryPoint
    declare B: GeometryPoint
    declare color: string
    declare visibility: boolean
    declare size: number
    declare temp: boolean

    constructor(A: GeometryPoint, B: GeometryPoint, temp = false) {
      this.type = 'circle2'
      this.name = context.createName('circleR')
      this.id = temp ? null : context.nextId()
      this.A = A
      this.B = B
      this.color = context.randomColor()
      this.visibility = true
      this.size = 1
      this.temp = temp
    }
  }

  class mCircle3 implements ThreePointCircle {
    declare type: 'circle3'
    declare name: string
    declare id: ObjectReference
    declare A: GeometryPoint
    declare B: GeometryPoint
    declare C: GeometryPoint
    declare color: string
    declare visibility: boolean
    declare size: number
    declare temp: boolean

    constructor(A: GeometryPoint, B: GeometryPoint, C: GeometryPoint, temp = false) {
      this.type = 'circle3'
      this.name = context.createName('circleR')
      this.id = temp ? null : context.nextId()
      this.A = A
      this.B = B
      this.C = C
      this.color = context.randomColor()
      this.visibility = true
      this.size = 1
      this.temp = temp
    }
  }

  class mAngle implements GeometryAngle {
    declare type: 'angle'
    declare name: string
    declare id: ObjectReference
    declare A: GeometryPoint
    declare B: GeometryPoint
    declare C: GeometryPoint
    declare color: string
    declare visibility: boolean
    declare size: number
    declare temp: boolean

    constructor(A: GeometryPoint, B: GeometryPoint, C: GeometryPoint, temp = false) {
      this.type = 'angle'
      this.name = context.createName('angle')
      this.id = temp ? null : context.nextId()
      this.A = A
      this.B = B
      this.C = C
      this.color = context.randomColor()
      this.visibility = true
      this.size = 1
      this.temp = temp
    }
  }

  class mArcMeasure implements ArcMeasure {
    declare type: 'arcMeasure'
    declare name: string
    declare id: ObjectReference
    declare A: GeometryPoint
    declare B: GeometryPoint
    declare circle: GeometryCircle
    declare color: string
    declare visibility: boolean
    declare size: number
    declare temp: boolean

    constructor(A: GeometryPoint, B: GeometryPoint, circle: GeometryCircle, temp = false) {
      this.type = 'arcMeasure'
      this.name = context.createName('arcMeasure')
      this.id = temp ? null : context.nextId()
      this.A = A
      this.B = B
      this.circle = circle
      this.color = context.randomColor()
      this.visibility = true
      this.size = 2
      this.temp = temp
    }
  }

  class mLineWithPoints implements LineWithPoints {
    declare type: 'lineWithPoints'
    declare name: string | null
    declare id: ObjectReference
    declare A: GeometryPoint
    declare B: GeometryPoint
    declare color: string
    declare visibility: boolean
    declare size: number
    declare temp: boolean

    constructor(A: GeometryPoint, B: GeometryPoint, temp = false) {
      this.type = 'lineWithPoints'
      this.name = temp ? null : context.createName('line')
      this.id = temp ? null : context.nextId()
      this.A = A
      this.B = B
      this.color = context.randomColor()
      this.visibility = true
      this.size = 2
      this.temp = temp
    }
  }

  class mLineSegment implements LineSegment {
    declare type: 'lineSegment'
    declare name: string
    declare id: ObjectReference
    declare A: GeometryPoint
    declare B: GeometryPoint
    declare color: string
    declare lineDash: number[]
    declare visibility: boolean
    declare size: number
    declare temp: boolean

    constructor(A: GeometryPoint, B: GeometryPoint, temp = false) {
      this.type = 'lineSegment'
      this.name = context.createName('lineSegment')
      this.id = temp ? null : context.nextId()
      this.A = A
      this.B = B
      this.color = context.randomColor()
      this.lineDash = []
      this.visibility = true
      this.size = 2
      this.temp = temp
    }
  }

  class mDistanceSegment implements DistanceSegment {
    declare type: 'distanceSegment'
    declare name: string
    declare id: ObjectReference
    declare A: GeometryPoint
    declare B: GeometryPoint
    declare color: string
    declare visibility: boolean
    declare size: number
    declare temp: boolean

    constructor(A: GeometryPoint, B: GeometryPoint, temp = false) {
      this.type = 'distanceSegment'
      this.name = context.createName('distanceSegment')
      this.id = temp ? null : context.nextId()
      this.A = A
      this.B = B
      this.color = context.randomColor()
      this.visibility = true
      this.size = 2
      this.temp = temp
    }
  }

  class mCircleTangent implements CircleTangent {
    declare type: 'circleTangent'
    declare name: string | null
    declare id: ObjectReference
    declare A: GeometryPoint
    declare circle: GeometryCircle
    declare color: string
    declare visibility: boolean
    declare size: number
    declare temp: boolean

    constructor(A: GeometryPoint, circle: GeometryCircle, temp = false) {
      this.type = 'circleTangent'
      this.name = temp ? null : context.createName('line')
      this.id = temp ? null : context.nextId()
      this.A = A
      this.circle = circle
      this.color = context.randomColor()
      this.visibility = true
      this.size = 2
      this.temp = temp
    }
  }

  return {
    mPoint,
    mCircleR,
    mCircle2,
    mCircle3,
    mAngle,
    mArcMeasure,
    mLineWithPoints,
    mLineSegment,
    mDistanceSegment,
    mCircleTangent,
  }
}
