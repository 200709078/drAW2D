import type {
  Derivative,
  EquationLine,
  FunctionComposition,
  FunctionCurve,
  FunctionGeometryObject,
  FunctionSection,
  Integral,
  Limit,
  SectionalFunctions,
  Sequence,
  Tangent,
  TangentHX,
} from '../geometry/function-types'
import { curveOf } from '../geometry/analysis'
import { numericPoint } from '../geometry/primitives'
import type { GeometryObject } from '../geometry/types'
import { drawFunctionPlot } from './function-plotter'
import { paintEquationLine } from './geometry-painter'
import { lineDash } from './line-style'
import type { DrawingPrimitives, PainterFrame, StrokeStyle } from './painter-types'

const TEMP_COLOR = '#000000'
/** A sequence's guide curve; its terms are the points. */
const SEQUENCE_DASH = [2, 5]
const SEQUENCE_INDEX = /(?<![a-zA-Z0-9_])n(?![a-zA-Z0-9_])/g

interface PlotObject extends GeometryObject<string> {
  func: string
  startX?: number | null
  endX?: number | null
  startInclusive?: boolean
  endInclusive?: boolean
}

function isActive(frame: PainterFrame, object: GeometryObject<string>): boolean {
  return frame.activeId !== null && object.id === frame.activeId
}

function plotWidth(frame: PainterFrame, object: GeometryObject<string>): number {
  return object.size + (isActive(frame, object) ? 1 : 0)
}

interface PlotOptions {
  /** The card object whose color, width and line style an embedded curve is drawn with. */
  style?: GeometryObject<string>
  dash?: readonly number[]
  expression?: string
  startX?: number | null
  endX?: number | null
}

function plot(frame: PainterFrame, object: PlotObject, options: PlotOptions = {}): void {
  if (!object.visibility) return
  const style = options.style ?? object
  const startX = options.startX === undefined ? object.startX : options.startX
  const endX = options.endX === undefined ? object.endX : options.endX
  const lineWidth = plotWidth(frame, style)
  drawFunctionPlot(frame.ctx, {
    expression: options.expression ?? object.func,
    transform: frame.transform,
    width: frame.width,
    height: frame.height,
    color: style.color,
    lineWidth,
    startX: startX === null || startX === undefined ? null : Number(startX),
    endX: endX === null || endX === undefined ? null : Number(endX),
    startInclusive: object.startInclusive,
    endInclusive: object.endInclusive,
    dash: options.dash ?? lineDash(style.lineStyle, lineWidth),
  }, frame.evaluator)
}

function sequenceExpression(sequence: Sequence): string {
  return sequence.func.replace(SEQUENCE_INDEX, 'x')
}

function paintSequence(frame: PainterFrame, primitives: DrawingPrimitives, sequence: Sequence): void {
  if (!sequence.visibility) return
  const expression = sequenceExpression(sequence)
  plot(frame, sequence, {
    dash: SEQUENCE_DASH,
    expression,
    startX: sequence.start,
    endX: sequence.end,
  })
  const first = Math.max(sequence.start, Math.ceil(frame.transform.bounds.left))
  const last = Math.min(sequence.end, Math.floor(frame.transform.bounds.right))
  if (!Number.isFinite(first) || !Number.isFinite(last) || first > last) return
  const budget = Math.max(1, Math.ceil(frame.width / 8))
  const step = Math.max(1, Math.ceil((last - first + 1) / budget))
  const count = Math.min(budget, Math.floor((last - first) / step) + 1)
  const radius = plotWidth(frame, sequence)
  for (let index = 0; index < count; index++) {
    const n = first + index * step
    const y = frame.evaluator.evaluate(expression, n)
    if (y === null) continue
    const py = frame.transform.yToPixel(y)
    if (!Number.isFinite(py) || py < -radius || py > frame.height + radius) continue
    primitives.point({ a: n, b: y }, {
      color: sequence.color,
      radius,
      label: sequence.labelHidden ? null : `${sequence.name ?? ''}${n}`,
    })
  }
}

function paintFunctionGuides(
  frame: PainterFrame,
  primitives: DrawingPrimitives,
  expression: string,
  x: number,
  color: string,
  dashed = false,
): void {
  if (!Number.isFinite(x)) return
  const A = { a: x, b: 0 }
  primitives.point(A, { color: TEMP_COLOR, radius: 5 })
  const y = frame.evaluator.evaluate(expression, x)
  if (y === null) return
  const B = { a: x, b: y }
  const C = { a: 0, b: y }
  const guide: StrokeStyle = { color, width: 3, dash: dashed ? [2, 5] : undefined }
  primitives.line({ type: 'lineSegment', A, B }, guide)
  primitives.line({ type: 'lineSegment', A: B, B: C }, guide)
  primitives.point(B, { color: TEMP_COLOR, radius: 5 })
  primitives.point(C, { color: TEMP_COLOR, radius: 5 })
}

function paintLimit(frame: PainterFrame, primitives: DrawingPrimitives, limit: Limit): void {
  if (!limit.visibility) return
  plot(frame, limit)
  paintFunctionGuides(frame, primitives, limit.func, limit.approachVal, limit.color)
  // The approach guides follow the limit's slider, which is edited on another card.
  paintFunctionGuides(frame, primitives, limit.func, limit.approachValRight, limit.color, true)
  paintFunctionGuides(frame, primitives, limit.func, limit.approachValLeft, limit.color, true)
}

function paintTangent(frame: PainterFrame, primitives: DrawingPrimitives, tangent: Tangent): void {
  if (!tangent.visibility) return
  plot(frame, tangent)
  paintFunctionGuides(frame, primitives, tangent.func, tangent.approachVal, tangent.color, true)
  paintEquationLine(frame, primitives, tangent.tngLine, tangent)
}

