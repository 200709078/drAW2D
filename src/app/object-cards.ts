import { pointConstraint } from '../document/dependencies'
import type { NumberArgument } from '../commands/types'
import { asymptotesOf, curveOf, definiteIntegral } from '../geometry/analysis'
import { arcData, polygonArea, slopeOf } from '../geometry/constructions'
import type {
  Asymptote, GeometryDocumentObject, Inequality, Integral, ParametricCurve, Tangent, TangentHX,
} from '../geometry/function-types'
import {
  createLineEquation, distanceAB, getAngleMeasure, getCircleDescriptor, getPositiveArcMeasure, numericPoint,
} from '../geometry/primitives'
import type {
  AnalysisKind, Coordinate, GeometryCircle, GeometryPoint, LineConstruction, LineStyle, ObjectId, PointConstraint,
} from '../geometry/types'
import { formatBound, formatDisplayNumber, formatMeasure } from '../math/format-display'
import { isTraceable } from './traces'

export interface SliderSpec {
  min: number
  max: number
  step: number
  value: number
  label: string
}

/** A parameter's slider bounds, editable on its card. */
export interface ParameterSettings {
  min: number
  max: number
  step: number
  /** The slider is also drawn on the plane. */
  onCanvas: boolean
}

export interface CardModel {
  /** The definition: what was typed, with names for created objects. */
  input: string
  /** Each entry is one value line. */
  output: string[]
  /**
   * The value lines are the card's main line and the definition is shown under them only
   * while the card is selected. Otherwise the definition leads and the values follow.
   */
  valueFirst: boolean
  sliders: SliderSpec[]
  /** Present on a slider parameter: its slider stays visible and its bounds are editable. */
  parameter?: ParameterSettings
}

/** Appearance settings a card offers; a null field is not offered for the object. */
export interface StyleSpec {
  color: string
  /** Point radius or stroke width in CSS pixels. */
  size: { value: number; min: number; max: number; caption: string } | null
  lineStyle: LineStyle | null
  /** Whether the name is drawn on the plane. */
  label: boolean | null
  trace: boolean | null
}

/** A change made with the appearance settings. */
export interface StylePatch {
  color?: string
  size?: number
  lineStyle?: LineStyle
  labelHidden?: boolean
  trace?: boolean
}

export interface CardContext {
  objects: readonly GeometryDocumentObject[]
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
    && (object.id === point.id || pointConstraint(object, 'intersectLines')?.ownerId === point.id
      || pointConstraint(object, 'analysisPoint')?.ownerId === point.id))
  const visible = members.filter(member => numericPoint(member))
  if (visible.length) return visible.map(member => `${member.name}=${pair(member)}`)
  return [point.intersectionStatus === 'infinite' ? INFINITE : EMPTY]
}

const ANALYSIS_COMMANDS: Readonly<Record<AnalysisKind, string>> = {
  root: 'Kök', extremum: 'Ekstremum', inflection: 'Dönüm', intersection: 'Kesiştir',
}

/** `Kök(f)` for display; `Kök(f,-5,5)` with the search range for editing. */
function analysisCall(constraint: Extract<PointConstraint, { type: 'analysisPoint' }>, nameOf: (id: ObjectId | null) => string,
  withRange: boolean): string {
  const args = constraint.sourceIds.map(nameOf)
  if (withRange) args.push(String(constraint.start), String(constraint.end))
  return `${ANALYSIS_COMMANDS[constraint.analysis]}(${args.join(',')})`
}

const CONSTRUCTION_COMMANDS: Readonly<Record<LineConstruction['kind'], string>> = {
  perpendicular: 'DikDoğru', parallel: 'ParalelDoğru', bisector: 'OrtaDikme', angleBisector: 'Açıortay',
}

function constructionCall(construction: LineConstruction, nameOf: (id: ObjectId | null) => string): string {
  return `${CONSTRUCTION_COMMANDS[construction.kind]}(${construction.refs.map(nameOf).join(',')})`
}

