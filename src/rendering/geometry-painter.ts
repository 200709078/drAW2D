import {
  calculateAngle,
  distanceAB,
  getAngleMeasure,
  getCircleDescriptor,
  getLineDescriptor,
  getPositiveArcMeasure,
  getProjectionOnLine,
  numericPoint,
} from '../geometry/primitives'
import type { BasicGeometryObject, GeometryObject } from '../geometry/types'
import type {
  ArcMeasure,
  CircleTangent,
  CircularArc,
  Vector,
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
import type { AreaMeasure, EquationLine, SlopeMeasure, VerticalLine } from '../geometry/function-types'
import { arcData, polygonArea, slopeOf } from '../geometry/constructions'
import { getCircleTangentLines } from '../geometry/tangents'
import { formatDisplayNumber, formatMeasure } from '../math/format-display'
import { lineDash } from './line-style'
import type { DrawingPrimitives, PainterFrame, StrokeStyle, VisibleLine } from './painter-types'

const TEMP_COLOR = '#000000'

function isActive(frame: PainterFrame, object: GeometryObject<string>): boolean {
  return frame.activeId !== null && object.id === frame.activeId
}

function width(frame: PainterFrame, object: GeometryObject<string>, increment = 1): number {
  return object.size + (isActive(frame, object) ? increment : 0)
}

function color(object: GeometryObject<string>): string {
  return object.temp ? TEMP_COLOR : object.color
}

/** The object's stroke: its color, its width (wider while selected) and its line style. */
function stroke(frame: PainterFrame, object: GeometryObject<string>, styleOf: GeometryObject<string> = object): StrokeStyle {
  const lineWidth = width(frame, styleOf)
  return { color: color(object), width: lineWidth, dash: lineDash(styleOf.lineStyle, lineWidth) }
}

function label(object: GeometryObject<string>): string {
  return object.labelHidden ? '' : object.name ?? ''
}

/** `name=value`, or only the value when the name is hidden. */
function captioned(object: GeometryObject<string>, value: string): string {
  return object.temp || object.labelHidden ? value : `${object.name ?? ''}=${value}`
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
  const style = stroke(frame, circle)
  if (!primitives.circle({ a: descriptor.m, b: descriptor.n }, descriptor.r, style)) return
  if (!circle.temp) circleLabel(frame, primitives, { a: descriptor.m, b: descriptor.n }, descriptor.r, label(circle), style.color)
}

function paintRadiusCircle(frame: PainterFrame, primitives: DrawingPrimitives, circle: RadiusCircle): void {
  if (!circle.visibility) return
  const descriptor = getCircleDescriptor(circle)
  if (!descriptor.status) return
  const center = { a: descriptor.m, b: descriptor.n }
  const radiusPoint = { a: center.a + descriptor.r, b: center.b }
  primitives.point(radiusPoint, { color: TEMP_COLOR, radius: 5 })
  primitives.line({ type: 'lineSegment', A: center, B: radiusPoint }, { color: TEMP_COLOR, width: 3 })
  const style = stroke(frame, circle)
  if (!primitives.circle(center, descriptor.r, style)) return
  if (!circle.temp) circleLabel(frame, primitives, center, descriptor.r, label(circle), style.color)
  primitives.text({ a: (center.a + radiusPoint.a) / 2, b: center.b }, `r = ${formatDisplayNumber(descriptor.r)}`, {
    color: style.color,
  })
}

function paintVerticalLine(frame: PainterFrame, primitives: DrawingPrimitives, line: VerticalLine): void {
  if (!line.visibility) return
  const style = stroke(frame, line)
  const visible = primitives.line({ type: 'verLine', x: line.x }, style)
  if (visible && !line.temp) {
    primitives.textPixel(frame.transform.xToPixel(line.x) + 10, 15, label(line), { color: style.color })
  }
}

/** `owner` is the card object of an embedded line (a tangent's line): it gives width, style and label. */
export function paintEquationLine(
  frame: PainterFrame,
  primitives: DrawingPrimitives,
  line: EquationLine,
  owner: GeometryObject<string> = line,
): void {
  if (!line.visibility) return
  const style = stroke(frame, line, owner)
  const visible = primitives.line({
    type: 'lineWithEquation', m: line.m, n: line.n, startX: line.startX, endX: line.endX,
  }, style)
  if (visible && !line.temp && !owner.labelHidden) lineLabel(frame, primitives, visible, label(line), style.color)
}

function paintLineWithPoints(frame: PainterFrame, primitives: DrawingPrimitives, line: LineWithPoints): void {
  if (!line.visibility) return
  const style = stroke(frame, line)
  const visible = primitives.line({ type: 'lineWithPoints', A: line.A, B: line.B }, style)
  if (visible && !line.temp) lineLabel(frame, primitives, visible, label(line), style.color)
}

function paintRay(frame: PainterFrame, primitives: DrawingPrimitives, ray: Ray): void {
  if (!ray.visibility) return
  const style = stroke(frame, ray)
  const visible = primitives.line({ type: 'ray', A: ray.A, B: ray.B }, style)
  if (visible) lineLabel(frame, primitives, visible, label(ray), style.color)
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
  const style = stroke(frame, polygon)
  vertices.forEach((vertex, index) => {
    primitives.line({ type: 'lineSegment', A: vertex!, B: vertices[(index + 1) % vertices.length]! }, style)
  })
  const center = {
    a: vertices.reduce((sum, vertex) => sum + vertex!.a, 0) / vertices.length,
    b: vertices.reduce((sum, vertex) => sum + vertex!.b, 0) / vertices.length,
  }
  primitives.text(center, label(polygon), { color: style.color })
}

export function paintLineSegment(frame: PainterFrame, primitives: DrawingPrimitives, segment: LineSegment): void {
  if (!segment.visibility) return
  const style = segment.temp ? { ...stroke(frame, segment), dash: segment.lineDash } : stroke(frame, segment)
  const visible = primitives.line({ type: 'lineSegment', A: segment.A, B: segment.B }, style)
  if (!visible || segment.temp) return
  const startX = frame.transform.xToPixel(visible.start.a)
  const endX = frame.transform.xToPixel(visible.end.a)
  const startY = frame.transform.yToPixel(visible.start.b)
  const endY = frame.transform.yToPixel(visible.end.b)
  primitives.textPixel((startX + endX) / 2 - 10, (startY + endY) / 2 - 10, label(segment), { color: style.color })
}

function paintDistanceSegment(frame: PainterFrame, primitives: DrawingPrimitives, segment: DistanceSegment): void {
  if (!segment.visibility) return
  const A = numericPoint(segment.A)
  const B = numericPoint(segment.B)
  if (!A || !B) return
  const distance = distanceAB(A, B)
  primitives.text({ a: (A.a + B.a) / 2, b: (A.b + B.b) / 2 }, captioned(segment, `${formatMeasure(distance)} br`), {
    color: color(segment),
  })
}

function paintCircleTangent(frame: PainterFrame, primitives: DrawingPrimitives, tangent: CircleTangent): void {
  if (!tangent.visibility) return
  const result = getCircleTangentLines(tangent.A, tangent.circle)
  if (!result.status) return
  const style = { ...stroke(frame, tangent), color: tangent.color }
  for (const line of result.lines) primitives.line(line, style)
  const source = numericPoint(tangent.A)
  if (!tangent.temp && !tangent.labelHidden && source) {
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
  const style = stroke(frame, angle)
  primitives.line({ type: 'lineSegment', A, B }, style)
  primitives.line({ type: 'lineSegment', A: B, B: C }, style)
  const angles = calculateAngle({ type: 'angle', A, B, C })
  const span = getAngleMeasure({ type: 'angle', A, B, C })
  if (!Number.isFinite(angles.angleBA) || !Number.isFinite(span)) return
  primitives.arc(B, 0.2, angles.angleBA, span, { color: style.color, width: style.width + 1 })
  const midAngle = (angles.angleBA + span / 2) * Math.PI / 180
  const textRadius = 0.35
  const measure = `${formatMeasure(span)}°`
  primitives.text({
    a: B.a + textRadius * Math.cos(midAngle),
    b: B.b + textRadius * Math.sin(midAngle),
  }, captioned(angle, measure), { color: style.color })
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
  }, captioned(arc, measure), { color: color(arc) })
}