function paintTangentHxGuide(frame: PainterFrame, primitives: DrawingPrimitives, point: { a: number; b: number }): void {
  if (!Number.isFinite(point.a) || !Number.isFinite(point.b)) return
  const xAxis = { a: point.a, b: 0 }
  const yAxis = { a: 0, b: point.b }
  for (const marker of [xAxis, point, yAxis]) primitives.point(marker, { color: TEMP_COLOR, radius: 5 })
  const guide: StrokeStyle = { color: TEMP_COLOR, width: 3, dash: [2, 5] }
  primitives.line({ type: 'lineSegment', A: xAxis, B: point }, guide)
  primitives.line({ type: 'lineSegment', A: point, B: yAxis }, guide)
}

function paintTangentHx(frame: PainterFrame, primitives: DrawingPrimitives, tangent: TangentHX): void {
  if (!tangent.visibility) return
  plot(frame, tangent)
  const A = numericPoint(tangent.aodLine.A)
  const B = numericPoint(tangent.aodLine.B)
  if (!A || !B) return
  paintTangentHxGuide(frame, primitives, A)
  paintTangentHxGuide(frame, primitives, B)
  primitives.line({ type: 'lineWithPoints', A, B }, { color: TEMP_COLOR, width: 3 })
  if (A.a === B.a && A.b === B.b) paintEquationLine(frame, primitives, tangent.tngLine, tangent)
}

function paintDerivative(frame: PainterFrame, _primitives: DrawingPrimitives, derivative: Derivative): void {
  if (!derivative.visibility) return
  plot(frame, derivative.derFunc, { style: derivative })
  if (isActive(frame, derivative)) plot(frame, derivative.func, { style: derivative, dash: SEQUENCE_DASH })
}

interface EndpointMarker {
  point: { a: number; b: number }
  inclusive: boolean
  color: string
}

function collectEndpointMarkers(frame: PainterFrame, section: FunctionSection, color: string, markers: EndpointMarker[]): void {
  for (const [x, inclusive] of [[section.startX, section.startInclusive], [section.endX, section.endInclusive]] as const) {
    if (x === null || inclusive === undefined || x < frame.transform.bounds.left || x > frame.transform.bounds.right) continue
    const y = frame.evaluator.evaluate(section.func, x)
    if (y === null || y < frame.transform.bounds.bottom || y > frame.transform.bounds.top) continue
    markers.push({ point: { a: x, b: y }, inclusive, color })
  }
}

function paintSectionalFunctions(frame: PainterFrame, primitives: DrawingPrimitives, sectional: SectionalFunctions): void {
  if (!sectional.visibility) return
  const markers: EndpointMarker[] = []
  for (const section of sectional.secFuncs) {
    plot(frame, section, { style: sectional })
    collectEndpointMarkers(frame, section, sectional.color, markers)
  }
  // Closed endpoints are painted last, so an open endpoint cannot erase a shared closed one.
  markers.sort((first, second) => Number(first.inclusive) - Number(second.inclusive))
  for (const marker of markers) {
    primitives.point(marker.point, {
      color: marker.inclusive ? marker.color : 'white',
      outlineColor: marker.color,
      radius: 3.5,
    })
  }
}

/** Shade between the source graph and the x axis on [start, end], split where it is undefined. */
function paintIntegral(frame: PainterFrame, integral: Integral): void {
  if (!integral.visibility) return
  const source = frame.objects.find(object => object.id === integral.sourceId)
  const curve = source ? curveOf(source) : null
  if (curve?.kind !== 'graph') return
  const { transform, ctx } = frame
  const low = Math.max(Math.min(integral.start, integral.end), transform.bounds.left)
  const high = Math.min(Math.max(integral.start, integral.end), transform.bounds.right)
  if (!(high > low)) return
  const axis = transform.yToPixel(0)
  const first = transform.xToPixel(low)
  const last = transform.xToPixel(high)
  const limit = frame.height * 4
  ctx.save()
  ctx.beginPath()
  let open: number | null = null
  const close = () => {
    if (open === null) return
    ctx.lineTo(open, axis)
    ctx.closePath()
    open = null
  }
  for (let pixel = first; ; pixel = Math.min(last, pixel + 1)) {
    const y = curve.evaluate(transform.pixelToX(pixel))
    if (y === null) {
      close()
    } else {
      // Keep huge values representable; the canvas clips them anyway.
      const py = Math.max(-limit, Math.min(frame.height + limit, transform.yToPixel(y)))
      if (open === null) ctx.moveTo(pixel, axis)
      ctx.lineTo(pixel, py)
      open = pixel
    }
    if (pixel >= last) break
  }
  close()
  ctx.fillStyle = `${integral.color}55`
  ctx.fill()
  ctx.restore()
}

/** Paint one analysis object without accessing document, tools, grid or DOM state. */
export function paintAnalysisObject(
  frame: PainterFrame,
  primitives: DrawingPrimitives,
  object: Exclude<FunctionGeometryObject, EquationLine>,
): void {
  switch (object.type) {
    case 'sequence': paintSequence(frame, primitives, object); break
    case 'limit': paintLimit(frame, primitives, object); break
    case 'function': plot(frame, object); break
    case 'functioncomposition': plot(frame, object); break
    case 'tangent': paintTangent(frame, primitives, object); break
    case 'tangentHX': paintTangentHx(frame, primitives, object); break
    case 'derivative': paintDerivative(frame, primitives, object); break
    case 'sectionalFunctions': paintSectionalFunctions(frame, primitives, object); break
    case 'integral': paintIntegral(frame, object); break
    case 'verLine': break
  }
}