/** `OrtaNokta(A,B)`, `Yansıt(A,f)`, `Döndür(A,a,B)` or `Ötele(A,B,C)` for a constructed point. */
function transformCall(item: GeometryPoint, nameOf: (id: ObjectId | null) => string): string | null {
  for (const constraint of item.onOther) {
    switch (constraint.type) {
      case 'midpoint': return `OrtaNokta(${nameOf(constraint.firstId)},${nameOf(constraint.secondId)})`
      case 'reflectLine': return `Yansıt(${nameOf(constraint.sourceId)},${nameOf(constraint.lineId)})`
      case 'rotate': {
        const angle = item.definition?.kind === 'rotate' ? typed(item.definition.angle, constraint.angle) : formatDisplayNumber(constraint.angle)
        return `Döndür(${nameOf(constraint.sourceId)},${angle},${nameOf(constraint.centerId)})`
      }
      case 'translate': return constraint.vectorId !== undefined
        ? `Ötele(${nameOf(constraint.sourceId)},${nameOf(constraint.vectorId)})`
        : `Ötele(${nameOf(constraint.sourceId)},${nameOf(constraint.fromId)},${nameOf(constraint.toId)})`
    }
  }
  return null
}

function integralValue(item: Integral, objects: readonly GeometryDocumentObject[]): number | null {
  const source = objects.find(object => object.id === item.sourceId)
  const curve = source ? curveOf(source) : null
  return curve?.kind === 'graph' ? definiteIntegral(curve.evaluate, item.start, item.end) : null
}

/** The typed form of a definition argument, e.g. `a` for a slider-bound value. */
const typed = (argument: NumberArgument | undefined, fallback: Coordinate) =>
  argument === undefined ? formatDisplayNumber(fallback) : typeof argument === 'number' ? formatDisplayNumber(argument) : argument.expression

/** `Yansıt(p,d)`, `Döndür(p,a,M)` or `Ötele(p,u)`: how an image object was made. */
function imageCall(item: GeometryDocumentObject, nameOf: (id: ObjectId | null) => string): string {
  const image = item.imageOf!
  const source = nameOf(image.sourceId)
  const refs = image.refs.map(nameOf)
  switch (image.kind) {
    case 'reflectPoint':
    case 'reflectLine': return `Yansıt(${source},${refs[0]})`
    case 'rotate': {
      const angle = item.definition?.kind === 'rotate' ? typed(item.definition.angle, image.angle ?? 0) : formatDisplayNumber(image.angle ?? 0)
      return `Döndür(${source},${angle},${refs[0]})`
    }
    case 'translate': return `Ötele(${source},${refs.join(',')})`
  }
}

function areaValue(item: GeometryDocumentObject | undefined): number | null {
  if (!item) return null
  if (item.type === 'polygon') return polygonArea(item.points)
  if (item.type === 'circleR' || item.type === 'circle2' || item.type === 'circle3') {
    const circle = getCircleDescriptor(item)
    return circle.status ? Math.PI * circle.r * circle.r : null
  }
  return null
}

function asymptoteLines(item: Asymptote, objects: readonly GeometryDocumentObject[]): string[] {
  const source = objects.find(object => object.id === item.sourceId)
  const curve = source ? curveOf(source) : null
  if (curve?.kind !== 'graph') return [EMPTY]
  const { vertical, lines } = asymptotesOf(curve, item.start, item.end)
  const result = [...vertical.map(x => `x = ${formatDisplayNumber(x)}`), ...lines.map(line => `y = ${formatLine(line.m, line.n)}`)]
  return result.length ? result : [EMPTY]
}

function curveCall(item: ParametricCurve, definition: GeometryDocumentObject['definition'], exact: boolean): string {
  const bound = (argument: NumberArgument | undefined, fallback: number) =>
    argument !== undefined && typeof argument !== 'number' ? argument.expression : exact ? formatBound(fallback) : formatBoundShort(fallback)
  const range = definition?.kind === 'curve' || definition?.kind === 'polar'
    ? `${bound(definition.start, item.start)},${bound(definition.end, item.end)}`
    : `${bound(undefined, item.start)},${bound(undefined, item.end)}`
  return item.polar !== undefined ? `Kutupsal(${item.typed.x},${range})` : `Eğri(${item.typed.x},${item.typed.y},${item.variable},${range})`
}

