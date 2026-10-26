import { parseCommand } from '../commands/parser'
import { isTransformable, type PreparedCommand } from '../commands/prepare'
import type { Command, PointArgument } from '../commands/types'
import type { GeometryDocument } from '../document/geometry-document'
import { pointConstraint } from '../document/dependencies'
import type { GeometryDocumentObject } from '../geometry/function-types'
import { analysisPoints, curveOf, isGraphObject } from '../geometry/analysis'
import { arcData, constructedLocation, isLineObject } from '../geometry/constructions'
import { getObjectIntersection } from '../geometry/intersections'
import type { createGeometryModels } from '../geometry/models'
import {
  getCircleDescriptor, getLineDescriptor, getProjectionOnAngle, getProjectionOnCircle, getProjectionOnLine, getReflectedPoint,
  isPointOnCircleData, numericPoint, type NumericPoint,
} from '../geometry/primitives'
import { getCircleTangentLines, getProjectionOnCircleTangent } from '../geometry/tangents'
import type { GeometryCircle, GeometryPoint, PointConstraint } from '../geometry/types'
import type { TransientPainter } from '../rendering/transient-painter'
import type { ToolAction } from '../ui/tool-registry'
import type { Hit } from './hit-test'

export type GeometryModels = ReturnType<typeof createGeometryModels>

export interface ToolServices {
  document: GeometryDocument
  models: GeometryModels
  prepare(command: Command): PreparedCommand
  /** The x range curve intersections are previewed in. */
  visibleRange(): { start: number; end: number }
}

export interface ToolInput {
  position: NumericPoint
  hit: Hit | null
}

export interface ToolMessage {
  title: string
  text: string
}

/** A value the tool needs typed in (a radius, a side count) before it can finish. */
export interface ToolQuestion {
  title: string
  label: string
  initial: string
  /** Finish with the typed text; an outcome that is not completed leaves the drafts to be cancelled. */
  answer(text: string): ToolOutcome
}

export interface ToolOutcome {
  /** Document membership or selection changed. */
  changed: boolean
  /** A construction was added; the caller records one history step. */
  completed: boolean
  message?: ToolMessage
  ask?: ToolQuestion
}

type IntersectableObject = Extract<GeometryDocumentObject, {
  type: 'lineWithPoints' | 'lineWithEquation' | 'verLine' | 'lineSegment' | 'ray' | 'vector' | 'circleR' | 'circle2' | 'circle3'
}>

type PointCandidate =
  | { existing: GeometryPoint }
  | { position: NumericPoint; constraint?: PointConstraint }

interface PointToolSpec {
  title: string
  count: number
  command(points: PointArgument[]): Command
}

const POINT_TOOLS: Partial<Record<ToolAction, PointToolSpec>> = {
  line: { title: 'Doğru', count: 2, command: ([A, B]) => ({ kind: 'line', A: A!, B: B! }) },
  linesegment: { title: 'Doğru Parçası', count: 2, command: ([A, B]) => ({ kind: 'segment', A: A!, B: B! }) },
  distancesegment: { title: 'Uzaklık', count: 2, command: ([A, B]) => ({ kind: 'distance', A: A!, B: B! }) },
  reflectpoint: {
    title: 'Yansıt Nokta', count: 2, command: ([point, center]) => ({ kind: 'reflect', point: point!, center: center! }),
  },
  circle2: { title: 'Çember', count: 2, command: ([A, B]) => ({ kind: 'circle2', A: A!, B: B! }) },
  circle3: { title: 'Çember', count: 3, command: ([A, B, C]) => ({ kind: 'circle3', A: A!, B: B!, C: C! }) },
  angle: { title: 'Açı', count: 3, command: ([A, B, C]) => ({ kind: 'angle', A: A!, B: B!, C: C! }) },
  midpoint: { title: 'Orta Nokta', count: 2, command: ([A, B]) => ({ kind: 'midpoint', A: A!, B: B! }) },
  ray: { title: 'Işın', count: 2, command: ([A, B]) => ({ kind: 'ray', A: A!, B: B! }) },
  bisector: { title: 'Kenar Orta Dikmesi', count: 2, command: ([A, B]) => ({ kind: 'bisector', A: A!, B: B! }) },
  anglebisector: { title: 'Açıortay', count: 3, command: ([A, B, C]) => ({ kind: 'angleBisector', A: A!, B: B!, C: C! }) },
  // The 90° becomes the rotation's slider.
  rotate: { title: 'Döndür', count: 2, command: ([point, center]) => ({ kind: 'rotate', point: point!, angle: 90, center: center! }) },
  translate: {
    title: 'Ötele', count: 3, command: ([point, from, to]) => ({ kind: 'translate', point: point!, from: from!, to: to! }),
  },
  vector: { title: 'Vektör', count: 2, command: ([A, B]) => ({ kind: 'vector', A: A!, B: B! }) },
  circulararc: {
    title: 'Yay', count: 3, command: ([center, A, B]) => ({ kind: 'circularArc', center: center!, A: A!, B: B! }),
  },
}

