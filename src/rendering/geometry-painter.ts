import {
  calculateAngle,
  distanceAB,
  getAngleMeasure,
  getCircleDescriptor,
  getPositiveArcMeasure,
  numericPoint,
} from '../geometry/primitives'
import type { BasicGeometryObject, GeometryObject } from '../geometry/types'
import type {
  ArcMeasure,
  CircleTangent,
  DistanceSegment,
  GeometryAngle,
  GeometryCircle,
  GeometryPoint,
  LineSegment,
  Polygon,
  Ray,
  LineWithPoints,
  RadiusCircle,
} from '../geometry/types'
import type { EquationLine, VerticalLine } from '../geometry/function-types'
import { getCircleTangentLines } from '../geometry/tangents'
import { formatDisplayNumber, formatMeasure } from '../math/format-display'
import type { DrawingPrimitives, PainterFrame, StrokeStyle, VisibleLine } from './painter-types'

const TEMP_COLOR = '#000000'

function isActive(frame: PainterFrame, object: GeometryObject<string>): boolean {
  return frame.activeId !== null && object.id === frame.activeId
}

function width(frame: PainterFrame, object: GeometryObject<string>, increment = 1): number {
  return object.size + (isActive(frame, object) ? increment : 0)
}

function color(object: GeometryObject<string>, useOwnColorForTemp = false): string {
  return object.temp && !useOwnColorForTemp ? TEMP_COLOR : object.color
}

function label(object: GeometryObject<string>): string {
  return object.name ?? ''
}

function lineLabel(frame: PainterFrame, primitives: DrawingPrimitives, visible: VisibleLine, text: string, color: string): void {
  const startX = frame.transform.xToPixel(visible.start.a)
  const endX = frame.transform.xToPixel(visible.end.a)
  const startY = frame.transform.yToPixel(visible.start.b)
  const endY = frame.transform.yToPixel(visible.end.b)
  const x = startX + (endX - startX) * 0.2
  const y = Math.max(15, Math.min(frame.height - 5, startY + (endY - startY) * 0.2 - 8))
  primitives.textPixel(x + 5, y, text, { color })
}

function circleLabel(
  frame: PainterFrame,
  primitives: DrawingPrimitives,
  center: { a: number; b: number },
  radius: number,
  text: string,
  color: string,
): void {
  const canvasRadius = frame.transform.radiusToPixels(radius)
  primitives.textPixel(
    frame.transform.xToPixel(center.a) - canvasRadius.x * 0.75,
    frame.transform.yToPixel(center.b) - canvasRadius.y * 0.75,
    text,
    { color },
  )
}

export function paintPoint(frame: PainterFrame, primitives: DrawingPrimitives, point: GeometryPoint): void {
  if (!point.visibility) return
  primitives.point(point, {
    color: color(point),
    radius: point.size + (isActive(frame, point) ? 2 : 0),
    label: point.temp ? null : label(point),
  })
}

function paintCircle(frame: PainterFrame, primitives: DrawingPrimitives, circle: GeometryCircle): void {
  if (!circle.visibility) return
  const descriptor = getCircleDescriptor(circle)
  if (!descriptor.status) return
  const stroke: StrokeStyle = { color: color(circle), width: width(frame, circle) }
  if (!primitives.circle({ a: descriptor.m, b: descriptor.n }, descriptor.r, stroke)) return
  if (!circle.temp) circleLabel(frame, primitives, { a: descriptor.m, b: descriptor.n }, descriptor.r, label(circle), stroke.color)
}

function paintRadiusCircle(frame: PainterFrame, primitives: DrawingPrimitives, circle: RadiusCircle): void {
  if (!circle.visibility) return
  const descriptor = getCircleDescriptor(circle)
  if (!descriptor.status) return
  const center = { a: descriptor.m, b: descriptor.n }
  const radiusPoint = { a: center.a + descriptor.r, b: center.b }
  primitives.point(radiusPoint, { color: TEMP_COLOR, radius: 5 })
  primitives.line({ type: 'lineSegment', A: center, B: radiusPoint }, { color: TEMP_COLOR, width: 3 })
  const stroke: StrokeStyle = { color: color(circle), width: width(frame, circle) }
  if (!primitives.circle(center, descriptor.r, stroke)) return
  if (!circle.temp) circleLabel(frame, primitives, center, descriptor.r, label(circle), stroke.color)
  primitives.text({ a: (center.a + radiusPoint.a) / 2, b: center.b }, `r = ${formatDisplayNumber(descriptor.r)}`, {
    color: stroke.color,
  })
}

