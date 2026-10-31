import { createGeometryModels } from '../geometry/models'
import { createFunctionModels } from '../geometry/function-models'
import { getCircleDescriptor, getLineDescriptor, getAngleMeasure, getReflectedPoint,
  isPointOnCircleData, numericPoint } from '../geometry/primitives'
import { getObjectIntersection, isIntersectableLine, isIntersectableCircle } from '../geometry/intersections'
import { analysisPoints, curveOf, isGraphObject } from '../geometry/analysis'
import { getCircleTangentLines } from '../geometry/tangents'
import { constructedLocation, isLineObject } from '../geometry/constructions'
import type {
  AnalysisKind, GeometryCircle, GeometryPoint, ImageOf, LineConstructionKind, LineWithPoints, ObjectReference, PointConstraint,
  TransformKind, Vector,
} from '../geometry/types'
import type { FunctionSection, GeometryDocumentObject, Parameter, VectorMeasure } from '../geometry/function-types'
import { definitionNames } from './definition'
import { createObjectName } from './names'
import {
  classifyAffineExpression, evaluateNumericExpression, isReservedName, parameterValues, parseCurveExpression,
  parseFunctionExpression, parseTwoVariableExpression, resolveComposition,
} from './expressions'
import type { Command, NumberArgument, PointArgument } from './types'
import { vectorCombination } from './vector-expressions'
import { emptySection, mentions, parseCommand } from './parser'

export interface CommandPreparationOptions {
  /** First unused identifier. Neither this value nor the document is mutated. */
  nextId: number
  randomColor(): string
  /** Where analysis commands without a range search; the visible x range in the app. */
  range?: { start: number; end: number }
}

const DEFAULT_RANGE = { start: -10, end: 10 }
const MAX_SIDES = 30
const TRANSFORMABLE = new Set<GeometryDocumentObject['type']>([
  'lineWithPoints', 'lineSegment', 'ray', 'vector', 'lineWithEquation', 'verLine', 'circleR', 'circle2', 'circle3',
  'polygon', 'circularArc',
])
const LINE_MEASURED = new Set<GeometryDocumentObject['type']>([
  'lineWithPoints', 'lineSegment', 'ray', 'vector', 'lineWithEquation', 'verLine',
])

/** Objects a transformation command turns into an image object of their own kind. */
export function isTransformable(object: GeometryDocumentObject | null | undefined): boolean {
  return object !== null && object !== undefined && TRANSFORMABLE.has(object.type)
}

const isExpression = (argument: NumberArgument | undefined) => argument !== undefined && typeof argument !== 'number'
const ANALYSIS_KINDS = { root: 'root', extremum: 'extremum', inflection: 'inflection', intersect: 'intersection' } as const

export type PreparedCommand =
  | { ok: true; objects: GeometryDocumentObject[]; activeId: number; nextId: number }
  | { ok: false; error: string }

interface ParameterRange {
  min: number
  max: number
  step: number
}

const PARAMETER_NAME = /^[\p{L}][\p{L}\p{N}_]*$/u

/** A slider covers -5…5 in steps of 0.1 and grows to include its starting value. */
function defaultRange(value: number): ParameterRange {
  return { min: Math.min(-5, Math.floor(value)), max: Math.max(5, Math.ceil(value)), step: 0.1 }
}

