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
  }
}
