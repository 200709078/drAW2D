import { getLineDescriptor, numericPoint } from '../geometry/primitives'
import type { LineDescriptor, LineLike, NumericPoint, PointLike } from '../geometry/primitives'
import type {
  DrawingPrimitives,
  MarkerStyle,
  PainterFrame,
  StrokeStyle,
  TextStyle,
  VisibleLine,
} from './painter-types'

const TAU = Math.PI * 2
const DEFAULT_FONT = 'bold 15px arial'

interface ParameterInterval {
  lower: number
  upper: number
}

function validStroke(style: StrokeStyle): boolean {
  return Number.isFinite(style.width) && style.width > 0
}

function linePoint(descriptor: LineDescriptor, parameter: number): NumericPoint | null {
  const a = descriptor.origin.a + descriptor.direction.a * parameter
  const b = descriptor.origin.b + descriptor.direction.b * parameter
  return Number.isFinite(a) && Number.isFinite(b) ? { a, b } : null
}

function restrictAxis(
  interval: ParameterInterval,
  origin: number,
  direction: number,
  lower: number,
  upper: number,
): boolean {
  if (direction === 0) return origin >= lower && origin <= upper
  const first = (lower - origin) / direction
  const last = (upper - origin) / direction
  if (!Number.isFinite(first) || !Number.isFinite(last)) return false
  interval.lower = Math.max(interval.lower, Math.min(first, last))
  interval.upper = Math.min(interval.upper, Math.max(first, last))
  return interval.lower <= interval.upper
}

/** Clip a parametric geometric line before converting it to canvas coordinates. */
export function getVisibleLine(frame: Pick<PainterFrame, 'transform'>, line: LineLike): VisibleLine | null {
  const descriptor = getLineDescriptor(line)
  if (!descriptor.status) return null
  const interval: ParameterInterval = { lower: descriptor.min, upper: descriptor.max }
  const { left, right, bottom, top } = frame.transform.bounds
  if (!restrictAxis(interval, descriptor.origin.a, descriptor.direction.a, left, right)
    || !restrictAxis(interval, descriptor.origin.b, descriptor.direction.b, bottom, top)) return null
  if (!Number.isFinite(interval.lower) || !Number.isFinite(interval.upper)) return null
  const start = linePoint(descriptor, interval.lower)
  const end = linePoint(descriptor, interval.upper)
  return start && end ? { start, end } : null
}

function withStroke(frame: PainterFrame, style: StrokeStyle, draw: () => void): void {
  if (!validStroke(style)) return
  const { ctx } = frame
  ctx.save()
  try {
    ctx.strokeStyle = style.color
    ctx.lineWidth = style.width
    ctx.setLineDash(style.dash ? [...style.dash] : [])
    draw()
    ctx.stroke()
  } finally {
    ctx.restore()
  }
}

function drawText(frame: PainterFrame, x: number, y: number, text: string, style: TextStyle): void {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return
  const { ctx } = frame
  ctx.save()
  try {
    ctx.fillStyle = style.color
    ctx.textAlign = style.align ?? 'center'
    ctx.font = style.font ?? DEFAULT_FONT
    ctx.fillText(text, x, y)
  } finally {
    ctx.restore()
  }
}

/**
 * Canvas-facing primitives use only finite math data and CSS-pixel transforms.
 * Every operation owns its Canvas style state, so guides and previews cannot leak it.
 */
export function createCanvasPrimitives(frame: PainterFrame): DrawingPrimitives {
  return {
    point(point: PointLike, style: MarkerStyle): void {
      const numeric = numericPoint(point)
      if (!numeric || !Number.isFinite(style.radius) || style.radius < 0) return
      const x = frame.transform.xToPixel(numeric.a)
      const y = frame.transform.yToPixel(numeric.b)
      if (!Number.isFinite(x) || !Number.isFinite(y)) return
      const { ctx } = frame
      ctx.save()
      try {
        ctx.beginPath()
        ctx.arc(x, y, style.radius, 0, TAU)
        ctx.fillStyle = style.color
        ctx.strokeStyle = style.outlineColor ?? 'black'
        ctx.lineWidth = 1
        ctx.fill()
        ctx.stroke()
        ctx.closePath()
        if (style.label) drawText(frame, x - 10, y - 5, style.label, { color: style.color })
      } finally {
        ctx.restore()
      }
    },

    line(line: LineLike, style: StrokeStyle): VisibleLine | null {
      const visible = getVisibleLine(frame, line)
      if (!visible || !validStroke(style)) return null
      const startX = frame.transform.xToPixel(visible.start.a)
      const startY = frame.transform.yToPixel(visible.start.b)
      const endX = frame.transform.xToPixel(visible.end.a)
      const endY = frame.transform.yToPixel(visible.end.b)
      if (![startX, startY, endX, endY].every(Number.isFinite)) return null
      withStroke(frame, style, () => {
        frame.ctx.beginPath()
        frame.ctx.moveTo(startX, startY)
        frame.ctx.lineTo(endX, endY)
      })
      return visible
    },

    circle(center: NumericPoint, radius: number, style: StrokeStyle): boolean {
      if (!Number.isFinite(center.a) || !Number.isFinite(center.b)
        || !Number.isFinite(radius) || radius < 0 || !validStroke(style)) return false
      const x = frame.transform.xToPixel(center.a)
      const y = frame.transform.yToPixel(center.b)
      const radii = frame.transform.radiusToPixels(radius)
      if (![x, y, radii.x, radii.y].every(Number.isFinite)) return false
      withStroke(frame, style, () => {
        frame.ctx.beginPath()
        frame.ctx.ellipse(x, y, radii.x, radii.y, 0, 0, TAU)
      })
      return true
    },

    text(point: NumericPoint, text: string, style: TextStyle): void {
      if (!Number.isFinite(point.a) || !Number.isFinite(point.b)) return
      drawText(frame, frame.transform.xToPixel(point.a), frame.transform.yToPixel(point.b), text, style)
    },

    textPixel(x: number, y: number, text: string, style: TextStyle): void {
      drawText(frame, x, y, text, style)
    },

    arc(center: NumericPoint, radius: number, start: number, span: number, style: StrokeStyle): void {
      if (!Number.isFinite(center.a) || !Number.isFinite(center.b)
        || !Number.isFinite(radius) || radius < 0
        || !Number.isFinite(start) || !Number.isFinite(span) || span <= 0 || !validStroke(style)) return
      const x = frame.transform.xToPixel(center.a)
      const y = frame.transform.yToPixel(center.b)
      const radii = frame.transform.radiusToPixels(radius)
      if (![x, y, radii.x, radii.y].every(Number.isFinite)) return
      const startRadians = -start * Math.PI / 180
      const endRadians = -(start + Math.min(span, 360)) * Math.PI / 180
      withStroke(frame, style, () => {
        frame.ctx.beginPath()
        if (span >= 360) frame.ctx.ellipse(x, y, radii.x, radii.y, 0, 0, TAU)
        else frame.ctx.ellipse(x, y, radii.x, radii.y, 0, startRadians, endRadians, true)
      })
    },
  }
}