/** Tools whose first pick may be a whole object instead of a point. */
const TRANSFORM_TOOLS = new Set<ToolAction>(['reflectpoint', 'reflectline', 'rotate', 'translate'])

/** Tools that pick points and then ask for a value typed in as text. */
const ASKING_TOOLS: Partial<Record<ToolAction, { title: string; count: number; label: string; initial: string; command(names: string[], text: string): string }>> = {
  regularpolygon: {
    title: 'Düzgün Çokgen', count: 2, label: 'Köşe sayısı', initial: '5',
    command: ([A, B], text) => `DüzgünÇokgen(${A},${B},${text})`,
  },
  circleradius: {
    title: 'Çember', count: 1, label: 'Yarıçap', initial: '1',
    command: ([center], text) => `Çember(${center},${text})`,
  },
}

/** Tools that act on one object of a kind, with the command they build. */
const OBJECT_TOOLS: Partial<Record<ToolAction, { title: string; accepts(object: GeometryDocumentObject): boolean; text: string
  command(object: GeometryDocumentObject, range: { start: number; end: number }): Command }>> = {
  area: {
    title: 'Alan', text: 'Bir çokgen veya çember seçiniz.',
    accepts: object => object.type === 'polygon' || isCircle(object),
    command: object => ({ kind: 'area', object: object.name! }),
  },
  slope: {
    title: 'Eğim', text: 'Bir doğru seçiniz.',
    accepts: object => ['lineWithPoints', 'lineSegment', 'ray', 'vector', 'lineWithEquation', 'verLine'].includes(object.type),
    command: object => ({ kind: 'slope', line: object.name! }),
  },
  asymptote: {
    title: 'Asimptot', text: 'Bir fonksiyon seçiniz.',
    accepts: object => isGraphObject(object),
    command: (object, { start, end }) => ({ kind: 'asymptote', function: object.name!, start, end }),
  },
}

/** Tools that take a point and then a line. */
const POINT_LINE_TOOLS: Partial<Record<ToolAction, { title: string; command(point: PointArgument, line: string): Command }>> = {
  perpendicular: { title: 'Dik Doğru', command: (point, line) => ({ kind: 'perpendicular', point, line }) },
  parallel: { title: 'Paralel Doğru', command: (point, line) => ({ kind: 'parallel', point, line }) },
  reflectline: { title: 'Doğruya Göre Yansıt', command: (point, line) => ({ kind: 'reflect', point, center: { kind: 'reference', name: line } }) },
}

const NOTHING: ToolOutcome = { changed: false, completed: false }

function toolTitle(action: ToolAction): string {
  return POINT_TOOLS[action]?.title ?? POINT_LINE_TOOLS[action]?.title ?? action
}

export function isCircle(object: GeometryDocumentObject | null | undefined): object is GeometryCircle {
  return object?.type === 'circleR' || object?.type === 'circle2' || object?.type === 'circle3'
}

/** Lines and circles, intersected exactly. */
export function isLineOrCircle(object: GeometryDocumentObject | null | undefined): object is IntersectableObject {
  return isCircle(object) || object?.type === 'lineWithPoints' || object?.type === 'lineWithEquation'
    || object?.type === 'verLine' || object?.type === 'lineSegment' || object?.type === 'ray' || object?.type === 'vector'
}