/** A bound for display: multiples of π, otherwise rounded. */
function formatBoundShort(value: number): string {
  const exact = formatBound(value)
  return exact.includes('π') ? exact : formatDisplayNumber(value)
}

const inequalityText = (item: Inequality) => `${item.left} ${item.operator} ${item.right}`

/** Presentation of one document object; reads the model and never changes it. */
export function describeCard(item: GeometryDocumentObject, context: CardContext): CardModel {
  const card = describeValues(item, context)
  // A definition that cannot be evaluated keeps its last values, which are not shown.
  if (item.invalid) return { ...card, output: [EMPTY], valueFirst: false, sliders: [] }
  // Without a value, the definition says what the object is; both lines of a derivative
  // or a secant are objects of their own.
  const undefinedValue = card.output.every(line => line === EMPTY || line === INFINITE)
  return { ...card, valueFirst: card.output.length > 0 && !undefinedValue && !BOTH_LINES.has(item.type) }
}

const INFINITE = '∞'
const BOTH_LINES = new Set<GeometryDocumentObject['type']>(['derivative', 'tangentHX', 'asymptote'])

function describeValues(item: GeometryDocumentObject, context: CardContext): CardModel {
  const { objects } = context
  const nameOf = (id: ObjectId | null) => objects.find(object => object.id === id)?.name ?? '?'
  const card = (input: string, output: string | string[] = ''): CardModel =>
    ({ input, output: Array.isArray(output) ? output : output ? [output] : [], valueFirst: false, sliders: [] })
  const definition = item.definition
  // An image shows its transformation and the values of its kind.
  if (item.imageOf) {
    const { imageOf: _image, ...plain } = item
    return { ...describeValues(plain as GeometryDocumentObject, context), input: `${item.name}: ${imageCall(item, nameOf)}` }
  }

  switch (item.type) {
    case 'parameter': {
      if (definition?.kind === 'parameter' && typeof definition.value !== 'number') {
        return card(`${item.name} = ${definition.value.expression}`, `${item.name} = ${formatDisplayNumber(item.value)}`)
      }
      const { min, max, step, value } = item
      return {
        ...card(`${item.name} = ${formatDisplayNumber(value)}`),
        sliders: [{ min, max, step, value, label: '' }],
        parameter: { min, max, step, onCanvas: item.onCanvas !== undefined },
      }
    }
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
      const analysis = pointConstraint(item, 'analysisPoint')
      if (analysis) return card(`${item.name}=${analysisCall(analysis, nameOf, false)}`, intersectionOutput(item, objects))
      const transform = transformCall(item, nameOf)
      if (transform) return card(`${item.name}=${transform}`, pointValue(item))
      if (definition?.kind === 'point') {
        return card(`${item.name}=(${typed(definition.point.a, item.a)},${typed(definition.point.b, item.b)})`, pointValue(item))
      }
      return card(`${item.name}=${pair(item)}`, item.geometryValid === false ? EMPTY : '')
    }
    case 'verLine':
      if (definition?.kind === 'verticalLine') {
        return card(`${item.name}: x = ${typed(definition.x, item.x)}`, `${item.name}: x = ${formatDisplayNumber(item.x)}`)
      }
      return card(`${item.name}: x = ${formatDisplayNumber(item.x)}`)
    case 'circleR':
    case 'circle2':
    case 'circle3': {
      const output = getCircleDescriptor(item).status ? '' : EMPTY
      if (item.type === 'circleR' && definition?.kind === 'circleRadius') {
        return card(`${item.name}: Çember(${item.A.name},${typed(definition.radius, item.r)})`,
          output || `${item.name}: Çember(${item.A.name},${formatDisplayNumber(item.r)})`)
      }
      return card(circleInput(item), output)
    }
    case 'angle':
      return card(`${item.name}: Açı(${item.A.name},${item.B.name},${item.C.name})`,
        `${item.name}=${formatMeasure(getAngleMeasure(item))}°`)
    case 'arcMeasure': {
      const arc = getPositiveArcMeasure(item.A, item.B, item.circle)
      return card(`${item.name}: YayÖlçüsü(${item.A.name},${item.B.name})`, `${item.name}=${arc ? `${formatMeasure(arc.span)}°` : '?'}`)
    }
    case 'lineWithEquation':
      if (definition?.kind === 'function') return card(`${item.name}: y = ${definition.expression}`, `${item.name}: y = ${formatLine(item.m, item.n)}`)
      return card(`${item.name}: y = ${formatLine(item.m, item.n, ' ')}`)
    case 'lineWithPoints': {
      const input = item.construction
        ? `${item.name}: ${constructionCall(item.construction, nameOf)}` : `${item.name}: Doğru(${pair(item.A)}, ${pair(item.B)})`
      const A = numericPoint(item.A)
      const B = numericPoint(item.B)
      if (!A || !B || (A.a === B.a && A.b === B.b)) return card(input)
      if (A.a === B.a) return card(input, `${item.name}: x = ${formatDisplayNumber(A.a)}`)
      const line = createLineEquation(A, B)
      return card(input, `${item.name}: y = ${formatLine(line.m, line.c)}`)
    }
    case 'lineSegment':
      return card(`${item.name}: DoğruParçası(${pair(item.A)}, ${pair(item.B)})`)
    case 'distanceSegment':
      return card(`${item.name}: Uzaklık(${pair(item.A)}, ${pair(item.B)})`, `${item.name}=${formatMeasure(distanceAB(item.A, item.B))}`)
    case 'circleTangent':
      return card(`${item.name}: Teğet(${item.A.name},${item.circle.name})`)
    case 'sequence':
      if (definition?.kind === 'sequence') {
        return card(`${item.name}ₙ = Dizi(${definition.expression},${typed(definition.start, item.start)},${typed(definition.end, item.end)})`)
      }
      return card(`${item.name}ₙ = Dizi(${item.func},${item.start},${item.end})`)
    case 'limit': {
      const source = definition?.kind === 'limit' ? definition.expression : item.func
      const at = definition?.kind === 'limit' ? typed(definition.at, item.approachVal) : String(item.approachVal)
      return card(`${item.name} = Limit(${source},${at})`)
    }
    case 'tangent': {
      const source = definition?.kind === 'tangent' ? definition.expression : item.func
      const at = definition?.kind === 'tangent' ? typed(definition.at, item.approachVal) : String(item.approachVal)
      return card(`Teğet(${source},${at})`, tangentOutput(item))
    }
    case 'tangentHX': {
      const tangent = definition?.kind === 'tangentH' || definition?.kind === 'tangentX' ? definition : null
      const at = tangent ? typed(tangent.at, item.approachVal) : String(item.approachVal)
      return card(`Teğet${item.haveH ? 'H' : 'X'}(${tangent?.expression ?? item.func},${at})`, tangentHXOutput(item))
    }
    case 'sectionalFunctions':
      return card(`${item.name}(x) = {${item.cmd}}`)
    case 'function':
      return card(`${item.name}: y = ${definition?.kind === 'function' ? definition.expression : item.func}`)
    case 'functioncomposition': {
      const parts = definition?.kind === 'composition' ? definition.expressions : item.funcs
      return card(`Bileşke(${parts.join(',')})`, `${item.name}: y = ${item.func}`)
    }
    case 'derivative': {
      const source = definition?.kind === 'derivative' ? definition.expression : item.func.func
      return card(`${item.name}: y = ${source}`, `${item.derFunc.name}: y = ${item.derFunc.func}`)
    }
    case 'ray':
      return card(`${item.name}: Işın(${item.A.name},${item.B.name})`)
    case 'polygon': {
      const area = polygonArea(item.points)
      const input = item.regular
        ? `${item.name}: DüzgünÇokgen(${item.points[0]!.name},${item.points[1]!.name},${item.regular.sides})`
        : `${item.name}: Çokgen(${item.points.map(point => point.name).join(',')})`
      return card(input, `${item.name} = ${area === null ? EMPTY : formatMeasure(area)}`)
    }
    case 'integral': {
      const value = integralValue(item, objects)
      return card(integralInput(item, nameOf), `${item.name} = ${value === null ? EMPTY : formatMeasure(value)}`)
    }
    case 'vector': {
      const A = numericPoint(item.A)
      const B = numericPoint(item.B)
      return card(`${item.name}: Vektör(${item.A.name},${item.B.name})`,
        A && B ? `${item.name}=${pair({ a: B.a - A.a, b: B.b - A.b })}` : EMPTY)
    }
    case 'circularArc': {
      const arc = arcData(item)
      return card(`${item.name}: Yay(${item.M.name},${item.A.name},${item.B.name})`,
        `${item.name} = ${arc ? formatMeasure(arc.r * arc.span * Math.PI / 180) : EMPTY}`)
    }
    case 'area': {
      const value = areaValue(objects.find(object => object.id === item.sourceId))
      return card(`${item.name} = Alan(${nameOf(item.sourceId)})`, `${item.name} = ${value === null ? EMPTY : formatMeasure(value)}`)
    }
    case 'slope': {
      const value = slopeOf(objects.find(object => object.id === item.sourceId))
      return card(`${item.name} = Eğim(${nameOf(item.sourceId)})`, `${item.name} = ${value === null ? EMPTY : formatMeasure(value)}`)
    }
    case 'asymptote':
      return card(`${item.name}: Asimptot(${nameOf(item.sourceId)})`, asymptoteLines(item, objects))
    case 'curve':
      return card(`${item.name}: ${curveCall(item, definition, false)}`)
    case 'implicit':
      return card(`${item.name}: ${item.left} = ${item.right}`)
    case 'inequality':
      return card(`${item.name}: ${inequalityText(item)}`)
  }
}

