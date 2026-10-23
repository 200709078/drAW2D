import type { PreparedCommand } from '../commands/prepare'
import type { Command, PointArgument } from '../commands/types'
import type { GeometryDocument } from '../document/geometry-document'
import { pointConstraint } from '../document/dependencies'
import type { GeometryDocumentObject } from '../geometry/function-types'
import { getObjectIntersection } from '../geometry/intersections'
import type { createGeometryModels } from '../geometry/models'
import {
  getCircleDescriptor, getProjectionOnAngle, getProjectionOnCircle, getProjectionOnLine, getReflectedPoint,
  isPointOnCircleData, numericPoint, type NumericPoint,
} from '../geometry/primitives'
import { getCircleTangentLines, getProjectionOnCircleTangent } from '../geometry/tangents'
import type { GeometryCircle, GeometryPoint, PointConstraint } from '../geometry/types'
import type { TransientPainter } from '../rendering/transient-painter'
import type { RadialToolAction } from '../ui/toolbar-types'
import type { Hit } from './hit-test'

export type GeometryModels = ReturnType<typeof createGeometryModels>

export interface ToolServices {
  document: GeometryDocument
  models: GeometryModels
  prepare(command: Command): PreparedCommand
}

export interface ToolInput {
  position: NumericPoint
  hit: Hit | null
}

export interface ToolMessage {
  title: string
  text: string
}

export interface ToolOutcome {
  /** Document membership or selection changed. */
  changed: boolean
  /** A construction was added; the caller records one history step. */
  completed: boolean
  message?: ToolMessage
}

type IntersectableObject = Extract<GeometryDocumentObject, {
  type: 'lineWithPoints' | 'lineWithEquation' | 'verLine' | 'lineSegment' | 'circleR' | 'circle2' | 'circle3'
}>

type PointCandidate =
  | { existing: GeometryPoint }
  | { position: NumericPoint; constraint?: PointConstraint }

interface PointToolSpec {
  title: string
  count: number
  command(points: PointArgument[]): Command
}

const POINT_TOOLS: Partial<Record<RadialToolAction, PointToolSpec>> = {
  line: { title: 'Doğru', count: 2, command: ([A, B]) => ({ kind: 'line', A: A!, B: B! }) },
  linesegment: { title: 'Doğru Parçası', count: 2, command: ([A, B]) => ({ kind: 'segment', A: A!, B: B! }) },
  distancesegment: { title: 'Uzaklık', count: 2, command: ([A, B]) => ({ kind: 'distance', A: A!, B: B! }) },
  reflectpoint: {
    title: 'Yansıt Nokta', count: 2, command: ([point, center]) => ({ kind: 'reflect', point: point!, center: center! }),
  },
  circle2: { title: 'Çember', count: 2, command: ([A, B]) => ({ kind: 'circle2', A: A!, B: B! }) },
  circle3: { title: 'Çember', count: 3, command: ([A, B, C]) => ({ kind: 'circle3', A: A!, B: B!, C: C! }) },
  angle: { title: 'Açı', count: 3, command: ([A, B, C]) => ({ kind: 'angle', A: A!, B: B!, C: C! }) },
}

const NOTHING: ToolOutcome = { changed: false, completed: false }

export function isCircle(object: GeometryDocumentObject | null | undefined): object is GeometryCircle {
  return object?.type === 'circleR' || object?.type === 'circle2' || object?.type === 'circle3'
}

export function isIntersectable(object: GeometryDocumentObject | null | undefined): object is IntersectableObject {
  return isCircle(object) || object?.type === 'lineWithPoints' || object?.type === 'lineWithEquation'
    || object?.type === 'verLine' || object?.type === 'lineSegment'
}

function reference(point: GeometryPoint): PointArgument {
  return { kind: 'reference', name: point.name! }
}

function commandError(error: string): string {
  return error.replace(/^İfade oluşturulamadı\.\s*/, '')
}

/** Where a click would put a point: an existing point, a point bound to the hit object, or a free point. */
export function pointCandidate(input: ToolInput): PointCandidate {
  const { hit, position } = input
  if (hit?.kind === 'point') return { existing: hit.object }
  const object = hit?.object
  const { a, b } = position
  if (isCircle(object)) {
    const projection = getProjectionOnCircle(object, a, b)
    if (projection.status) return { position: projection, constraint: { type: 'onCircle', circleId: object.id } }
  } else if (object?.type === 'lineWithPoints' || object?.type === 'lineWithEquation'
    || object?.type === 'verLine' || object?.type === 'lineSegment') {
    const projection = getProjectionOnLine(object, a, b)
    if (projection.status) return { position: projection, constraint: { type: 'onLine', lineId: object.id } }
  } else if (object?.type === 'circleTangent') {
    const projection = getProjectionOnCircleTangent(object, a, b)
    if (projection.status) {
      return { position: projection, constraint: { type: 'onCircleTangent', tangentId: object.id, lineIndex: projection.lineIndex } }
    }
  } else if (object?.type === 'angle') {
    const projection = getProjectionOnAngle(object, a, b)
    if (projection.status) return { position: projection, constraint: { type: 'onAngle', angleId: object.id } }
  }
  return { position }
}