function paintVerticalLine(frame: PainterFrame, primitives: DrawingPrimitives, line: VerticalLine): void {
  if (!line.visibility) return
  const stroke: StrokeStyle = { color: color(line), width: width(frame, line) }
  const visible = primitives.line({ type: 'verLine', x: line.x }, stroke)
  if (visible && !line.temp) {
    primitives.textPixel(frame.transform.xToPixel(line.x) + 10, 15, label(line), { color: stroke.color })
  }
}

export function paintEquationLine(
  frame: PainterFrame,
  primitives: DrawingPrimitives,
  line: EquationLine,
  useOwnColorForTemp = false,
): void {
  if (!line.visibility) return
  const stroke: StrokeStyle = {
    color: color(line, useOwnColorForTemp),
    width: width(frame, line),
  }
  const visible = primitives.line({
    type: 'lineWithEquation', m: line.m, n: line.n, startX: line.startX, endX: line.endX,
  }, stroke)
  if (visible && !line.temp) lineLabel(frame, primitives, visible, label(line), stroke.color)
}

export function paintLineWithPoints(
  frame: PainterFrame,
  primitives: DrawingPrimitives,
  line: LineWithPoints,
  useOwnColorForTemp = false,
): void {
  if (!line.visibility) return
  const stroke: StrokeStyle = {
    color: color(line, useOwnColorForTemp),
    width: width(frame, line),
  }
  const visible = primitives.line({ type: 'lineWithPoints', A: line.A, B: line.B }, stroke)
  if (visible && !line.temp) lineLabel(frame, primitives, visible, label(line), stroke.color)
}

function paintRay(frame: PainterFrame, primitives: DrawingPrimitives, ray: Ray): void {
  if (!ray.visibility) return
  const stroke: StrokeStyle = { color: color(ray), width: width(frame, ray) }
  const visible = primitives.line({ type: 'ray', A: ray.A, B: ray.B }, stroke)
  if (visible) lineLabel(frame, primitives, visible, label(ray), stroke.color)
}

