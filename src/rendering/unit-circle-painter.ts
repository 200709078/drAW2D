import type { UnitCircle } from '../geometry/function-types'
import type { NumericPoint } from '../geometry/primitives'
import { angleText, trigValue, unitPoint, type TrigFunction } from '../geometry/unit-circle'
import { formatDisplayNumber } from '../math/format-display'
import { lineDash } from './line-style'
import type { DrawingPrimitives, PainterFrame, StrokeStyle } from './painter-types'

/** Close to the colours of the textbook figure: each value has its own. */
export const TRIG_COLORS: Readonly<Record<TrigFunction, string>> = {
  sin: '#0891b2', cos: '#16a34a', tan: '#2563eb', cot: '#166534', sec: '#7e22ce', csc: '#ea580c',
}
const HELPER = '#64748b'
const HELPER_DASH = [6, 5]
const ORIGIN = { a: 0, b: 0 }
/** The arc that marks θ, in plane units. */
const ARC_RADIUS = 0.25

function isActive(frame: PainterFrame, circle: UnitCircle): boolean {
  return frame.activeId !== null && circle.id === frame.activeId
}

/** A value's segment, its label beside the middle and the point at its far end. */
function valueSegment(frame: PainterFrame, primitives: DrawingPrimitives, fn: TrigFunction, from: NumericPoint, to: NumericPoint,
  width: number, letter: string | null, offset: { x: number; y: number }): void {
  const color = TRIG_COLORS[fn]
  primitives.line({ type: 'lineSegment', A: from, B: to }, { color, width: width + 1 })
  const x = frame.transform.xToPixel((from.a + to.a) / 2) + offset.x
  const y = frame.transform.yToPixel((from.b + to.b) / 2) + offset.y
  primitives.textPixel(x, y, `${fn} θ`, { color })
  if (letter) primitives.point(to, { color, radius: 4, label: letter })
}

/**
 * The circle x² + y² = 1; with A the ray OA, the point A and the arc θ; each chosen value
 * as a coloured segment, as in the textbook figure: sin and cos are A's distances to the
 * axes, tan lies on x = 1, cot on y = 1, sec and csc on the axes where the tangent at A
 * meets them. Undefined values are not drawn.
 */
export function paintUnitCircle(frame: PainterFrame, primitives: DrawingPrimitives, circle: UnitCircle): void {
  if (!circle.visibility) return
  const width = circle.size + (isActive(frame, circle) ? 1 : 0)
  const style: StrokeStyle = { color: circle.color, width, dash: lineDash(circle.lineStyle, width) }
  primitives.circle(ORIGIN, 1, style)
  if (!circle.labelHidden && circle.name) {
    const radius = frame.transform.radiusToPixels(1)
    primitives.textPixel(frame.transform.xToPixel(0) - radius.x * 0.75, frame.transform.yToPixel(0) - radius.y * 0.75,
      circle.name, { color: circle.color })
  }
  const shown = new Set(circle.show ?? [])
  if (!shown.has('A')) return
  const A = unitPoint(circle.angle)
  const helper: StrokeStyle = { color: HELPER, width: 1.5, dash: HELPER_DASH }
  const thin = Math.max(1, width - 1)

  // tan and cot are read where the line OA meets x = 1 and y = 1, sec and csc where the tangent at A meets the axes.
  if (shown.has('tan')) primitives.line({ type: 'verLine', x: 1 }, helper)
  if (shown.has('cot')) primitives.line({ type: 'lineWithEquation', m: 0, n: 1 }, helper)
  if (shown.has('tan') || shown.has('cot')) primitives.line({ type: 'lineWithPoints', A: ORIGIN, B: A }, helper)
  if (shown.has('sec') || shown.has('csc')) {
    primitives.line({ type: 'lineWithPoints', A, B: { a: A.a - A.b, b: A.b + A.a } }, helper)
  }

  const value = (fn: TrigFunction) => shown.has(fn) ? trigValue(fn, circle.angle) : null
  const sin = value('sin')
  const cos = value('cos')
  const tan = value('tan')
  const cot = value('cot')
  const sec = value('sec')
  const csc = value('csc')
  const side = (positive: boolean) => positive ? 1 : -1
  // sin and cos sit inside the circle, towards O, clear of tan on x = 1.
  if (sin !== null) valueSegment(frame, primitives, 'sin', { a: A.a, b: 0 }, A, thin, null, { x: -side(A.a >= 0) * 26, y: 4 })
  if (cos !== null) valueSegment(frame, primitives, 'cos', { a: 0, b: A.b }, A, thin, null, { x: 0, y: side(A.b < 0) * 18 - 4 })
  if (tan !== null) valueSegment(frame, primitives, 'tan', { a: 1, b: 0 }, { a: 1, b: tan }, thin, 'B', { x: 30, y: 4 })
  if (cot !== null) valueSegment(frame, primitives, 'cot', { a: 0, b: 1 }, { a: cot, b: 1 }, thin, 'C', { x: 0, y: -10 })
  if (sec !== null) valueSegment(frame, primitives, 'sec', ORIGIN, { a: sec, b: 0 }, thin, 'E', { x: 0, y: 20 })
  if (csc !== null) valueSegment(frame, primitives, 'csc', ORIGIN, { a: 0, b: csc }, thin, 'D', { x: -30, y: 4 })

  // The ray OA, the arc θ and A are drawn last, over the values.
  primitives.line({ type: 'ray', A: ORIGIN, B: A }, { color: circle.color, width })
  const turn = ((circle.angle % 360) + 360) % 360
  const span = turn === 0 && circle.angle > 0 ? 360 : turn
  if (span > 0) primitives.arc(ORIGIN, ARC_RADIUS, 0, span, { color: circle.color, width: Math.max(1.5, width - 0.5) })
  const middle = span / 2 * Math.PI / 180
  const labelRadius = ARC_RADIUS + 22 / frame.transform.pixelsPerUnitX
  primitives.text({ a: labelRadius * Math.cos(middle), b: labelRadius * Math.sin(middle) },
    angleText(circle.angle, circle.angleUnit, formatDisplayNumber), { color: circle.color })
  primitives.point(A, { color: circle.color, radius: 4 + (isActive(frame, circle) ? 1 : 0), label: 'A' })
}
