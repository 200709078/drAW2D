import {
  calculateAngle,
  distanceAB,
  getAngleMeasure,
  getCircleDescriptor,
  numericPoint,
} from '../geometry/primitives'
import type { CircleLike, LineLike, PointLike } from '../geometry/primitives'
import { formatMeasure } from '../math/format-display'
import { createCanvasPrimitives } from './canvas-primitives'
import type { MarkerStyle, PainterFrame, StrokeStyle } from './painter-types'

const PREVIEW_COLOR = '#000000'

export interface PreviewPointStyle extends Partial<MarkerStyle> {}
export interface PreviewLineStyle extends Partial<StrokeStyle> {}

export interface TransientPainter {
  point(point: PointLike, style?: PreviewPointStyle): void
  line(line: LineLike, style?: PreviewLineStyle): void
  distance(A: PointLike, B: PointLike, style?: PreviewLineStyle): void
  circle(circle: CircleLike, style?: PreviewLineStyle): void
  angle(A: PointLike, B: PointLike, C: PointLike, style?: PreviewLineStyle): void
  /** A segment with an arrowhead at B. */
  vector(A: PointLike, B: PointLike, style?: PreviewLineStyle): void
  /** Mathematical angles in degrees, counterclockwise. */
  arc(center: { a: number; b: number }, radius: number, start: number, span: number, style?: PreviewLineStyle): void
}

function markerStyle(style: PreviewPointStyle): MarkerStyle {
  return {
    color: style.color ?? PREVIEW_COLOR,
    radius: style.radius ?? 5,
    outlineColor: style.outlineColor,
    label: style.label,
  }
}

function strokeStyle(style: PreviewLineStyle): StrokeStyle {
  return {
    color: style.color ?? PREVIEW_COLOR,
    width: style.width ?? 3,
    dash: style.dash,
  }
}

/** Draw tool feedback from plain descriptors; no document model is allocated or mutated. */
export function createTransientPainter(frame: PainterFrame): TransientPainter {
  const primitives = createCanvasPrimitives(frame)
  return {
    point(point, style = {}) {
      primitives.point(point, markerStyle(style))
    },

    line(line, style = {}) {
      primitives.line(line, strokeStyle(style))
    },

    distance(A, B, style = {}) {
      const start = numericPoint(A)
      const end = numericPoint(B)
      if (!start || !end) return
      const distance = distanceAB(start, end)
      primitives.text({ a: (start.a + end.a) / 2, b: (start.b + end.b) / 2 },
        `${formatMeasure(distance)} br`, { color: style.color ?? PREVIEW_COLOR })
    },

    circle(circle, style = {}) {
      const descriptor = getCircleDescriptor(circle)
      if (!descriptor.status) return
      primitives.circle({ a: descriptor.m, b: descriptor.n }, descriptor.r, strokeStyle(style))
    },

    angle(A, B, C, style = {}) {
      const start = numericPoint(A)
      const center = numericPoint(B)
      const end = numericPoint(C)
      if (!start || !center || !end) return
      const stroke = strokeStyle(style)
      primitives.line({ type: 'lineSegment', A: start, B: center }, stroke)
      primitives.line({ type: 'lineSegment', A: center, B: end }, stroke)
      const angle = { type: 'angle' as const, A: start, B: center, C: end }
      const angles = calculateAngle(angle)
      const span = getAngleMeasure(angle)
      if (Number.isFinite(angles.angleBA) && Number.isFinite(span)) {
        primitives.arc(center, 0.2, angles.angleBA, span, { ...stroke, width: stroke.width + 1 })
      }
    },

    vector(A, B, style = {}) {
      const start = numericPoint(A)
      const end = numericPoint(B)
      if (!start || !end) return
      const stroke = strokeStyle(style)
      primitives.line({ type: 'lineSegment', A: start, B: end }, stroke)
      const { transform, ctx } = frame
      const ax = transform.xToPixel(start.a)
      const ay = transform.yToPixel(start.b)
      const bx = transform.xToPixel(end.a)
      const by = transform.yToPixel(end.b)
      const length = Math.hypot(bx - ax, by - ay)
      if (!(length > 0)) return
      const head = Math.min(length, 12)
      const ux = (bx - ax) / length
      const uy = (by - ay) / length
      ctx.save()
      ctx.beginPath()
      ctx.moveTo(bx, by)
      ctx.lineTo(bx - ux * head - uy * head * 0.45, by - uy * head + ux * head * 0.45)
      ctx.lineTo(bx - ux * head + uy * head * 0.45, by - uy * head - ux * head * 0.45)
      ctx.closePath()
      ctx.fillStyle = stroke.color
      ctx.fill()
      ctx.restore()
    },

    arc(center, radius, start, span, style = {}) {
      primitives.arc(center, radius, start, span, strokeStyle(style))
    },
  }
}