function integralInput(item: Integral, nameOf: (id: ObjectId | null) => string): string {
  const definition = item.definition?.kind === 'integral' ? item.definition : null
  return `${item.name} = İntegral(${nameOf(item.sourceId)},${typed(definition?.start, item.start)},${typed(definition?.end, item.end)})`
}

/**
 * The text a card shows while edited: `name: command` or `name = value`, which the
 * redefinition reads back. Null for objects that are only parts of another object.
 */
export function editText(item: GeometryDocumentObject, context: CardContext): string | null {
  const { objects } = context
  const nameOf = (id: ObjectId | null) => objects.find(object => object.id === id)?.name ?? '?'
  const definition = item.definition
  const name = item.name
  if (item.imageOf) return `${name}: ${imageCall(item, nameOf)}`
  switch (item.type) {
    case 'parameter':
      return `${name} = ${definition?.kind === 'parameter' && typeof definition.value !== 'number'
        ? definition.value.expression : formatDisplayNumber(item.value)}`
    case 'point': {
      if (item.hideInLabels) return null
      const reflect = pointConstraint(item, 'reflectPoint')
      if (reflect) return `${name} = YansıtNokta(${nameOf(reflect.sourceId)},${nameOf(reflect.centerId)})`
      const intersection = pointConstraint(item, 'intersectLines')
      if (intersection) return `${name} = Kesiştir(${nameOf(intersection.line1Id)},${nameOf(intersection.line2Id)})`
      const touch = pointConstraint(item, 'circleTangentTouchPoint')
      if (touch) return `${name} = TeğetNokta(${nameOf(touch.tangentId)},${(touch.pointIndex || 0) + 1})`
      const analysis = pointConstraint(item, 'analysisPoint')
      if (analysis) return `${name} = ${analysisCall(analysis, nameOf, true)}`
      const transform = transformCall(item, nameOf)
      if (transform) return `${name} = ${transform}`
      if (definition?.kind === 'point') return `${name} = (${typed(definition.point.a, item.a)},${typed(definition.point.b, item.b)})`
      return `${name} = ${pair(item)}`
    }
    case 'verLine':
      return `${name}: x = ${definition?.kind === 'verticalLine' ? typed(definition.x, item.x) : formatDisplayNumber(item.x)}`
    case 'circleR':
      return `${name}: Çember(${item.A.name},${definition?.kind === 'circleRadius' ? typed(definition.radius, item.r) : formatDisplayNumber(item.r)})`
    case 'circle2':
      return `${name}: Çember(${item.A.name},${item.B.name})`
    case 'circle3':
      return `${name}: Çember(${item.A.name},${item.B.name},${item.C.name})`
    case 'angle':
      return `${name}: Açı(${item.A.name},${item.B.name},${item.C.name})`
    case 'arcMeasure':
      return `${name}: YayÖlçüsü(${item.A.name},${item.B.name})`
    case 'lineWithEquation':
      return `${name}: y = ${definition?.kind === 'function' ? definition.expression : formatLine(item.m, item.n, ' ')}`
    case 'lineWithPoints':
      return item.construction ? `${name}: ${constructionCall(item.construction, nameOf)}` : `${name}: Doğru(${item.A.name},${item.B.name})`
    case 'ray':
      return `${name}: Işın(${item.A.name},${item.B.name})`
    case 'polygon':
      return item.regular
        ? `${name}: DüzgünÇokgen(${item.points[0]!.name},${item.points[1]!.name},${item.regular.sides})`
        : `${name}: Çokgen(${item.points.map(point => point.name).join(',')})`
    case 'lineSegment':
      return `${name}: DoğruParçası(${item.A.name},${item.B.name})`
    case 'distanceSegment':
      return `${name}: Uzaklık(${item.A.name},${item.B.name})`
    case 'circleTangent':
      return `${name}: TeğetC(${item.circle.name},${item.A.name})`
    case 'sequence':
      return definition?.kind === 'sequence'
        ? `${name}: Dizi(${definition.expression},${typed(definition.start, item.start)},${typed(definition.end, item.end)})`
        : `${name}: Dizi(${item.func},${item.start},${item.end})`
    case 'limit':
      return `${name}: Limit(${definition?.kind === 'limit' ? definition.expression : item.func},${
        definition?.kind === 'limit' ? typed(definition.at, item.approachVal) : formatDisplayNumber(item.approachVal)})`
    case 'tangent':
      return `${name}: Teğet(${definition?.kind === 'tangent' ? definition.expression : item.func},${
        definition?.kind === 'tangent' ? typed(definition.at, item.approachVal) : formatDisplayNumber(item.approachVal)})`
    case 'tangentHX': {
      const tangent = definition?.kind === 'tangentH' || definition?.kind === 'tangentX' ? definition : null
      return `${name}: Teğet${item.haveH ? 'H' : 'X'}(${tangent?.expression ?? item.func},${
        tangent ? typed(tangent.at, item.approachVal) : formatDisplayNumber(item.approachVal)})`
    }
    case 'sectionalFunctions':
      return `${name}(x) = ParçalıFonksiyon(${item.cmd})`
    case 'function':
      return `${name}: y = ${definition?.kind === 'function' ? definition.expression : item.func}`
    case 'functioncomposition':
      return `${name}: Bileşke(${(definition?.kind === 'composition' ? definition.expressions : item.funcs).join(',')})`
    case 'derivative':
      return `${name}: Türev(${definition?.kind === 'derivative' ? definition.expression : item.func.func})`
    case 'integral':
      return integralInput(item, nameOf)
    case 'vector':
      return `${name}: Vektör(${item.A.name},${item.B.name})`
    case 'circularArc':
      return `${name}: Yay(${item.M.name},${item.A.name},${item.B.name})`
    case 'area':
      return `${name} = Alan(${nameOf(item.sourceId)})`
    case 'slope':
      return `${name} = Eğim(${nameOf(item.sourceId)})`
    case 'asymptote': {
      const range = definition?.kind === 'asymptote'
        ? `${typed(definition.start, item.start)},${typed(definition.end, item.end)}` : `${item.start},${item.end}`
      return `${name}: Asimptot(${nameOf(item.sourceId)},${range})`
    }
    case 'curve':
      return `${name}: ${curveCall(item, definition, true)}`
    case 'implicit':
      return `${name}: ${item.left} = ${item.right}`
    case 'inequality':
      return `${name}: ${inequalityText(item)}`
  }
}