/** A segment from A to B with a filled arrowhead at B. */
function paintVector(frame: PainterFrame, primitives: DrawingPrimitives, vector: Vector): void {
  if (!vector.visibility) return
  const A = numericPoint(vector.A)
  const B = numericPoint(vector.B)
  if (!A || !B) return
  const style = stroke(frame, vector)
  const { ctx, transform } = frame
  const ax = transform.xToPixel(A.a)
  const ay = transform.yToPixel(A.b)
  const bx = transform.xToPixel(B.a)
  const by = transform.yToPixel(B.b)
  const length = Math.hypot(bx - ax, by - ay)
  if (!Number.isFinite(length) || length === 0) return
  const head = Math.min(length, 8 + 2 * style.width)
  const ux = (bx - ax) / length
  const uy = (by - ay) / length
  // The shaft stops at the head so a wide stroke does not blunt the tip.
  const end = { a: transform.pixelToX(bx - ux * head * 0.8), b: transform.pixelToY(by - uy * head * 0.8) }
  primitives.line({ type: 'lineSegment', A, B: end }, style)
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(bx, by)
  ctx.lineTo(bx - ux * head - uy * head * 0.45, by - uy * head + ux * head * 0.45)
  ctx.lineTo(bx - ux * head + uy * head * 0.45, by - uy * head - ux * head * 0.45)
  ctx.closePath()
  ctx.fillStyle = style.color
  ctx.fill()
  ctx.restore()
  if (!vector.temp) primitives.textPixel((ax + bx) / 2 - uy * 14, (ay + by) / 2 + ux * 14, label(vector), { color: style.color })
}

