import { createGeometryModels } from '../geometry/models'
import { createFunctionModels } from '../geometry/function-models'
import { getCircleDescriptor, getLineDescriptor, getAngleMeasure, getReflectedPoint,
  isPointOnCircleData, numericPoint } from '../geometry/primitives'
import { getObjectIntersection, isIntersectableLine, isIntersectableCircle } from '../geometry/intersections'
import { getCircleTangentLines } from '../geometry/tangents'
import type { GeometryCircle, GeometryPoint } from '../geometry/types'
import type { FunctionSection, GeometryDocumentObject } from '../geometry/function-types'
import { createObjectName } from './names'
import { classifyAffineExpression, parseFunctionExpression, resolveComposition } from './expressions'
import type { Command, PointArgument } from './types'
import { parseCommand } from './parser'

export interface CommandPreparationOptions {
  /** First unused identifier. Neither this value nor the document is mutated. */
  nextId: number
  randomColor(): string
}

export type PreparedCommand =
  | { ok: true; objects: GeometryDocumentObject[]; activeId: number; nextId: number }
  | { ok: false; error: string }

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
  function resolvePoint(argument: PointArgument, reuseCoordinates = false): GeometryPoint {
    if (argument.kind === 'reference') {
      const point = allObjects().find(object => object.type === 'point' && object.name === argument.name)
      if (!point || point.type !== 'point' || !numericPoint(point)) throw new Error(`Nokta bulunamadı: ${argument.name}`)
      return point
    }
    if (reuseCoordinates) {
      const point = allObjects().find(object => object.type === 'point' && object.geometryValid !== false
        && Number(object.a) === argument.a && Number(object.b) === argument.b)
      if (point && point.type === 'point') return point
    }
    return add(new models.mPoint(argument.a, argument.b))
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
      return resolveComposition(parsed.command.expressions.map(part => expression(part, depth + 1)), { references: document }).expression
    }
    return parseFunctionExpression(source, { references: document })
  }
  let active: GeometryDocumentObject
  try {
    switch (command.kind) {
      case 'point':
        active = add(new models.mPoint(command.point.a, command.point.b))
        break
      case 'verticalLine':
        active = add(new functions.mVerLine(command.x))
        break
      case 'circleRadius': {
        const A = resolvePoint(command.center)
        active = add(new models.mCircleR(A, command.radius))
        break
      }
      case 'circle2': {
        const A = resolvePoint(command.A)
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
      case 'reflect': {
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
      case 'intersect': {
        const first = namedObject(command.first)
        const second = namedObject(command.second)
        if (first.id === second.id || !(isIntersectableLine(first) || isIntersectableCircle(first))
          || !(isIntersectableLine(second) || isIntersectableCircle(second))) throw new Error('İki farklı doğru veya çember gereklidir.')
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
      case 'sequence':
        active = add(new functions.mSequence(parseFunctionExpression(command.expression, { variable: 'n', references: document }), command.start, command.end))
        break
      case 'limit':
        active = add(new functions.mLimit(expression(command.expression), command.at))
        break
      case 'tangent':
        active = add(new functions.mTangent(expression(command.expression), command.at))
        break
      case 'tangentH':
      case 'tangentX':
        active = add(new functions.mTangentHX(expression(command.expression), command.at, command.kind === 'tangentH'))
        break
      case 'derivative':
        active = add(new functions.mDerivative(expression(command.expression)))
        break
      case 'composition': {
        const composed = resolveComposition(command.expressions.map(part => expression(part)), { references: document })
        active = add(new functions.mFunctionComposition(composed.expressions))
        break
      }
      case 'function': {
        const source = expression(command.expression)
        const line = classifyAffineExpression(source)
        active = add(line ? new functions.mLineWithEquation(line.m, line.n) : new functions.mFunction(source))
        break
      }
      case 'piecewise': {
        const sections: FunctionSection[] = command.sections.map(section => {
          const source = expression(section.expression)
          const line = classifyAffineExpression(source)
          const curve = line
            ? new functions.mLineWithEquation(line.m, line.n, true, section.startX, section.endX)
            : new functions.mFunction(source, true, section.startX, section.endX)
          curve.startInclusive = section.startInclusive
          curve.endInclusive = section.endInclusive
          return curve
        })
        active = add(new functions.mSectionalFunctions(command.source, sections))
        break
      }
    }
    if (active.id === null) throw new Error('Kalıcı nesne oluşturulamadı.')
    return { ok: true, objects, activeId: active.id, nextId }
  } catch (error) {
    return { ok: false, error: 'İfade oluşturulamadı. ' + (error instanceof Error ? error.message : 'Girdi geçersiz.') }
  }
}