type ObjectType = GeometryDocumentObject['type']

/** Objects drawn as a stroke: they take a width and a line style. */
const STROKED = new Set<ObjectType>([
  'circleR', 'circle2', 'circle3', 'angle', 'lineWithEquation', 'lineWithPoints', 'lineSegment', 'circleTangent',
  'verLine', 'ray', 'polygon', 'function', 'functioncomposition', 'derivative', 'sectionalFunctions', 'limit',
  'tangent', 'tangentHX', 'vector', 'circularArc', 'asymptote', 'curve', 'implicit', 'slope',
])

/** Objects whose name (or name and value) is written on the plane. */
const LABELLED = new Set<ObjectType>([
  'point', 'circleR', 'circle2', 'circle3', 'angle', 'arcMeasure', 'lineWithEquation', 'lineWithPoints',
  'lineSegment', 'distanceSegment', 'circleTangent', 'verLine', 'ray', 'polygon', 'sequence', 'tangent', 'tangentHX',
  'vector', 'circularArc', 'area', 'slope', 'curve', 'implicit', 'inequality',
])

/** The boundary of an inequality is solid or dashed by its operator, so only its width is offered. */
const SIZED_ONLY = new Set<ObjectType>(['inequality'])

const POINT_SIZE = { min: 1, max: 9, caption: 'Boyut' }
const STROKE_SIZE = { min: 1, max: 8, caption: 'Kalınlık' }

