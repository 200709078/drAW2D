import { pointConstraint } from '../document/dependencies'
import type { GeometryDocumentObject, Tangent, TangentHX } from '../geometry/function-types'
import {
  createLineEquation, distanceAB, getAngleMeasure, getCircleDescriptor, getPositiveArcMeasure, numericPoint,
} from '../geometry/primitives'
import type { Coordinate, GeometryCircle, GeometryPoint, ObjectId } from '../geometry/types'
import { linearExpression } from '../math/function-algebra'
import { formatDisplayNumber, formatMeasure } from '../math/format-display'
import type { CoordinateBounds } from '../rendering/coordinate-transform'

export interface SliderSpec {
  min: number
  max: number
  step: number
  value: number
  label: string
}

export interface CardModel {
  input: string
  /** Each entry is one output line. */
  output: string[]
  sliders: SliderSpec[]
}

export interface CardContext {
  objects: readonly GeometryDocumentObject[]
  bounds: Readonly<CoordinateBounds>
  unitX: number
  unitY: number
}

const EMPTY = '∅'

export function formatLine(m: number, n: number, spacing = ''): string {
  const displayM = formatDisplayNumber(m)
  const displayN = formatDisplayNumber(n)
  const slope = Number(displayM)
  const intercept = Number(displayN)
  if (slope === 0) return displayN
  let result = slope === 1 ? 'x' : slope === -1 ? '-x' : `${displayM}x`
  if (intercept === 0) return result
  result += intercept > 0 ? `${spacing}+${spacing}${displayN}` : `${spacing}-${spacing}${displayN.slice(1)}`
  return result
}

function pair(point: { a: Coordinate; b: Coordinate }): string {
  return `(${formatDisplayNumber(point.a)},${formatDisplayNumber(point.b)})`
}

function pointValue(point: GeometryPoint): string {
  return point.geometryValid === false ? EMPTY : `${point.name}=${pair(point)}`
}

function circleInput(circle: GeometryCircle): string {
  switch (circle.type) {
    case 'circleR': return `${circle.name}: Çember(${circle.A.name},${circle.r})`
    case 'circle2': return `${circle.name}: Çember(${circle.A.name},${circle.B.name})`
    case 'circle3': return `${circle.name}: Çember(${circle.A.name},${circle.B.name},${circle.C.name})`
  }
}

function secantSlope(item: TangentHX): string {
  const { A, B } = item.aodLine
  const coincident = Number(A.a) === Number(B.a) && Number(A.b) === Number(B.b)
  return coincident
    ? `${item.name}'(${item.approachVal})=${formatDisplayNumber(item.tngLine.m)}`
    : formatDisplayNumber(createLineEquation(A, B).m)
}

function tangentHXOutput(item: TangentHX): string {
  const h = formatDisplayNumber(item.h)
  return item.haveH
    ? `[${item.name}(${item.approachVal}+h) - ${item.name}(${item.approachVal})] / h = ${secantSlope(item)}`
    : `[${item.name}(${h}) - ${item.name}(x₀)] /(${h}-x₀)  = ${secantSlope(item)}`
}

function tangentOutput(item: Tangent): string {
  return `${item.name}: y = ${formatLine(item.tngLine.m, item.tngLine.n)}`
}

function intersectionOutput(point: GeometryPoint, objects: readonly GeometryDocumentObject[]): string[] {
  const members = objects.filter((object): object is GeometryPoint => object.type === 'point'
    && (object.id === point.id || pointConstraint(object, 'intersectLines')?.ownerId === point.id))
  const visible = members.filter(member => numericPoint(member))
  if (visible.length) return visible.map(member => `${member.name}=${pair(member)}`)
  return [point.intersectionStatus === 'infinite' ? '∞' : EMPTY]
}