function paintCircularArc(frame: PainterFrame, primitives: DrawingPrimitives, arc: CircularArc): void {
  if (!arc.visibility) return
  const data = arcData(arc)
  if (!data) return
  const style = stroke(frame, arc)
  primitives.arc({ a: data.m, b: data.n }, data.r, data.start, data.span, style)
  const middle = (data.start + data.span / 2) * Math.PI / 180
  const labelRadius = data.r + 12 / frame.transform.pixelsPerUnitX
  if (!arc.temp) {
    primitives.text({ a: data.m + labelRadius * Math.cos(middle), b: data.n + labelRadius * Math.sin(middle) }, label(arc), { color: style.color })
  }
}

/** The measured value under the polygon's or circle's centre. */
function paintArea(frame: PainterFrame, primitives: DrawingPrimitives, area: AreaMeasure): void {
  if (!area.visibility) return
  const source = frame.objects.find(object => object.id === area.sourceId)
  let center: { a: number; b: number } | null = null
  let value: number | null = null
  if (source?.type === 'polygon') {
    const vertices = source.points.map(point => numericPoint(point))
    if (vertices.every(vertex => vertex !== null) && vertices.length) {
      center = {
        a: vertices.reduce((sum, vertex) => sum + vertex!.a, 0) / vertices.length,
        b: vertices.reduce((sum, vertex) => sum + vertex!.b, 0) / vertices.length,
      }
    }
    value = polygonArea(source.points)
  } else if (source?.type === 'circleR' || source?.type === 'circle2' || source?.type === 'circle3') {
    const circle = getCircleDescriptor(source)
    if (circle.status) {
      center = { a: circle.m, b: circle.n }
      value = Math.PI * circle.r * circle.r
    }
  }
  if (!center || value === null) return
  primitives.textPixel(frame.transform.xToPixel(center.a), frame.transform.yToPixel(center.b) + 20,
    captioned(area, formatMeasure(value)), { color: color(area) })
}

/** A slope triangle with a horizontal leg of one unit, at the point of the line nearest the view's centre. */
function paintSlope(frame: PainterFrame, primitives: DrawingPrimitives, slope: SlopeMeasure): void {
  if (!slope.visibility) return
  const source = frame.objects.find(object => object.id === slope.sourceId)
  const m = slopeOf(source)
  if (!source || m === null) return
  const descriptor = getLineDescriptor(source as Parameters<typeof getLineDescriptor>[0])
  if (!descriptor.status) return
  const { bounds } = frame.transform
  const center = descriptor.limited
    // A segment or ray: its first point, so the triangle stays on it.
    ? descriptor.origin
    : getProjectionOnLine(source as Parameters<typeof getProjectionOnLine>[0], (bounds.left + bounds.right) / 2, (bounds.bottom + bounds.top) / 2)
  if (!('a' in center)) return
  const P = { a: center.a, b: center.b }
  const Q = { a: P.a + 1, b: P.b }
  const R = { a: P.a + 1, b: P.b + m }
  const style = stroke(frame, slope)
  primitives.line({ type: 'lineSegment', A: P, B: Q }, style)
  primitives.line({ type: 'lineSegment', A: Q, B: R }, style)
  primitives.text({ a: P.a + 0.5, b: P.b }, '1', { color: style.color })
  primitives.textPixel(frame.transform.xToPixel(Q.a) + 8, frame.transform.yToPixel(P.b + m / 2), captioned(slope, formatMeasure(m)),
    { color: style.color, align: 'left' })
}

/** Paint one persistent geometric object without reading document or DOM state. */
export function paintGeometryObject(
  frame: PainterFrame,
  primitives: DrawingPrimitives,
  object: BasicGeometryObject | VerticalLine | EquationLine | AreaMeasure | SlopeMeasure,
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
    case 'vector': paintVector(frame, primitives, object); break
    case 'circularArc': paintCircularArc(frame, primitives, object); break
    case 'area': paintArea(frame, primitives, object); break
    case 'slope': paintSlope(frame, primitives, object); break
  }
}
