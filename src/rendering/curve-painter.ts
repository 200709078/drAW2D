import { asymptotesOf, curveOf } from '../geometry/analysis'
import type { Asymptote, ImplicitCurve, Inequality, ParametricCurve } from '../geometry/function-types'
import type { NumericPoint } from '../geometry/primitives'
import type { GeometryObject } from '../geometry/types'
import { curveLines, implicitFill, implicitLines } from './curve-geometry'
import { drawFunctionPlot } from './function-plotter'
import { lineDash } from './line-style'
import type { DrawingPrimitives, PainterFrame, StrokeStyle } from './painter-types'

/** The boundary of a strict inequality is not part of the region. */
const STRICT_DASH = [6, 5]
const REGION_ALPHA = '40'

function isActive(frame: PainterFrame, object: GeometryObject<string>): boolean {
  return frame.activeId !== null && object.id === frame.activeId
}

function stroke(frame: PainterFrame, object: GeometryObject<string>): StrokeStyle {
  const width = object.size + (isActive(frame, object) ? 1 : 0)
  return { color: object.color, width, dash: lineDash(object.lineStyle, width) }
}

/** Polylines in math coordinates. */
function strokeMathLines(frame: PainterFrame, lines: readonly (readonly NumericPoint[])[], style: StrokeStyle): void {
  const { ctx, transform } = frame
  ctx.save()
  ctx.beginPath()
  for (const line of lines) {
    line.forEach((point, index) => {
      const x = transform.xToPixel(point.a)
      const y = transform.yToPixel(point.b)
      if (index === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
  }
  ctx.strokeStyle = style.color
  ctx.lineWidth = style.width
  ctx.setLineDash(style.dash ? [...style.dash] : [])
  ctx.stroke()
  ctx.restore()
}

function label(frame: PainterFrame, primitives: DrawingPrimitives, object: GeometryObject<string>, at: { x: number; y: number } | undefined): void {
  if (!at || object.labelHidden || !object.name) return
  const x = Math.max(12, Math.min(frame.width - 12, at.x + 8))
  const y = Math.max(15, Math.min(frame.height - 5, at.y - 8))
  primitives.textPixel(x, y, object.name, { color: object.color })
}

/** The first point of the first visible piece, in pixels. */
function firstVisible(frame: PainterFrame, lines: readonly (readonly NumericPoint[])[]): { x: number; y: number } | undefined {
  for (const line of lines) {
    for (const point of line) {
      const x = frame.transform.xToPixel(point.a)
      const y = frame.transform.yToPixel(point.b)
      if (x >= 0 && x <= frame.width && y >= 0 && y <= frame.height) return { x, y }
    }
  }
  return undefined
}

function paintCurve(frame: PainterFrame, primitives: DrawingPrimitives, curve: ParametricCurve): void {
  if (!curve.visibility) return
  const lines = curveLines(curve, frame.transform, frame.width, frame.height)
  const style = stroke(frame, curve)
  const { ctx } = frame
  ctx.save()
  ctx.beginPath()
  for (const line of lines) line.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y))
  ctx.strokeStyle = style.color
  ctx.lineWidth = style.width
  ctx.setLineDash(style.dash ? [...style.dash] : [])
  ctx.stroke()
  ctx.restore()
  label(frame, primitives, curve, lines.flat().find(point => point.x >= 0 && point.x <= frame.width && point.y >= 0 && point.y <= frame.height))
}

function paintImplicit(frame: PainterFrame, primitives: DrawingPrimitives, curve: ImplicitCurve): void {
  if (!curve.visibility) return
  const lines = implicitLines(curve.func, frame.transform, frame.width, frame.height)
  strokeMathLines(frame, lines, stroke(frame, curve))
  label(frame, primitives, curve, firstVisible(frame, lines))
}

function fillPolygons(frame: PainterFrame, polygons: readonly (readonly NumericPoint[])[], color: string): void {
  const { ctx, transform } = frame
  ctx.save()
  ctx.beginPath()
  for (const polygon of polygons) {
    polygon.forEach((point, index) => {
      const x = transform.xToPixel(point.a)
      const y = transform.yToPixel(point.b)
      if (index === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.closePath()
  }
  ctx.fillStyle = `${color}${REGION_ALPHA}`
  ctx.fill()
  ctx.restore()
}

/** y ≶ f(x): shade each pixel column between the graph and the top or bottom edge. */
function paintGraphRegion(frame: PainterFrame, inequality: Inequality, expression: string, below: boolean, style: StrokeStyle): void {
  const { ctx, transform, width, height } = frame
  ctx.save()
  ctx.beginPath()
  const edge = below ? height : 0
  for (let pixel = 0; pixel < width; pixel++) {
    const y = frame.evaluator.evaluate(expression, transform.pixelToX(pixel + 0.5))
    if (y === null) continue
    const py = Math.max(0, Math.min(height, transform.yToPixel(y)))
    ctx.rect(pixel, Math.min(py, edge), 1, Math.abs(edge - py))
  }
  ctx.fillStyle = `${inequality.color}${REGION_ALPHA}`
  ctx.fill()
  ctx.restore()
  drawFunctionPlot(ctx, {
    expression, transform, width, height, color: style.color, lineWidth: style.width, dash: style.dash,
  }, frame.evaluator)
}

function paintInequality(frame: PainterFrame, primitives: DrawingPrimitives, inequality: Inequality): void {
  if (!inequality.visibility) return
  const strict = !inequality.operator.endsWith('=')
  const width = inequality.size + (isActive(frame, inequality) ? 1 : 0)
  const style: StrokeStyle = { color: inequality.color, width, dash: strict ? STRICT_DASH : undefined }
  const { transform } = frame
  const bound = inequality.bound
  if (bound?.variable === 'y') {
    paintGraphRegion(frame, inequality, bound.expression, bound.below, style)
    return
  }
  if (bound?.variable === 'x') {
    const x = Math.max(-1, Math.min(frame.width + 1, transform.xToPixel(Number(bound.expression))))
    const { ctx } = frame
    ctx.save()
    ctx.fillStyle = `${inequality.color}${REGION_ALPHA}`
    if (bound.below) ctx.rect(0, 0, Math.max(0, x), frame.height)
    else ctx.rect(x, 0, Math.max(0, frame.width - x), frame.height)
    ctx.fill()
    ctx.restore()
    primitives.line({ type: 'verLine', x: Number(bound.expression) }, style)
    return
  }
  // left − right < 0 is the region where −F ≥ 0.
  const sign = inequality.operator.startsWith('<') ? -1 : 1
  fillPolygons(frame, implicitFill(inequality.func, sign, transform, frame.width, frame.height), inequality.color)
  const lines = implicitLines(inequality.func, transform, frame.width, frame.height)
  strokeMathLines(frame, lines, style)
  label(frame, primitives, inequality, firstVisible(frame, lines))
}

function paintAsymptote(frame: PainterFrame, primitives: DrawingPrimitives, asymptote: Asymptote): void {
  if (!asymptote.visibility) return
  const source = frame.objects.find(object => object.id === asymptote.sourceId)
  const curve = source ? curveOf(source) : null
  if (curve?.kind !== 'graph') return
  const { vertical, lines } = asymptotesOf(curve, asymptote.start, asymptote.end)
  const style = stroke(frame, asymptote)
  for (const x of vertical) primitives.line({ type: 'verLine', x }, style)
  for (const { m, n } of lines) primitives.line({ type: 'lineWithEquation', m, n }, style)
}

export function paintCurveObject(frame: PainterFrame, primitives: DrawingPrimitives,
  object: ParametricCurve | ImplicitCurve | Inequality | Asymptote): void {
  switch (object.type) {
    case 'curve': paintCurve(frame, primitives, object); break
    case 'implicit': paintImplicit(frame, primitives, object); break
    case 'inequality': paintInequality(frame, primitives, object); break
    case 'asymptote': paintAsymptote(frame, primitives, object); break
  }
}