/** Prepare a complete construction before the caller commits it to the document. */
export function prepareCommand(command: Command, document: readonly GeometryDocumentObject[], options: CommandPreparationOptions): PreparedCommand {
  if (!Number.isSafeInteger(options.nextId) || options.nextId < 0) {
    return { ok: false, error: 'Nesne kimliği geçersiz.' }
  }
  let nextId = options.nextId
  const objects: GeometryDocumentObject[] = []
  const allObjects = () => [...document, ...objects]
  const context = {
    createName: (group: Parameters<typeof createObjectName>[0]) => createObjectName(group, allObjects().map(object => object.name)),
    nextId: () => {
      if (!Number.isSafeInteger(nextId + 1)) throw new Error('Nesne kimliği sınırına ulaşıldı.')
      return nextId++
    },
    randomColor: options.randomColor,
  }
  const models = createGeometryModels(context)
  const functions = createFunctionModels({
    ...context,
    createPoint: (a, b, temp) => new models.mPoint(a, b, temp),
    createLineWithPoints: (A, B, temp) => new models.mLineWithPoints(A, B, temp),
  })
  function add<Object extends GeometryDocumentObject>(object: Object): Object {
    objects.push(object)
    return object
  }
  /** Parameters created for this command; their presence always records a definition. */
  let createdParameters = false
  function value(argument: NumberArgument): number {
    return typeof argument === 'number' ? argument
      : evaluateNumericExpression(argument.expression, { references: allObjects() }).value
  }
  function isParameterName(name: string): boolean {
    return allObjects().some(object => object.type === 'parameter' && object.name === name)
  }
  function addParameter(start: number, preferredName: string | null, range: ParameterRange): Parameter {
    const occupied = new Set(allObjects().map(object => object.name))
    const name = preferredName !== null && !occupied.has(preferredName) ? preferredName : context.createName('parameter')
    createdParameters = true
    return add({
      type: 'parameter', name, id: context.nextId(), color: options.randomColor(),
      visibility: true, size: 1, temp: false, value: start,
      min: Math.min(range.min, start), max: Math.max(range.max, start), step: range.step,
    })
  }
  /** A typed constant becomes a slider the construction depends on; an expression stays as typed. */
  function sliderArgument(argument: NumberArgument | undefined, start: number, preferredName: string | null,
    range: ParameterRange): NumberArgument {
    if (argument !== undefined && typeof argument !== 'number') return argument
    const parameter = addParameter(argument ?? start, preferredName, range)
    return { expression: parameter.name! }
  }
  function resolvePoint(argument: PointArgument, reuseCoordinates = false): GeometryPoint {
    if (argument.kind === 'reference') {
      const point = allObjects().find(object => object.type === 'point' && object.name === argument.name)
      if (!point || point.type !== 'point' || !numericPoint(point)) throw new Error(`Nokta bulunamadı: ${argument.name}`)
      return point
    }
    const a = value(argument.a)
    const b = value(argument.b)
    const definition: Command = { kind: 'point', point: { a: argument.a, b: argument.b } }
    const dependent = definitionNames(definition, allObjects()).size > 0
    if (reuseCoordinates && !dependent) {
      const point = allObjects().find(object => object.type === 'point' && object.geometryValid !== false
        && Number(object.a) === a && Number(object.b) === b)
      if (point && point.type === 'point') return point
    }
    const point: GeometryPoint = add(new models.mPoint(a, b))
    if (dependent) point.definition = definition
    return point
  }
  const reference = (point: GeometryPoint): PointArgument => ({ kind: 'reference', name: point.name! })
  function searchRange(start: NumberArgument | undefined, end: NumberArgument | undefined): { start: number; end: number } {
    const range = start === undefined || end === undefined ? options.range ?? DEFAULT_RANGE : { start: value(start), end: value(end) }
    if (!(range.end > range.start)) throw new Error('Arama aralığının başlangıcı bitişinden küçük olmalı.')
    return range
  }
  /** A function graph y = f(x) from its expression: a line when affine for every parameter value. */
  function functionObject(command: Extract<Command, { kind: 'function' }>): GeometryDocumentObject {
    const source = expression(command.expression)
    const line = affine(command.expression)
    return add(line ? new functions.mLineWithEquation(line.m, line.n) : new functions.mFunction(source))
  }
  /** An object given by name, or an expression that is drawn as a new function first. */
  function sourceObject(source: string): GeometryDocumentObject {
    const named = allObjects().find(object => object.name === source)
    if (named) return named
    if (/^[\p{L}_][\p{L}\p{N}_']*$/u.test(source) && !isReservedName(source) && source !== 'x') {
      throw new Error(`Nesne bulunamadı: ${source}`)
    }
    const parsed = parseCommand(source)
    if (!parsed.ok || parsed.command.kind !== 'function') throw new Error(`Bir fonksiyon girin: ${source}`)
    const object = functionObject(parsed.command)
    if (definitionNames(parsed.command, allObjects()).size > 0) object.definition = parsed.command
    return object
  }
  function graphObject(source: string): GeometryDocumentObject {
    const object = sourceObject(source)
    if (!isGraphObject(object)) throw new Error(`Bir fonksiyon girin: ${source}`)
    return object
  }
  /** The non-point object a transformation is applied to, or null when it is applied to a point. */
  function transformSource(argument: PointArgument): GeometryDocumentObject | null {
    if (argument.kind !== 'reference') return null
    const object = allObjects().find(item => item.name === argument.name)
    if (!object || object.type === 'point') return null
    if (!isTransformable(object)) throw new Error(`Bu nesne dönüştürülemez: ${argument.name}`)
    return object
  }
  function imageConstraint(image: ImageOf, sourceId: ObjectReference, ownerId: ObjectReference, pointIndex: number): PointConstraint {
    const [first = null, second = null] = image.refs
    switch (image.kind) {
      case 'reflectPoint': return { type: 'reflectPoint', sourceId, centerId: first, ownerId, pointIndex }
      case 'reflectLine': return { type: 'reflectLine', sourceId, lineId: first, ownerId, pointIndex }
      case 'rotate': return { type: 'rotate', sourceId, centerId: first, angle: image.angle ?? 0, ownerId, pointIndex }
      case 'translate': return image.refs.length === 1
        ? { type: 'translate', sourceId, fromId: null, toId: null, vectorId: first, ownerId, pointIndex }
        : { type: 'translate', sourceId, fromId: first, toId: second, ownerId, pointIndex }
    }
  }
  /**
   * The image of a line, vector, circle, arc or polygon: an object of the same kind
   * through hidden helper points, each the image of a point of the source.
   */
  function transformObject(source: GeometryDocumentObject, kind: TransformKind, refs: ObjectReference[], angle?: number): GeometryDocumentObject {
    const id = context.nextId()
    const imageOf: ImageOf = { kind, sourceId: source.id, refs, ...(angle === undefined ? {} : { angle }) }
    let index = 0
    const image = (point: GeometryPoint) => helperPoint(imageConstraint(imageOf, point.id, id, index++))
    const anchor = (position: number) => helperPoint({ type: 'anchor', objectId: source.id, index: position, ownerId: id, pointIndex: index++ })
    const base = {
      name: primeName(source), id, color: options.randomColor(), visibility: true, size: source.size, temp: false, imageOf,
    }
    let result: GeometryDocumentObject
    switch (source.type) {
      case 'lineWithPoints':
        result = { ...base, type: 'lineWithPoints', A: image(source.A), B: image(source.B) }
        break
      case 'lineSegment':
        result = { ...base, type: 'lineSegment', A: image(source.A), B: image(source.B), lineDash: [] }
        break
      case 'ray':
      case 'vector':
        result = { ...base, type: source.type, A: image(source.A), B: image(source.B) }
        break
      case 'lineWithEquation':
      case 'verLine': {
        const origin = anchor(0)
        const along = anchor(1)
        result = { ...base, type: 'lineWithPoints', A: image(origin), B: image(along) }
        break
      }
      case 'circleR':
        result = { ...base, type: 'circle2', A: image(source.A), B: image(anchor(1)) }
        break
      case 'circle2':
        result = { ...base, type: 'circle2', A: image(source.A), B: image(source.B) }
        break
      case 'circle3':
        result = { ...base, type: 'circle3', A: image(source.A), B: image(source.B), C: image(source.C) }
        break
      case 'polygon':
        result = { ...base, type: 'polygon', points: source.points.map(image) }
        break
      case 'circularArc': {
        // A reflection reverses the direction of the arc.
        const reflected = kind === 'reflectLine'
        const M = image(source.M)
        const A = image(source.A)
        const B = image(source.B)
        result = { ...base, type: 'circularArc', M, A: reflected ? B : A, B: reflected ? A : B }
        break
      }
      default:
        throw new Error(`Bu nesne dönüştürülemez: ${source.name}`)
    }
    return add(result)
  }
  const lookup = (id: ObjectReference | undefined) => allObjects().find(object => object.id === id)
  /** A constructed point placed where its constraint puts it. */
  function constructedPoint(constraint: PointConstraint): GeometryPoint {
    const location = constructedLocation(constraint, lookup)
    const point: GeometryPoint = add(new models.mPoint(location?.a ?? NaN, location?.b ?? NaN))
    if (!location) point.geometryValid = false
    point.onOther.push(constraint)
    return point
  }
  /** A hidden, unnamed point that only gives a constructed line its position or direction. */
  function helperPoint(constraint: PointConstraint): GeometryPoint {
    const point = constructedPoint(constraint)
    point.name = null
    point.hideInLabels = true
    point.visibility = false
    return point
  }
  function freeName(name: string): string {
    if (!PARAMETER_NAME.test(name) || isReservedName(name)) throw new Error(`Ad olarak kullanılamaz: ${name}`)
    if (allObjects().some(object => object.name === name)) throw new Error(`Bu ad başka bir nesnede kullanılıyor: ${name}`)
    return name
  }
  /** The vector or point an expression stands for, or null when it names no vector. */
  function vectorResult(expression: string, name: string | null): GeometryDocumentObject | null {
    const combination = vectorCombination(expression, allObjects())
    if (!combination) return null
    const preferred = name === null ? null : freeName(name)
    const { point, first, terms } = combination
    if (point) {
      const moved = constructedPoint({ type: 'vectorSum', baseId: point.id, terms })
      if (preferred !== null) moved.name = preferred
      moved.vectorExpression = expression
      return moved
    }
    const id = context.nextId()
    // The result starts where the first vector starts, so the two are seen together.
    const B = helperPoint({ type: 'vectorSum', baseId: first.A.id, terms, ownerId: id, pointIndex: 0 })
    return add({ type: 'vector', name: preferred ?? context.createName('vector'), id, A: first.A, B, vectorExpression: expression,
      color: options.randomColor(), visibility: true, size: 2, temp: false })
  }
  /** A vector given by name, or an expression that is drawn as a new vector first. */
  function vectorArgument(source: string): Vector {
    const named = allObjects().find(object => object.name === source)
    const object = named ?? vectorResult(source, null)
    if (object?.type !== 'vector') throw new Error(`Bir vektör girin: ${source}`)
    const definition: Command = { kind: 'vectorExpression', name: null, expression: source }
    if (!named && definitionNames(definition, allObjects()).size > 0) object.definition = definition
    return object
  }
  function primeName(source: GeometryDocumentObject): string {
    const names = new Set(allObjects().map(object => object.name))
    const base = `${source.name}'`
    let name = base
    for (let index = 1; names.has(name); index++) name = base + index
    return name
  }
  /** A line through `A` and the hidden helper(s), which belong to it. */
  function constructedLine(A: GeometryPoint, B: GeometryPoint, kind: LineConstructionKind,
    refs: ObjectReference[], helpers: GeometryPoint[]): GeometryDocumentObject {
    const line: LineWithPoints = new models.mLineWithPoints(A, B)
    line.construction = { kind, refs }
    for (const helper of helpers) {
      const constraint = helper.onOther[0]
      if (constraint?.type === 'lineHelper' || constraint?.type === 'midpoint') constraint.ownerId = line.id
    }
    if (!getLineDescriptor(line).status) throw new Error('Doğru tanımlanamadı.')
    return add(line)
  }

  /** One point per result, ordered by x; at least one, which stays undefined until a result exists. */
  function analysisPointsFor(analysis: AnalysisKind, sources: GeometryDocumentObject[], range: { start: number; end: number }): GeometryPoint {
    const found = analysisPoints(analysis, sources.map(curveOf), range.start, range.end)
    const points: GeometryPoint[] = []
    for (let index = 0; index < Math.max(1, found.length); index++) {
      const location = found[index]
      const point: GeometryPoint = add(new models.mPoint(location?.a ?? NaN, location?.b ?? NaN))
      if (!location) point.geometryValid = false
      if (index === 0) {
        point.intersectionOwner = true
        point.intersectionStatus = found.length ? 'points' : 'empty'
      } else {
        point.hideInLabels = true
      }
      point.onOther.push({ type: 'analysisPoint', analysis, sourceIds: sources.map(source => source.id), pointIndex: index,
        start: range.start, end: range.end, ...(index > 0 ? { ownerId: points[0]!.id } : {}) })
      points.push(point)
    }
    points[0]!.intersectionPointIds = points.map(point => point.id)
    return points[0]!
  }
  function namedObject(name: string): GeometryDocumentObject {
    const object = allObjects().find(object => object.name === name)
    if (!object) throw new Error(`Nesne bulunamadı: ${name}`)
    return object
  }
  function namedCircle(name: string): GeometryCircle {
    const circle = namedObject(name)
    if (!isIntersectableCircle(circle) || !getCircleDescriptor(circle).status) throw new Error(`Çember geçerli değil: ${name}`)
    // The document union narrows by its discriminant; the boundary guard also validates restored data.
    if (circle.type !== 'circleR' && circle.type !== 'circle2' && circle.type !== 'circle3') throw new Error('Çember bulunamadı.')
    return circle
  }
  function expression(source: string, depth = 0): string {
    if (depth > 16) throw new Error('Bileşke çok fazla iç içe geçmiş.')
    const parsed = parseCommand(source)
    if (parsed.ok && parsed.command.kind === 'composition') {
      return resolveComposition(parsed.command.expressions.map(part => expression(part, depth + 1)), { references: allObjects() }).expression
    }
    return parseFunctionExpression(source, { references: allObjects() })
  }
  /** Affine in x for every parameter value: decided with the parameters kept as symbols. */
  function affine(source: string) {
    const symbolic = parseFunctionExpression(source, { references: allObjects(), keepParameters: true })
    return classifyAffineExpression(symbolic, parameterValues(allObjects()))
  }
  function circleRadius(A: GeometryPoint, radius: NumberArgument): { circle: GeometryDocumentObject; definition: Command } {
    const r = value(radius)
    if (r < 0) throw new Error('Yarıçap negatif olamaz.')
    return { circle: add(new models.mCircleR(A, r)), definition: { kind: 'circleRadius', center: reference(A), radius } }
  }

  let active: GeometryDocumentObject
  /** Normalized command for objects whose values can depend on parameters or functions. */
  let definition: Command | null = null
  try {
    switch (command.kind) {
      case 'point': {
        const point = resolvePoint({ kind: 'coordinates', a: command.point.a, b: command.point.b })
        active = point
        definition = point.definition ?? null
        break
      }
      case 'namedCoordinates': {
        const name = freeName(command.name)
        const end: PointArgument = { kind: 'coordinates', a: command.a, b: command.b }
        if (/^\p{Lu}/u.test(name)) {
          const point = resolvePoint(end)
          point.name = name
          active = point
          definition = point.definition ?? null
          break
        }
        const A = resolvePoint({ kind: 'coordinates', a: 0, b: 0 }, true)
        const B = resolvePoint(end)
        if (Number(A.a) === Number(B.a) && Number(A.b) === Number(B.b)) throw new Error('Sıfır vektörü çizilemez.')
        active = add({ type: 'vector', name, id: context.nextId(), A, B,
          color: options.randomColor(), visibility: true, size: 2, temp: false })
        break
      }
      case 'vectorExpression': {
        const result = vectorResult(command.expression, command.name)
        if (!result) throw new Error('İfadede vektör bulunamadı.')
        active = result
        definition = command
        break
      }
      case 'parameter': {
        const { name } = command
        const vectors = typeof command.value === 'number' ? null : vectorResult(command.value.expression, name)
        if (vectors && typeof command.value !== 'number') {
          active = vectors
          definition = { kind: 'vectorExpression', name, expression: command.value.expression }
          break
        }
        if (!PARAMETER_NAME.test(name) || isReservedName(name)) throw new Error(`Parametre adı olarak kullanılamaz: ${name}`)
        if (allObjects().some(object => object.name === name)) throw new Error(`Bu ad başka bir nesnede kullanılıyor: ${name}`)
        const start = value(command.value)
        const parameter = addParameter(start, name, defaultRange(start))
        active = parameter
        definition = command
        // Only a computed parameter keeps a definition; a slider is its own value.
        createdParameters = false
        break
      }
      case 'verticalLine':
        active = add(new functions.mVerLine(value(command.x)))
        definition = command
        break
      case 'circleRadius': {
        const A = resolvePoint(command.center)
        const result = circleRadius(A, command.radius)
        active = result.circle
        definition = result.definition
        break
      }
      case 'circle2': {
        const A = resolvePoint(command.A)
        // Çember(A, r) with a parameter r is a radius, not a second point.
        if (command.B.kind === 'reference' && isParameterName(command.B.name)) {
          const result = circleRadius(A, { expression: command.B.name })
          active = result.circle
          definition = result.definition
          break
        }
        const B = resolvePoint(command.B)
        const circle = new models.mCircle2(A, B)
        if (!getCircleDescriptor(circle).status) throw new Error('Çember tanımlanamadı.')
        active = add(circle)
        break
      }
      case 'circle3': {
        const A = resolvePoint(command.A)
        const B = resolvePoint(command.B)
        const C = resolvePoint(command.C)
        const circle = new models.mCircle3(A, B, C)
        if (!getCircleDescriptor(circle).status) throw new Error('Üç nokta aynı doğru üzerinde; çember tanımlanamadı.')
        active = add(circle)
        break
      }
      case 'line':
      case 'segment':
      case 'distance': {
        const A = resolvePoint(command.A)
        const B = resolvePoint(command.B)
        const line = command.kind === 'line' ? new models.mLineWithPoints(A, B)
          : command.kind === 'segment' ? new models.mLineSegment(A, B) : new models.mDistanceSegment(A, B)
        if (!getLineDescriptor(line).status) throw new Error('İki farklı nokta gereklidir.')
        active = add(line)
        break
      }
      case 'angle': {
        const A = resolvePoint(command.A)
        const B = resolvePoint(command.B)
        const C = resolvePoint(command.C)
        const angle = new models.mAngle(A, B, C)
        if (!Number.isFinite(getAngleMeasure(angle))) throw new Error('Açının kolları tanımlanamadı.')
        active = add(angle)
        break
      }
      case 'midpoint': {
        const A = resolvePoint(command.A)
        const B = resolvePoint(command.B)
        active = constructedPoint({ type: 'midpoint', firstId: A.id, secondId: B.id })
        break
      }
      case 'ray': {
        const A = resolvePoint(command.A)
        const B = resolvePoint(command.B)
        const ray: GeometryDocumentObject = { type: 'ray', name: context.createName('line'), id: context.nextId(), A, B,
          color: options.randomColor(), visibility: true, size: 2, temp: false }
        if (!getLineDescriptor(ray).status) throw new Error('İki farklı nokta gereklidir.')
        active = add(ray)
        break
      }
      case 'perpendicular':
      case 'parallel': {
        const P = resolvePoint(command.point)
        const line = namedObject(command.line)
        if (!isLineObject(line)) throw new Error(`Bir doğru girin: ${command.line}`)
        const refs = [P.id, line.id]
        const helper = helperPoint({ type: 'lineHelper', construction: command.kind, refs })
        active = constructedLine(P, helper, command.kind, refs, [helper])
        break
      }
      case 'bisector': {
        const A = resolvePoint(command.A)
        const B = resolvePoint(command.B)
        const refs = [A.id, B.id]
        const middle = helperPoint({ type: 'midpoint', firstId: A.id, secondId: B.id })
        const helper = helperPoint({ type: 'lineHelper', construction: 'bisector', refs })
        active = constructedLine(middle, helper, 'bisector', refs, [middle, helper])
        break
      }
      case 'angleBisector': {
        const A = resolvePoint(command.A)
        const B = resolvePoint(command.B)
        const C = resolvePoint(command.C)
        const refs = [A.id, B.id, C.id]
        const helper = helperPoint({ type: 'lineHelper', construction: 'angleBisector', refs })
        active = constructedLine(B, helper, 'angleBisector', refs, [helper])
        break
      }
      case 'polygon': {
        const points = command.points.map(argument => resolvePoint(argument))
        if (new Set(points).size !== points.length) throw new Error('Çokgenin köşeleri farklı olmalı.')
        active = add({ type: 'polygon', name: context.createName('polygon'), id: context.nextId(), points,
          color: options.randomColor(), visibility: true, size: 2, temp: false })
        break
      }
      case 'rotate': {
        const target = transformSource(command.point)
        const source = target ?? resolvePoint(command.point, true)
        const center = resolvePoint(command.center, true)
        const angle = sliderArgument(command.angle, 90, null, { min: 0, max: 360, step: 1 })
        if (target) {
          active = transformObject(target, 'rotate', [center.id], value(angle))
        } else {
          const point = constructedPoint({ type: 'rotate', sourceId: source.id, centerId: center.id, angle: value(angle) })
          point.name = primeName(source)
          active = point
        }
        definition = { kind: 'rotate', point: { kind: 'reference', name: source.name! }, angle, center: reference(center) }
        break
      }
      case 'translate': {
        const target = transformSource(command.point)
        // Points are made in argument order, so they are named in that order.
        const source = target ?? resolvePoint(command.point, true)
        const from = resolvePoint(command.from, true)
        const to = resolvePoint(command.to, true)
        if (target) {
          active = transformObject(target, 'translate', [from.id, to.id])
          break
        }
        const point = constructedPoint({ type: 'translate', sourceId: source.id, fromId: from.id, toId: to.id })
        point.name = primeName(source)
        active = point
        break
      }
      case 'translateVector': {
        const vector = namedObject(command.vector)
        if (vector.type !== 'vector') throw new Error(`Bir vektör girin: ${command.vector}`)
        const target = transformSource(command.point)
        if (target) {
          if (target.id === vector.id) throw new Error('Vektör kendisiyle ötelenemez.')
          active = transformObject(target, 'translate', [vector.id])
          break
        }
        const source = resolvePoint(command.point, true)
        const point = constructedPoint({ type: 'translate', sourceId: source.id, fromId: null, toId: null, vectorId: vector.id })
        point.name = primeName(source)
        active = point
        break
      }
      case 'reflect': {
        // Yansıt(P, d) reflects across a line; Yansıt(P, M) through a point.
        const mirror = command.center.kind === 'reference'
          ? allObjects().find(object => object.name === (command.center as { name: string }).name) : undefined
        const target = transformSource(command.point)
        if (isLineObject(mirror)) {
          if (target) {
            if (target.id === mirror!.id) throw new Error('Doğru kendisine göre yansıtılamaz.')
            active = transformObject(target, 'reflectLine', [mirror!.id])
            break
          }
          const source = resolvePoint(command.point, true)
          const point = constructedPoint({ type: 'reflectLine', sourceId: source.id, lineId: mirror!.id })
          if (point.geometryValid === false) throw new Error('Yansıma tanımlanamadı.')
          point.name = primeName(source)
          active = point
          break
        }
        if (target) {
          active = transformObject(target, 'reflectPoint', [resolvePoint(command.center, true).id])
          break
        }
        const source = resolvePoint(command.point, true)
        const center = resolvePoint(command.center, true)
        const coordinates = getReflectedPoint(source, center)
        if (!Number.isFinite(coordinates.a) || !Number.isFinite(coordinates.b)) throw new Error('Yansıma tanımlanamadı.')
        const point = new models.mPoint(coordinates.a, coordinates.b)
        const names = new Set(allObjects().map(object => object.name))
        const base = `${source.name}'`
        let name = base
        for (let index = 1; names.has(name); index++) name = base + index
        point.name = name
        point.onOther.push({ type: 'reflectPoint', sourceId: source.id, centerId: center.id })
        active = add(point)
        break
      }
      case 'root':
      case 'extremum':
      case 'inflection': {
        const source = graphObject(command.function)
        active = analysisPointsFor(ANALYSIS_KINDS[command.kind], [source], searchRange(command.start, command.end))
        // A range that names parameters follows them.
        if (isExpression(command.start) || isExpression(command.end)) definition = { ...command, function: source.name! }
        break
      }
      case 'integral': {
        const source = graphObject(command.function)
        active = add({
          type: 'integral', name: context.createName('integral'), id: context.nextId(), color: options.randomColor(),
          visibility: true, size: 1, temp: false, sourceId: source.id, start: value(command.start), end: value(command.end),
        })
        definition = { ...command, function: source.name! }
        break
      }
      case 'asymptote': {
        const source = graphObject(command.function)
        const range = searchRange(command.start, command.end)
        active = add({
          type: 'asymptote', name: context.createName('line'), id: context.nextId(), color: options.randomColor(),
          visibility: true, size: 2, temp: false, lineStyle: 'dashed', sourceId: source.id, start: range.start, end: range.end,
        })
        if (isExpression(command.start) || isExpression(command.end)) definition = { ...command, function: source.name! }
        break
      }
      case 'intersect': {
        const first = sourceObject(command.first)
        const second = sourceObject(command.second)
        // A curve that is not a line is intersected numerically, with anything that is a curve.
        const curveOnly = (object: GeometryDocumentObject) => isGraphObject(object) && object.type !== 'lineWithEquation'
        if (first.id !== second.id && (curveOnly(first) || curveOnly(second)) && curveOf(first) && curveOf(second)) {
          active = analysisPointsFor('intersection', [first, second], searchRange(command.start, command.end))
          if (isExpression(command.start) || isExpression(command.end)) definition = { ...command, first: first.name!, second: second.name! }
          break
        }
        if (first.id === second.id || !(isIntersectableLine(first) || isIntersectableCircle(first))
          || !(isIntersectableLine(second) || isIntersectableCircle(second))) throw new Error('İki farklı doğru veya çember gereklidir.')
        if (isExpression(command.start) || isExpression(command.end)) throw new Error('Doğru ve çember kesişiminde aralık kullanılmaz.')
        const intersection = getObjectIntersection(first, second)
        const points: GeometryPoint[] = []
        for (let index = 0; index < 2; index++) {
          const coordinates = intersection.points[index]
          const point = add(new models.mPoint(coordinates?.a ?? NaN, coordinates?.b ?? NaN))
          point.intersectionStatus = intersection.reason
          if (!coordinates) point.geometryValid = false
          if (index === 0) point.intersectionOwner = true
          else point.hideInLabels = true
          point.onOther.push({ type: 'intersectLines', line1Id: first.id, line2Id: second.id, pointIndex: index,
            ...(index === 1 ? { ownerId: points[0]!.id } : {}) })
          points.push(point)
        }
        points[0]!.intersectionPointIds = points.map(point => point.id)
        active = points[0]!
        break
      }
      case 'arc': {
        const A = resolvePoint({ kind: 'reference', name: command.A })
        const B = resolvePoint({ kind: 'reference', name: command.B })
        if (A.id === B.id) throw new Error('İki farklı nokta gereklidir.')
        const circle = document.find((object): object is GeometryCircle => {
          if (object.type !== 'circleR' && object.type !== 'circle2' && object.type !== 'circle3') return false
          if (command.circle !== undefined && object.name !== command.circle) return false
          const data = getCircleDescriptor(object)
          return data.status && isPointOnCircleData(A, data) && isPointOnCircleData(B, data)
        })
        if (!circle) throw new Error('Noktalar aynı çember üzerinde olmalıdır.')
        active = add(new models.mArcMeasure(A, B, circle))
        break
      }
      case 'circleTangent': {
        const circle = namedCircle(command.circle)
        const point = resolvePoint(command.point, true)
        const result = getCircleTangentLines(point, circle)
        if (!result.status) throw new Error(result.reason === 'inside' ? 'Nokta çemberin içinde; teğet çizilemez.' : 'Teğet tanımlanamadı.')
        const tangent = add(new models.mCircleTangent(point, circle))
        for (const [pointIndex, coordinates] of result.tangentPoints.entries()) {
          const touch = new models.mPoint(coordinates.a, coordinates.b)
          touch.onOther.push({ type: 'circleTangentTouchPoint', tangentId: tangent.id, pointIndex })
          add(touch)
        }
        active = tangent
        break
      }
      case 'sequence': {
        const start = value(command.start)
        const end = value(command.end)
        if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 1 || end < start) {
          throw new Error('Dizi indisleri artan sırada pozitif tam sayılar olmalı.')
        }
        const source = parseFunctionExpression(command.expression, { variable: 'n', references: allObjects() })
        active = add(new functions.mSequence(source, start, end))
        definition = command
        break
      }
      case 'limit': {
        const source = expression(command.expression)
        const at = value(command.at)
        const delta = sliderArgument(command.delta, 0.4, 'δ', { min: 0, max: 2, step: 0.01 })
        const distance = value(delta)
        const limit = add(new functions.mLimit(source, at))
        limit.approachValRight = at + distance
        limit.approachValLeft = at - distance
        active = limit
        definition = { ...command, delta }
        break
      }
      case 'tangent': {
        const source = expression(command.expression)
        const at = sliderArgument(command.at, 0, null, defaultRange(typeof command.at === 'number' ? command.at : 0))
        active = add(new functions.mTangent(source, value(at)))
        definition = { ...command, at }
        break
      }
      case 'tangentH':
      case 'tangentX': {
        const source = expression(command.expression)
        const at = sliderArgument(command.at, 0, null, defaultRange(typeof command.at === 'number' ? command.at : 0))
        const haveH = command.kind === 'tangentH'
        const h = sliderArgument(command.h, 2, haveH ? 'h' : null, haveH ? { min: 0, max: 10, step: 0.1 } : defaultRange(2))
        const tangent = add(new functions.mTangentHX(source, value(at), haveH))
        functions.updateTangentHX(tangent, value(at), value(h))
        active = tangent
        definition = { ...command, at, h }
        break
      }
      case 'derivative':
        active = add(new functions.mDerivative(expression(command.expression)))
        definition = command
        break
      case 'composition': {
        const composed = resolveComposition(command.expressions.map(part => expression(part)), { references: allObjects() })
        active = add(new functions.mFunctionComposition(composed.expressions))
        definition = command
        break
      }
      case 'function': {
        const vectors = vectorResult(command.expression, null)
        active = vectors ?? functionObject(command)
        definition = vectors ? { kind: 'vectorExpression', name: null, expression: command.expression } : command
        break
      }
      case 'vector': {
        const A = resolvePoint(command.A)
        const B = resolvePoint(command.B)
        if (A === B || (Number(A.a) === Number(B.a) && Number(A.b) === Number(B.b))) throw new Error('İki farklı nokta gereklidir.')
        active = add({ type: 'vector', name: context.createName('vector'), id: context.nextId(), A, B,
          color: options.randomColor(), visibility: true, size: 2, temp: false })
        break
      }
      case 'regularPolygon': {
        const A = resolvePoint(command.A)
        const B = resolvePoint(command.B)
        if (A === B || (Number(A.a) === Number(B.a) && Number(A.b) === Number(B.b))) throw new Error('İki farklı nokta gereklidir.')
        const sides = value(command.sides)
        if (!Number.isInteger(sides) || sides < 3 || sides > MAX_SIDES) {
          throw new Error(`Köşe sayısı 3 ile ${MAX_SIDES} arasında bir tam sayı olmalı.`)
        }
        const id = context.nextId()
        const vertices = [A, B]
        for (let index = 2; index < sides; index++) {
          vertices.push(constructedPoint({ type: 'regularVertex', firstId: A.id, secondId: B.id, sides, index, ownerId: id }))
        }
        active = add({ type: 'polygon', name: context.createName('polygon'), id, points: vertices, regular: { sides },
          color: options.randomColor(), visibility: true, size: 2, temp: false })
        break
      }
      case 'circularArc': {
        const M = resolvePoint(command.center)
        const A = resolvePoint(command.A)
        const B = resolvePoint(command.B)
        const same = (P: GeometryPoint, Q: GeometryPoint) => P === Q || (Number(P.a) === Number(Q.a) && Number(P.b) === Number(Q.b))
        if (same(M, A) || same(M, B)) throw new Error('Yayın noktaları merkezden farklı olmalı.')
        active = add({ type: 'circularArc', name: context.createName('circleR'), id: context.nextId(), M, A, B,
          color: options.randomColor(), visibility: true, size: 2, temp: false })
        break
      }
      case 'area': {
        const object = namedObject(command.object)
        if (object.type !== 'polygon' && object.type !== 'circleR' && object.type !== 'circle2' && object.type !== 'circle3') {
          throw new Error(`Bir çokgen veya çember girin: ${command.object}`)
        }
        active = add({ type: 'area', name: context.createName('measure'), id: context.nextId(), sourceId: object.id,
          color: options.randomColor(), visibility: true, size: 1, temp: false })
        break
      }
      case 'slope': {
        const object = namedObject(command.line)
        if (!LINE_MEASURED.has(object.type)) throw new Error(`Bir doğru girin: ${command.line}`)
        active = add({ type: 'slope', name: context.createName('measure'), id: context.nextId(), sourceId: object.id,
          color: options.randomColor(), visibility: true, size: 2, temp: false })
        break
      }
      case 'vectorMeasure': {
        const name = command.name === null ? context.createName(command.measure === 'angle' ? 'angle' : 'measure') : freeName(command.name)
        // Added first: a vector drawn for an expression must not take the measure's name.
        const measure: VectorMeasure = add({ type: 'vectorMeasure', measure: command.measure, name, id: context.nextId(), sourceIds: [],
          color: options.randomColor(), visibility: true, size: 2, temp: false })
        measure.sourceIds = command.vectors.map(source => vectorArgument(source).id)
        active = measure
        break
      }
      case 'curve':
      case 'polar': {
        const variable = command.kind === 'curve' ? command.variable : 'θ'
        if (isReservedName(variable) && variable !== 'x' && variable !== 'n') throw new Error(`Değişken adı olarak kullanılamaz: ${variable}`)
        const start = value(command.start)
        const end = value(command.end)
        if (!(end > start)) throw new Error('Eğrinin başlangıç değeri bitişinden küçük olmalı.')
        const references = { references: allObjects() }
        let xFunc: string
        let yFunc: string
        let polar: string | undefined
        if (command.kind === 'polar') {
          polar = parseCurveExpression(command.expression, variable, references)
          xFunc = `(${polar})*cos(x)`
          yFunc = `(${polar})*sin(x)`
        } else {
          xFunc = parseCurveExpression(command.x, variable, references)
          yFunc = parseCurveExpression(command.y, variable, references)
        }
        const typed = command.kind === 'polar' ? { x: command.expression, y: '' } : { x: command.x, y: command.y }
        active = add({ type: 'curve', name: context.createName('curve'), id: context.nextId(), xFunc, yFunc, variable, start, end,
          ...(polar === undefined ? {} : { polar }), typed, color: options.randomColor(), visibility: true, size: 2, temp: false })
        definition = command
        break
      }
      case 'unitCircle': {
        // The angle is a slider θ (θ2, θ3 … when taken) from 0° to 720°.
        const occupied = new Set(allObjects().map(object => object.name))
        let theta = 'θ'
        for (let index = 2; occupied.has(theta); index++) theta = `θ${index}`
        const angle = sliderArgument(command.angle, 30, theta, { min: 0, max: 720, step: 1 })
        active = add({ type: 'unitCircle', name: context.createName('circleR'), id: context.nextId(), angle: value(angle),
          color: options.randomColor(), visibility: true, size: 2, temp: false })
        definition = { kind: 'unitCircle', angle }
        break
      }
      case 'implicit': {
        const func = parseTwoVariableExpression(command.left, command.right, { references: allObjects() })
        active = add({ type: 'implicit', name: context.createName('curve'), id: context.nextId(), func,
          left: command.left, right: command.right, color: options.randomColor(), visibility: true, size: 2, temp: false })
        definition = command
        break
      }
      case 'inequality': {
        const references = { references: allObjects() }
        const func = parseTwoVariableExpression(command.left, command.right, references)
        const below = command.operator.startsWith('<')
        // One side alone: y against a graph of x, or x against a constant, is shaded exactly.
        let bound: { variable: 'x' | 'y'; expression: string; below: boolean } | undefined
        const sides = [[command.left, command.right, below], [command.right, command.left, !below]] as const
        for (const [alone, other, under] of sides) {
          if (alone === 'y' && !mentions(other, 'y')) bound = { variable: 'y', expression: parseFunctionExpression(other, references), below: under }
          else if (alone === 'x' && !mentions(other, 'x', 'y')) bound = { variable: 'x', expression: String(value({ expression: other })), below: under }
          if (bound) break
        }
        active = add({ type: 'inequality', name: context.createName('region'), id: context.nextId(), func, left: command.left,
          right: command.right, operator: command.operator, ...(bound ? { bound } : {}),
          color: options.randomColor(), visibility: true, size: 2, temp: false })
        definition = command
        break
      }
      case 'piecewise': {
        const sections: FunctionSection[] = command.sections.map(section => {
          const source = expression(section.expression)
          const line = affine(section.expression)
          // Bounds may name parameters.
          const startX = section.startX === null ? null : value(section.startX)
          const endX = section.endX === null ? null : value(section.endX)
          if (emptySection({ ...section, startX, endX })) throw new Error('Tanım aralığı boş olamaz.')
          const curve = line
            ? new functions.mLineWithEquation(line.m, line.n, true, startX, endX)
            : new functions.mFunction(source, true, startX, endX)
          curve.startInclusive = section.startInclusive
          curve.endInclusive = section.endInclusive
          return curve
        })
        active = add(new functions.mSectionalFunctions(command.source, sections))
        definition = command
        break
      }
    }
    if (active.id === null) throw new Error('Kalıcı nesne oluşturulamadı.')
    // Keep a definition only where values can change: it names a parameter or function,
    // or this command created the sliders it depends on.
    if (definition && (createdParameters || definitionNames(definition, allObjects()).size > 0)) {
      if (command.kind === 'parameter' && definitionNames(definition, allObjects()).has(command.name)) {
        throw new Error('Parametre kendisine başvuramaz.')
      }
      active.definition = definition
    }
    return { ok: true, objects, activeId: active.id, nextId }
  } catch (error) {
    return { ok: false, error: 'İfade oluşturulamadı. ' + (error instanceof Error ? error.message : 'Girdi geçersiz.') }
  }
}