/** Lines, circles and function graphs; graphs are intersected numerically. */
export function isIntersectable(object: GeometryDocumentObject | null | undefined): object is GeometryDocumentObject {
  return isLineOrCircle(object) || isGraphObject(object)
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
    || object?.type === 'verLine' || object?.type === 'lineSegment' || object?.type === 'ray' || object?.type === 'vector') {
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
  } else if (object && isGraphObject(object)) {
    // A point on a graph keeps its x free; its y follows the function.
    const curve = curveOf(object)
    const y = curve?.kind === 'graph' ? curve.evaluate(a) : null
    if (y !== null) return { position: { a, b: y }, constraint: { type: 'onFunction', functionId: object.id } }
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
  private current: ToolAction = 'select'
  private points: GeometryPoint[] = []
  private target: GeometryDocumentObject | null = null

  constructor(private readonly services: ToolServices) {}

  get action(): ToolAction { return this.current }
  get isConstructing(): boolean { return this.points.length > 0 || this.target !== null }

  /** Forget staged picks. The caller cancels document drafts. */
  setAction(action: ToolAction): void {
    this.current = action
    this.reset()
  }

  reset(): void {
    this.points = []
    this.target = null
  }

  press(input: ToolInput): ToolOutcome {
    // A transformation can start with a whole object instead of a point.
    const hovered = input.hit?.kind === 'object' ? input.hit.object : null
    if (TRANSFORM_TOOLS.has(this.current) && !this.points.length && !this.target && isTransformable(hovered)) {
      this.target = hovered
      this.services.document.activeId = hovered!.id
      const next = this.current === 'reflectline' ? 'Şimdi bir doğru seçiniz.' : this.current === 'translate'
        ? 'Şimdi bir vektör ya da öteleme vektörünün başlangıcını seçiniz.' : 'Şimdi merkezi seçiniz.'
      return { changed: true, completed: false, message: { title: toolTitle(this.current), text: next } }
    }
    const asking = ASKING_TOOLS[this.current]
    if (asking) return this.pressAsking(asking, input)
    const objectTool = OBJECT_TOOLS[this.current]
    if (objectTool) return this.pressObject(objectTool, input)
    switch (this.current) {
      case 'select': return NOTHING
      case 'point': return this.pressPoint(input)
      // Always at O, wherever the click is.
      case 'unitcircle': return this.finish({ kind: 'unitCircle' }, 'Birim Çember', null)
      case 'intersect': return this.pressIntersect(input)
      case 'circletangent': return this.pressCircleTangent(input)
      case 'arcmeasure': return this.pressArcMeasure(input)
      case 'root':
      case 'extremum':
      case 'inflection': return this.pressAnalysis(this.current, input)
      case 'polygon': return this.pressPolygon(input)
      case 'perpendicular':
      case 'parallel':
      case 'reflectline': return this.pressPointThenLine(POINT_LINE_TOOLS[this.current]!, input)
      default: return this.pressPointSequence(POINT_TOOLS[this.current]!, input)
    }
  }

  paintPreview(painter: TransientPainter, input: ToolInput | null): void {
    const [A, B] = this.points
    const cursor = input ? candidatePosition(pointCandidate(input)) : null
    if (this.target && TRANSFORM_TOOLS.has(this.current)) {
      this.previewConstruction(painter, input, cursor)
      return
    }
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
          const { start, end } = this.services.visibleRange()
          const points = isLineOrCircle(this.target) && isLineOrCircle(hovered)
            ? getObjectIntersection(this.target, hovered).points
            : analysisPoints('intersection', [curveOf(this.target), curveOf(hovered)], start, end)
          for (const point of points) painter.point(point)
        }
        break
      }
      case 'midpoint':
        if (A && cursor) {
          const point = numericPoint(A)
          if (point) painter.point({ a: (point.a + cursor.a) / 2, b: (point.b + cursor.b) / 2 })
        }
        break
      case 'ray':
        if (A && cursor) painter.line({ type: 'ray', A, B: cursor })
        break
      case 'vector':
        if (A && cursor) painter.vector(A, cursor)
        break
      case 'regularpolygon':
        if (A && cursor) painter.line({ type: 'lineSegment', A, B: cursor })
        break
      case 'circulararc':
        if (A && B && cursor) {
          const arc = arcData({ M: A, A: B, B: cursor })
          if (arc) painter.arc({ a: arc.m, b: arc.n }, arc.r, arc.start, arc.span)
        } else if (A && cursor) {
          painter.line({ type: 'lineSegment', A, B: cursor })
        }
        break
      case 'bisector':
      case 'anglebisector':
      case 'rotate':
      case 'translate':
      case 'perpendicular':
      case 'parallel':
      case 'reflectline':
        this.previewConstruction(painter, input, cursor)
        break
      case 'polygon':
        this.points.forEach((point, index) => {
          const next = this.points[index + 1] ?? cursor
          if (next) painter.line({ type: 'lineSegment', A: point, B: next })
        })
        break
      case 'circletangent':
        if (isCircle(this.target) && cursor) {
          const tangents = getCircleTangentLines(cursor, this.target)
          if (tangents.status) for (const line of tangents.lines) painter.line(line)
        }
        break
    }
  }

  /** Previews computed with the same constraints the construction will use. */
  private previewConstruction(painter: TransientPainter, input: ToolInput | null, cursor: NumericPoint | null): void {
    if (this.target) {
      this.previewImage(painter, input, cursor)
      return
    }
    const [A, B] = this.points
    if (!A || !cursor) return
    const cursorPoint = { type: 'point' as const, id: -1, a: cursor.a, b: cursor.b }
    const known = new Map<unknown, unknown>([[A.id, A], [B?.id, B], [-1, cursorPoint]])
    const hovered = input?.hit?.object
    if (hovered) known.set(hovered.id, hovered)
    const get = (id: unknown) => known.get(id) as GeometryDocumentObject | undefined
    const at = (constraint: PointConstraint) => constructedLocation(constraint, get)
    const lineThrough = (start: NumericPoint | null, through: NumericPoint | null) => {
      if (start && through) painter.line({ type: 'lineWithPoints', A: start, B: through })
    }
    switch (this.current) {
      case 'bisector': {
        const middle = at({ type: 'midpoint', firstId: A.id, secondId: -1 })
        lineThrough(middle, at({ type: 'lineHelper', construction: 'bisector', refs: [A.id, -1] }))
        break
      }
      case 'anglebisector':
        if (B) lineThrough(numericPoint(B), at({ type: 'lineHelper', construction: 'angleBisector', refs: [A.id, B.id, -1] }))
        else painter.line({ type: 'lineSegment', A, B: cursor })
        break
      case 'rotate': {
        const rotated = at({ type: 'rotate', sourceId: A.id, centerId: -1, angle: 90 })
        if (rotated) painter.point(rotated)
        break
      }
      case 'translate': {
        if (hovered?.type === 'vector') {
          const moved = at({ type: 'translate', sourceId: A.id, fromId: null, toId: null, vectorId: hovered.id })
          if (moved) painter.point(moved)
          break
        }
        if (!B) {
          painter.point(cursor)
          break
        }
        const moved = at({ type: 'translate', sourceId: A.id, fromId: B.id, toId: -1 })
        painter.line({ type: 'lineSegment', A: B, B: cursor })
        if (moved) painter.point(moved)
        break
      }
      case 'perpendicular':
      case 'parallel':
        if (isLineObject(hovered)) lineThrough(numericPoint(A), at({ type: 'lineHelper', construction: this.current, refs: [A.id, hovered!.id] }))
        break
      case 'reflectline':
        if (isLineObject(hovered)) {
          const reflected = at({ type: 'reflectLine', sourceId: A.id, lineId: hovered!.id })
          if (reflected) painter.point(reflected)
        }
        break
    }
  }

  /** The image of the staged object under the transformation the cursor completes. */
  private previewImage(painter: TransientPainter, input: ToolInput | null, cursor: NumericPoint | null): void {
    const target = this.target!
    const [B] = this.points
    const hovered = input?.hit?.object
    const known = new Map<unknown, unknown>([[B?.id, B]])
    if (cursor) known.set(-1, { type: 'point', id: -1, a: cursor.a, b: cursor.b })
    if (hovered) known.set(hovered.id, hovered)
    let constraint: (sourceId: number) => PointConstraint
    switch (this.current) {
      case 'reflectpoint':
        constraint = sourceId => ({ type: 'reflectPoint', sourceId, centerId: -1 })
        break
      case 'rotate':
        constraint = sourceId => ({ type: 'rotate', sourceId, centerId: -1, angle: 90 })
        break
      case 'reflectline':
        if (!isLineObject(hovered) || hovered!.id === target.id) return
        constraint = sourceId => ({ type: 'reflectLine', sourceId, lineId: hovered!.id })
        break
      case 'translate':
        if (hovered?.type === 'vector') constraint = sourceId => ({ type: 'translate', sourceId, fromId: null, toId: null, vectorId: hovered.id })
        else if (B && cursor) {
          painter.line({ type: 'lineSegment', A: B, B: cursor })
          constraint = sourceId => ({ type: 'translate', sourceId, fromId: B.id, toId: -1 })
        } else return
        break
      default:
        return
    }
    if (!cursor && this.current !== 'reflectline' && hovered?.type !== 'vector') return
    const image = (point: NumericPoint | null) => {
      if (!point) return null
      known.set(-2, { type: 'point', id: -2, a: point.a, b: point.b })
      return constructedLocation(constraint(-2), id => known.get(id) as GeometryDocumentObject | undefined)
    }
    const segment = (P: NumericPoint | null, Q: NumericPoint | null, type: 'lineWithPoints' | 'lineSegment' | 'ray' = 'lineSegment') => {
      if (P && Q) painter.line({ type, A: P, B: Q })
    }
    switch (target.type) {
      case 'lineWithPoints':
      case 'lineSegment':
      case 'ray':
        segment(image(numericPoint(target.A)), image(numericPoint(target.B)), target.type)
        break
      case 'vector': {
        const P = image(numericPoint(target.A))
        const Q = image(numericPoint(target.B))
        if (P && Q) painter.vector(P, Q)
        break
      }
      case 'lineWithEquation':
      case 'verLine': {
        const line = getLineDescriptor(target)
        if (line.status) {
          segment(image(line.origin), image({ a: line.origin.a + line.direction.a, b: line.origin.b + line.direction.b }), 'lineWithPoints')
        }
        break
      }
      case 'circleR':
      case 'circle2':
      case 'circle3': {
        const circle = getCircleDescriptor(target)
        if (!circle.status) break
        const center = image({ a: circle.m, b: circle.n })
        const rim = image({ a: circle.m + circle.r, b: circle.n })
        if (center && rim) painter.circle({ type: 'circle2', A: center, B: rim })
        break
      }
      case 'polygon': {
        const vertices = target.points.map(point => image(numericPoint(point)))
        vertices.forEach((vertex, index) => segment(vertex, vertices[(index + 1) % vertices.length]!))
        break
      }
      case 'circularArc':
        for (const point of [target.M, target.A, target.B]) {
          const moved = image(numericPoint(point))
          if (moved) painter.point(moved)
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
    // A staged object is the first argument of a transformation.
    const first = this.target ? [{ kind: 'reference', name: this.target.name! } as PointArgument] : []
    const hovered = input.hit?.kind === 'object' ? input.hit.object : null
    if (this.current === 'translate' && hovered?.type === 'vector' && first.length + this.points.length === 1
      && hovered.id !== this.target?.id) {
      const [source] = [...first, ...this.points.map(reference)]
      return this.finish({ kind: 'translateVector', point: source!, vector: hovered.name! }, spec.title, null)
    }
    const candidate = pointCandidate(input)
    if ('existing' in candidate && this.points.includes(candidate.existing)) {
      return { ...NOTHING, message: { title: spec.title, text: 'Farklı bir nokta seçiniz.' } }
    }
    const last = first.length + this.points.length + 1 === spec.count
    const { point, created } = this.materialize(candidate, true)
    if (!last) {
      this.points.push(point)
      return { changed: created, completed: false }
    }
    return this.finish(spec.command([...first, ...[...this.points, point].map(reference)]), spec.title, created ? point : null)
  }

  /** Points, then a value typed in; the command is built as text so the value may name parameters. */
  private pressAsking(spec: NonNullable<(typeof ASKING_TOOLS)[ToolAction]>, input: ToolInput): ToolOutcome {
    const candidate = pointCandidate(input)
    if ('existing' in candidate && this.points.includes(candidate.existing)) {
      return { ...NOTHING, message: { title: spec.title, text: 'Farklı bir nokta seçiniz.' } }
    }
    const { point, created } = this.materialize(candidate, true)
    this.points.push(point)
    if (this.points.length < spec.count) return { changed: created, completed: false }
    const names = this.points.map(item => item.name!)
    return {
      changed: true, completed: false,
      ask: {
        title: spec.title, label: spec.label, initial: spec.initial,
        answer: text => {
          const parsed = parseCommand(spec.command(names, text.trim() || spec.initial))
          if (!parsed.ok) return { ...NOTHING, message: { title: spec.title, text: parsed.error } }
          return this.finish(parsed.command, spec.title, null)
        },
      },
    }
  }

  /** One click on an object of the right kind. */
  private pressObject(spec: NonNullable<(typeof OBJECT_TOOLS)[ToolAction]>, input: ToolInput): ToolOutcome {
    const object = input.hit?.object
    if (!object || !spec.accepts(object)) return { ...NOTHING, message: { title: spec.title, text: spec.text } }
    return this.finish(spec.command(object, this.services.visibleRange()), spec.title, null)
  }

  /** A point first (picked like any point), then a line, which is not turned into a point. */
  private pressPointThenLine(spec: { title: string; command(point: PointArgument, line: string): Command }, input: ToolInput): ToolOutcome {
    const [point] = this.points
    if (this.target) {
      const object = input.hit?.object
      if (!isLineObject(object) || object!.id === this.target.id) return { ...NOTHING, message: { title: spec.title, text: 'Bir doğru seçiniz.' } }
      return this.finish(spec.command({ kind: 'reference', name: this.target.name! }, object!.name!), spec.title, null)
    }
    if (!point) {
      const { point: picked, created } = this.materialize(pointCandidate(input), true)
      this.points = [picked]
      return { changed: created, completed: false, message: { title: spec.title, text: 'Şimdi bir doğru seçiniz.' } }
    }
    const object = input.hit?.object
    if (!isLineObject(object)) return { ...NOTHING, message: { title: spec.title, text: 'Bir doğru seçiniz.' } }
    return this.finish(spec.command(reference(point), object!.name!), spec.title, null)
  }

  /** Vertices in order; picking the first vertex again closes the polygon. */
  private pressPolygon(input: ToolInput): ToolOutcome {
    const title = 'Çokgen'
    const candidate = pointCandidate(input)
    if ('existing' in candidate && candidate.existing === this.points[0] && this.points.length >= 3) {
      return this.finish({ kind: 'polygon', points: this.points.map(reference) }, title, null)
    }
    if ('existing' in candidate && this.points.includes(candidate.existing)) {
      return { ...NOTHING, message: { title, text: 'Farklı bir nokta seçiniz ya da kapatmak için ilk köşeye tıklayınız.' } }
    }
    const { point, created } = this.materialize(candidate, true)
    this.points.push(point)
    return {
      changed: created, completed: false,
      ...(this.points.length === 3 ? { message: { title, text: 'Kapatmak için ilk köşeye tıklayınız.' } } : {}),
    }
  }

  private pressAnalysis(action: 'root' | 'extremum' | 'inflection', input: ToolInput): ToolOutcome {
    const title = action === 'root' ? 'Kök' : action === 'extremum' ? 'Ekstremum' : 'Dönüm Noktası'
    const object = input.hit?.object
    if (!object || !isGraphObject(object)) return { ...NOTHING, message: { title, text: 'Bir fonksiyon seçiniz.' } }
    const { start, end } = this.services.visibleRange()
    return this.finish({ kind: action, function: object.name!, start, end }, title, null)
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
    const { start, end } = this.services.visibleRange()
    return this.finish({ kind: 'intersect', first: this.target.name!, second: object.name!, start, end }, title, null)
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