function candidatePosition(candidate: PointCandidate): NumericPoint | null {
  return 'existing' in candidate ? numericPoint(candidate.existing) : { a: candidate.position.a, b: candidate.position.b }
}

/**
 * Interactive construction tools. Picks are staged as document drafts; the final pick
 * goes through the same command preparation as typed input, so validation and naming
 * are shared. The select tool's dragging is handled by the canvas controller.
 */
export class ToolController {
  private current: RadialToolAction = 'select'
  private points: GeometryPoint[] = []
  private target: GeometryDocumentObject | null = null

  constructor(private readonly services: ToolServices) {}

  get action(): RadialToolAction { return this.current }
  get isConstructing(): boolean { return this.points.length > 0 || this.target !== null }

  /** Forget staged picks. The caller cancels document drafts. */
  setAction(action: RadialToolAction): void {
    this.current = action
    this.reset()
  }

  reset(): void {
    this.points = []
    this.target = null
  }

  press(input: ToolInput): ToolOutcome {
    switch (this.current) {
      case 'select': return NOTHING
      case 'point': return this.pressPoint(input)
      case 'intersect': return this.pressIntersect(input)
      case 'circletangent': return this.pressCircleTangent(input)
      case 'arcmeasure': return this.pressArcMeasure(input)
      default: return this.pressPointSequence(POINT_TOOLS[this.current]!, input)
    }
  }

  paintPreview(painter: TransientPainter, input: ToolInput | null): void {
    const [A, B] = this.points
    const cursor = input ? candidatePosition(pointCandidate(input)) : null
    switch (this.current) {
      case 'line':
        if (A && cursor) painter.line({ type: 'lineWithPoints', A, B: cursor })
        break
      case 'linesegment':
        if (A && cursor) painter.line({ type: 'lineSegment', A, B: cursor })
        break
      case 'distancesegment':
        if (A && cursor) painter.distance(A, cursor)
        break
      case 'reflectpoint':
        if (A && cursor) {
          painter.point(cursor)
          painter.point(getReflectedPoint(A, cursor))
        }
        break
      case 'circle2':
        if (A && cursor) painter.circle({ type: 'circle2', A, B: cursor })
        break
      case 'circle3':
      case 'angle':
        if (A && B && cursor) {
          if (this.current === 'angle') painter.angle(A, B, cursor)
          else painter.circle({ type: 'circle3', A, B, C: cursor })
        } else if (A && B) {
          painter.line({ type: 'lineSegment', A, B })
        } else if (A && cursor) {
          painter.line({ type: 'lineSegment', A, B: cursor })
        }
        break
      case 'intersect': {
        const hovered = input?.hit?.object
        if (this.target && isIntersectable(hovered) && hovered.id !== this.target.id) {
          for (const point of getObjectIntersection(this.target, hovered).points) painter.point(point)
        }
        break
      }
      case 'circletangent':
        if (isCircle(this.target) && cursor) {
          const tangents = getCircleTangentLines(cursor, this.target)
          if (tangents.status) for (const line of tangents.lines) painter.line(line)
        }
        break
    }
  }

  private materialize(candidate: PointCandidate, draft: boolean): { point: GeometryPoint; created: boolean } {
    if ('existing' in candidate) return { point: candidate.existing, created: false }
    const { document, models } = this.services
    const point = new models.mPoint(candidate.position.a, candidate.position.b)
    if (candidate.constraint) point.onOther.push(candidate.constraint)
    document.append(point)
    if (draft) document.trackDraft(point.id!)
    return { point, created: true }
  }

  /** Append a prepared construction; on failure remove the point created by the last pick. */
  private finish(command: Command, title: string, created: GeometryPoint | null): ToolOutcome {
    const { document, prepare } = this.services
    const prepared = prepare(command)
    if (!prepared.ok) {
      if (created) document.remove(created.id!)
      return { changed: created !== null, completed: false, message: { title, text: commandError(prepared.error) } }
    }
    document.append(...prepared.objects)
    document.activeId = prepared.activeId
    document.finishDraft()
    this.reset()
    return { changed: true, completed: true }
  }

  private pressPoint(input: ToolInput): ToolOutcome {
    const candidate = pointCandidate(input)
    if ('existing' in candidate) {
      this.services.document.activeId = candidate.existing.id
      return { changed: true, completed: false }
    }
    const { point } = this.materialize(candidate, false)
    this.services.document.activeId = point.id
    return { changed: true, completed: true }
  }