/** What the appearance settings of a card show; null for objects that are not drawn. */
export function styleSpec(item: GeometryDocumentObject): StyleSpec | null {
  if (item.type === 'parameter') return null
  const sized = item.type === 'point' || item.type === 'sequence' || STROKED.has(item.type) || SIZED_ONLY.has(item.type)
  return {
    color: item.color,
    size: sized ? { value: item.size, ...(item.type === 'point' ? POINT_SIZE : STROKE_SIZE) } : null,
    lineStyle: STROKED.has(item.type) ? item.lineStyle ?? 'solid' : null,
    label: LABELLED.has(item.type) ? !item.labelHidden : null,
    trace: isTraceable(item) ? item.trace === true : null,
  }
}

/**
 * Apply appearance settings. Defaults are stored as absent fields, so turning a setting
 * back restores the original model exactly. True when something changed.
 */
export function applyStyle(item: GeometryDocumentObject, patch: StylePatch): boolean {
  const spec = styleSpec(item)
  if (!spec) return false
  const before = [item.color, item.size, item.lineStyle, item.labelHidden, item.trace]
  if (patch.color !== undefined && /^#[0-9a-f]{6}$/i.test(patch.color)) item.color = patch.color.toLowerCase()
  if (patch.size !== undefined && spec.size && Number.isFinite(patch.size)) {
    item.size = Math.min(spec.size.max, Math.max(spec.size.min, Math.round(patch.size)))
  }
  if (patch.lineStyle !== undefined && spec.lineStyle !== null) {
    if (patch.lineStyle === 'solid') delete item.lineStyle
    else item.lineStyle = patch.lineStyle
  }
  if (patch.labelHidden !== undefined && spec.label !== null) {
    if (patch.labelHidden) item.labelHidden = true
    else delete item.labelHidden
  }
  if (patch.trace !== undefined && spec.trace !== null) {
    if (patch.trace) item.trace = true
    else delete item.trace
  }
  const after = [item.color, item.size, item.lineStyle, item.labelHidden, item.trace]
  return before.some((value, index) => value !== after[index])
}