/** Translucent interior, edges and the name at the vertex centroid. */
function paintPolygon(frame: PainterFrame, primitives: DrawingPrimitives, polygon: Polygon): void {
  if (!polygon.visibility) return
  const vertices = polygon.points.map(point => numericPoint(point))
  if (vertices.some(vertex => vertex === null) || vertices.length < 3) return
  const { ctx, transform } = frame
  ctx.save()
  ctx.beginPath()
  vertices.forEach((vertex, index) => {
    const x = transform.xToPixel(vertex!.a)
    const y = transform.yToPixel(vertex!.b)
    if (index === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.closePath()
  ctx.fillStyle = `${color(polygon)}33`
  ctx.fill()
  ctx.restore()
  const stroke: StrokeStyle = { color: color(polygon), width: width(frame, polygon) }
  vertices.forEach((vertex, index) => {
    primitives.line({ type: 'lineSegment', A: vertex!, B: vertices[(index + 1) % vertices.length]! }, stroke)
  })
  const center = {
    a: vertices.reduce((sum, vertex) => sum + vertex!.a, 0) / vertices.length,
    b: vertices.reduce((sum, vertex) => sum + vertex!.b, 0) / vertices.length,
  }
  primitives.text(center, label(polygon), { color: stroke.color })
}

export function paintLineSegment(frame: PainterFrame, primitives: DrawingPrimitives, segment: LineSegment): void {
  if (!segment.visibility) return
  const stroke: StrokeStyle = {
    color: color(segment),
    width: width(frame, segment),
    dash: segment.temp ? segment.lineDash : undefined,
  }
  const visible = primitives.line({ type: 'lineSegment', A: segment.A, B: segment.B }, stroke)
  if (!visible || segment.temp) return
  const startX = frame.transform.xToPixel(visible.start.a)
  const endX = frame.transform.xToPixel(visible.end.a)
  const startY = frame.transform.yToPixel(visible.start.b)
  const endY = frame.transform.yToPixel(visible.end.b)
  primitives.textPixel((startX + endX) / 2 - 10, (startY + endY) / 2 - 10, label(segment), { color: stroke.color })
}

function paintDistanceSegment(frame: PainterFrame, primitives: DrawingPrimitives, segment: DistanceSegment): void {
  if (!segment.visibility) return
  const A = numericPoint(segment.A)
  const B = numericPoint(segment.B)
  if (!A || !B) return
  const distance = distanceAB(A, B)
  const text = segment.temp
    ? `${formatMeasure(distance)} br`
    : `${label(segment)}=${formatMeasure(distance)} br`
  primitives.text({ a: (A.a + B.a) / 2, b: (A.b + B.b) / 2 }, text, { color: color(segment) })
}

function paintCircleTangent(frame: PainterFrame, primitives: DrawingPrimitives, tangent: CircleTangent): void {
  if (!tangent.visibility) return
  const result = getCircleTangentLines(tangent.A, tangent.circle)
  if (!result.status) return
  const stroke: StrokeStyle = { color: tangent.color, width: width(frame, tangent) }
  for (const line of result.lines) primitives.line(line, stroke)
  const source = numericPoint(tangent.A)
  if (!tangent.temp && source) {
    primitives.textPixel(frame.transform.xToPixel(source.a) + 12, frame.transform.yToPixel(source.b) - 12,
      label(tangent), { color: tangent.color })
  }
}

function paintAngle(frame: PainterFrame, primitives: DrawingPrimitives, angle: GeometryAngle): void {
  if (!angle.visibility) return
  const A = numericPoint(angle.A)
  const B = numericPoint(angle.B)
  const C = numericPoint(angle.C)
  if (!A || !B || !C) return
  const stroke: StrokeStyle = { color: color(angle), width: width(frame, angle) }
  primitives.line({ type: 'lineSegment', A, B }, stroke)
  primitives.line({ type: 'lineSegment', A: B, B: C }, stroke)
  const angles = calculateAngle({ type: 'angle', A, B, C })
  const span = getAngleMeasure({ type: 'angle', A, B, C })
  if (!Number.isFinite(angles.angleBA) || !Number.isFinite(span)) return
  primitives.arc(B, 0.2, angles.angleBA, span, { color: stroke.color, width: stroke.width + 1 })
  const midAngle = (angles.angleBA + span / 2) * Math.PI / 180
  const textRadius = 0.35
  const measure = `${formatMeasure(span)}°`
  primitives.text({
    a: B.a + textRadius * Math.cos(midAngle),
    b: B.b + textRadius * Math.sin(midAngle),
  }, angle.temp ? measure : `${label(angle)}=${measure}`, { color: stroke.color })
}

function paintArcMeasure(_frame: PainterFrame, primitives: DrawingPrimitives, arc: ArcMeasure): void {
  if (!arc.visibility) return
  const info = getPositiveArcMeasure(arc.A, arc.B, arc.circle)
  if (!info) return
  const midAngle = (info.startAngle + info.span / 2) * Math.PI / 180
  const labelRadius = info.circleData.r + 0.25
  const measure = `${formatMeasure(info.span)}°`
  primitives.text({
    a: info.circleData.m + labelRadius * Math.cos(midAngle),
    b: info.circleData.n + labelRadius * Math.sin(midAngle),
  }, arc.temp ? measure : `${label(arc)}=${measure}`, { color: color(arc) })
}

/** Paint one persistent geometric object without reading document or DOM state. */
export function paintGeometryObject(
  frame: PainterFrame,
  primitives: DrawingPrimitives,
  object: BasicGeometryObject | VerticalLine | EquationLine,
): void {
  switch (object.type) {
    case 'point': paintPoint(frame, primitives, object); break
    case 'circleR': paintRadiusCircle(frame, primitives, object); break
    case 'circle2':
    case 'circle3': paintCircle(frame, primitives, object); break
    case 'verLine': paintVerticalLine(frame, primitives, object); break
    case 'lineWithEquation': paintEquationLine(frame, primitives, object); break
    case 'lineWithPoints': paintLineWithPoints(frame, primitives, object); break
    case 'lineSegment': paintLineSegment(frame, primitives, object); break
    case 'ray': paintRay(frame, primitives, object); break
    case 'polygon': paintPolygon(frame, primitives, object); break
    case 'distanceSegment': paintDistanceSegment(frame, primitives, object); break
    case 'circleTangent': paintCircleTangent(frame, primitives, object); break
    case 'angle': paintAngle(frame, primitives, object); break
    case 'arcMeasure': paintArcMeasure(frame, primitives, object); break
  }
}