  private pressPointSequence(spec: PointToolSpec, input: ToolInput): ToolOutcome {
    const candidate = pointCandidate(input)
    if ('existing' in candidate && this.points.includes(candidate.existing)) {
      return { ...NOTHING, message: { title: spec.title, text: 'Farklı bir nokta seçiniz.' } }
    }
    const last = this.points.length + 1 === spec.count
    const { point, created } = this.materialize(candidate, true)
    if (!last) {
      this.points.push(point)
      return { changed: created, completed: false }
    }
    return this.finish(spec.command([...this.points, point].map(reference)), spec.title, created ? point : null)
  }

  private pressIntersect(input: ToolInput): ToolOutcome {
    const title = 'Kesiştir'
    const object = input.hit?.object
    if (!isIntersectable(object)) {
      return { ...NOTHING, message: { title, text: this.target ? 'Farklı bir nesne seçiniz.' : 'Önce kesiştirilecek nesneyi seçiniz.' } }
    }
    if (!this.target) {
      this.target = object
      this.services.document.activeId = object.id
      return { changed: true, completed: false, message: { title, text: 'Şimdi ikinci nesneyi seçiniz.' } }
    }
    if (object.id === this.target.id) return { ...NOTHING, message: { title, text: 'Farklı bir nesne seçiniz.' } }
    return this.finish({ kind: 'intersect', first: this.target.name!, second: object.name! }, title, null)
  }

  private pressCircleTangent(input: ToolInput): ToolOutcome {
    const title = 'Teğet'
    const circle = this.target
    if (!isCircle(circle)) {
      const object = input.hit?.object
      if (!isCircle(object)) return { ...NOTHING, message: { title, text: 'Önce teğet çizilecek çemberi seçiniz.' } }
      this.target = object
      this.services.document.activeId = object.id
      return { changed: true, completed: false, message: { title, text: 'Şimdi teğet çizilecek noktayı seçiniz.' } }
    }
    const candidate = pointCandidate(input)
    const position = candidatePosition(candidate)
    // Validate before materializing, so a rejected click allocates no point, name or ID.
    const tangents = position ? getCircleTangentLines(position, circle) : null
    if (!tangents?.status) {
      const text = tangents?.reason === 'inside'
        ? 'Seçilen nokta çemberin içinde olduğu için teğet çizilemez.'
        : 'Bu çember için teğet çizilemedi.'
      return { ...NOTHING, message: { title, text } }
    }
    const { point, created } = this.materialize(candidate, false)
    return this.finish({ kind: 'circleTangent', circle: circle.name!, point: reference(point) }, title, created ? point : null)
  }

  private pressArcMeasure(input: ToolInput): ToolOutcome {
    const title = 'Yay Ölçüsü'
    const expected = isCircle(this.target) ? this.target : null
    const selected = this.arcCandidate(input, expected)
    if (!selected) {
      return { ...NOTHING, message: { title, text: expected ? 'Aynı çember üzerinde bir nokta seçin.' : 'Çember üzerinde bir nokta seçin.' } }
    }
    const [first] = this.points
    if (first && 'existing' in selected.candidate && selected.candidate.existing === first) {
      return { ...NOTHING, message: { title, text: 'Farklı bir nokta seçin.' } }
    }
    const { point, created } = this.materialize(selected.candidate, true)
    if (!first) {
      this.points = [point]
      this.target = selected.circle
      this.services.document.activeId = point.id
      return { changed: true, completed: false, message: { title, text: 'Aynı çember üzerinde ikinci noktayı seçin.' } }
    }
    return this.finish({ kind: 'arc', A: first.name!, B: point.name!, circle: selected.circle.name! }, title, created ? point : null)
  }

  private arcCandidate(input: ToolInput, expected: GeometryCircle | null): { candidate: PointCandidate; circle: GeometryCircle } | null {
    const { hit } = input
    if (hit?.kind === 'point') {
      const point = hit.object
      const circles = this.services.document.objects.filter((object): object is GeometryCircle => {
        if (!isCircle(object)) return false
        const data = getCircleDescriptor(object)
        return data.status && isPointOnCircleData(point, data)
      })
      const constrained = pointConstraint(point, 'onCircle')?.circleId
      const circle = expected
        ? circles.find(item => item.id === expected.id)
        : circles.find(item => item.id === constrained) ?? circles[0]
      return circle ? { candidate: { existing: point }, circle } : null
    }
    const object = hit?.object
    if (!isCircle(object) || (expected && object.id !== expected.id)) return null
    const candidate = pointCandidate(input)
    return 'existing' in candidate ? null : { candidate, circle: object }
  }
}