/** Presentation of one document object; reads the model and never changes it. */
export function describeCard(item: GeometryDocumentObject, context: CardContext): CardModel {
  const { objects, bounds, unitX, unitY } = context
  const nameOf = (id: ObjectId | null) => objects.find(object => object.id === id)?.name ?? '?'
  const left = bounds.left - unitY
  const right = bounds.right + unitY
  const horizontal = (value: number, label: string, step = 0.01): SliderSpec => ({ min: left, max: right, step, value, label })
  const vertical = (value: number, label: string): SliderSpec =>
    ({ min: bounds.bottom - unitX, max: bounds.top + unitX, step: 0.01, value, label })
  const card = (input: string, output: string | string[] = '', sliders: SliderSpec[] = []): CardModel =>
    ({ input, output: Array.isArray(output) ? output : output ? [output] : [], sliders })

  switch (item.type) {
    case 'point': {
      const reflect = pointConstraint(item, 'reflectPoint')
      if (reflect) return card(`YansıtNokta(${nameOf(reflect.sourceId)},${nameOf(reflect.centerId)})`, pointValue(item))
      const intersection = pointConstraint(item, 'intersectLines')
      if (intersection) {
        return card(`${item.name}=Kesiştir(${nameOf(intersection.line1Id)},${nameOf(intersection.line2Id)})`,
          intersectionOutput(item, objects))
      }
      const touch = pointConstraint(item, 'circleTangentTouchPoint')
      if (touch) return card(`${item.name}=TeğetNokta(${nameOf(touch.tangentId)},${(touch.pointIndex || 0) + 1})`, pointValue(item))
      return card(`${item.name}=${pair(item)}`, item.geometryValid === false ? EMPTY : '', [
        horizontal(Number(item.a), `a = ${formatDisplayNumber(item.a)}`),
        vertical(Number(item.b), `b = ${formatDisplayNumber(item.b)}`),
      ])
    }
    case 'verLine':
      return card(`${item.name}: x = ${formatDisplayNumber(item.x)}`, '', [horizontal(item.x, `x = ${formatDisplayNumber(item.x)}`)])
    case 'circleR':
    case 'circle2':
    case 'circle3': {
      const output = getCircleDescriptor(item).status ? '' : EMPTY
      if (item.type !== 'circleR') return card(circleInput(item), output)
      const r = Number(item.r)
      return card(circleInput(item), output, [{
        min: 0, max: Math.max(r, bounds.right - bounds.left, bounds.top - bounds.bottom), step: 0.01,
        value: r, label: `r = ${formatDisplayNumber(item.r)}`,
      }])
    }
    case 'angle':
      return card(`${item.name}: Açı(${item.A.name},${item.B.name},${item.C.name})`,
        `${item.name}=${formatMeasure(getAngleMeasure(item))}°`)
    case 'arcMeasure': {
      const arc = getPositiveArcMeasure(item.A, item.B, item.circle)
      return card(`${item.name}: YayÖlçüsü(${item.A.name},${item.B.name})`, `${item.name}=${arc ? `${formatMeasure(arc.span)}°` : '?'}`)
    }
    case 'lineWithEquation':
      return card(`${item.name}: y = ${formatLine(item.m, item.n, ' ')}`, '', [
        horizontal(item.m, `m = ${formatDisplayNumber(item.m)}`),
        vertical(item.n, `n = ${formatDisplayNumber(item.n)}`),
      ])
    case 'lineWithPoints': {
      const input = `${item.name}: Doğru(${pair(item.A)}, ${pair(item.B)})`
      const A = numericPoint(item.A)
      const B = numericPoint(item.B)
      if (!A || !B || (A.a === B.a && A.b === B.b)) return card(input)
      if (A.a === B.a) return card(input, `x = ${formatDisplayNumber(A.a)}`)
      const line = createLineEquation(A, B)
      return card(input, `y = ${formatLine(line.m, line.c)}`)
    }
    case 'lineSegment':
      return card(`${item.name}: DoğruParçası(${pair(item.A)}, ${pair(item.B)})`)
    case 'distanceSegment':
      return card(`${item.name}: Uzaklık(${pair(item.A)}, ${pair(item.B)})`, `${item.name}=${formatMeasure(distanceAB(item.A, item.B))}`)
    case 'circleTangent':
      return card(`${item.name}: Teğet(${item.A.name},${item.circle.name})`)
    case 'sequence':
      return card(`${item.name}ₙ = Dizi(${item.func},${item.start},${item.end})`)
    case 'limit': {
      const approach = item.approachVal
      return card(`${item.name} = Limit(${item.func},${approach})`, '', [
        { min: approach, max: right, step: 0.01, value: item.approachValRight,
          label: `${approach}⁺ = ${formatDisplayNumber(item.approachValRight)}` },
        { min: left, max: approach, step: 0.01, value: item.approachValLeft,
          label: `${approach}⁻ = ${formatDisplayNumber(item.approachValLeft)}` },
      ])
    }
    case 'tangent':
      return card(`Teğet(${item.func},${item.approachVal})`, tangentOutput(item),
        [horizontal(item.approachVal, `x = ${formatDisplayNumber(item.approachVal)}`)])
    case 'tangentHX':
      return card(`Teğet${item.haveH ? 'H' : 'X'}(${item.func},${item.approachVal})`, tangentHXOutput(item), [
        horizontal(item.approachVal, `x₀ = ${formatDisplayNumber(item.approachVal)}`, 1),
        item.haveH
          ? { min: 0, max: 10, step: 0.1, value: item.h, label: `h = ${formatDisplayNumber(item.h)}` }
          : { min: left, max: right, step: 0.1, value: item.h, label: `x = ${formatDisplayNumber(item.h)}` },
      ])
    case 'sectionalFunctions':
      return card(`${item.name}(x) = {${item.cmd}}`)
    case 'function':
      return card(`${item.name}: y = ${item.func}`)
    case 'functioncomposition':
      return card(`Bileşke(${item.funcs.join(',')})`, `${item.name}: y = ${item.func}`)
    case 'derivative':
      return card(`${item.name}: y = ${item.func.func}`, `${item.derFunc.name}: y = ${item.derFunc.func}`)
  }
}

export interface SliderServices {
  updateTangent(model: Tangent, approach: number): void
  updateTangentHX(model: TangentHX, approach: number, h: number): void
}

export type SliderResult = { ok: true } | { ok: false; error: string }

/**
 * Apply raw slider values (in card order) to the model. Values for sliders the card
 * does not offer are ignored. A rejected value leaves the model unchanged.
 */
export function applySliderValues(item: GeometryDocumentObject, values: readonly number[], services: SliderServices): SliderResult {
  const [first = Number.NaN, second = Number.NaN] = values
  switch (item.type) {
    case 'point':
      item.a = first
      item.b = second
      break
    case 'verLine':
      item.x = first
      break
    case 'circleR':
      item.r = first
      break
    case 'lineWithEquation':
      item.m = first
      item.n = second
      item.func = linearExpression(first, second)
      break
    case 'limit':
      item.approachValRight = first
      item.approachValLeft = second
      break
    case 'tangent':
      try {
        services.updateTangent(item, first)
      } catch {
        return { ok: false, error: 'Bu konumda sonlu bir gerçek teğet hesaplanamıyor.' }
      }
      break
    case 'tangentHX':
      try {
        services.updateTangentHX(item, first, second)
      } catch {
        return { ok: false, error: 'Bu konumda sonlu gerçek noktalar hesaplanamıyor.' }
      }
      break
  }
  return { ok: true }
}
