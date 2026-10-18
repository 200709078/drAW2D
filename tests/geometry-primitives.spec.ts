import { expect, test } from '@playwright/test'
import { bignumber, complex, fraction } from 'mathjs'
import {
  calculateAngle,
  createLineEquation,
  distanceAB,
  finiteCoordinate,
  geometryTolerance,
  getAngleMeasure,
  getCircle3RA,
  getCircleDescriptor,
  getLineDescriptor,
  getPointAngleOnCircle,
  getPositiveArcMeasure,
  getProjectionOnAngle,
  getProjectionOnCircle,
  getProjectionOnLine,
  getProjectionOnSegment,
  getReflectedPoint,
  isAngleInCcwArc,
  isPointAtCircleCenter,
  isPointOnCircleData,
  normalizeDegree,
  numericPoint,
} from '../src/geometry/primitives'

test('geometri sınırı yalnız sonlu gerçek koordinatları kabul eder', () => {
  expect(finiteCoordinate('1.25e2')).toBe(125)
  expect(finiteCoordinate(bignumber('1.125'))).toBe(1.125)
  expect(finiteCoordinate(fraction(2, 5))).toBe(0.4)
  expect(finiteCoordinate(3n)).toBe(3)
  expect(finiteCoordinate(complex(3, 0))).toBe(3)
  for (const value of ['', '  ', 'NaN', Infinity, Number.NaN, complex(1, 1), bignumber('1e1000')]) {
    expect(finiteCoordinate(value)).toBeNull()
  }
  expect(numericPoint({ a: '1.25', b: fraction(3, 2) })).toEqual({ a: 1.25, b: 1.5 })
  expect(numericPoint({ a: 'invalid', b: 2 })).toBeNull()
  expect(numericPoint({ a: 1, b: 2, geometryValid: false })).toBeNull()
  expect(getCircleDescriptor({ type: 'circleR', A: { a: 0, b: 0 }, r: -2 })).toEqual({ status: false })
})

test('uzaklık ve yansıma küçük ve büyük koordinatlarda taşmadan hesaplanır', () => {
  for (const scale of [1e-250, 1, 1e200]) {
    expect(distanceAB({ a: 0, b: 0 }, { a: 3 * scale, b: 4 * scale }) / scale).toBeCloseTo(5, 12)
  }
  const source = { a: 1e308, b: -1e308 }
  expect(getReflectedPoint(source, source)).toEqual(source)
  const reflected = getReflectedPoint({ a: '1.25', b: -3 }, { a: 2, b: 1 })
  expect(reflected).toEqual({ a: 2.75, b: 5 })
  expect(getReflectedPoint(reflected, { a: 2, b: 1 })).toEqual({ a: 1.25, b: -3 })
  expect(Number.isNaN(distanceAB({ a: complex(0, 1), b: 0 }, source))).toBe(true)
  expect(geometryTolerance(1e-200)).toBeGreaterThan(0)
  expect(geometryTolerance(1e-200)).toBeLessThan(1e-210)
})

test('doğru yönü normalize edilir, tanım aralığı ve nokta parçalar korunur', () => {
  const steep = getLineDescriptor({ type: 'lineWithEquation', m: 1e308, n: 2 })
  expect(steep.status).toBe(true)
  if (!steep.status) return
  expect(Math.hypot(steep.direction.a, steep.direction.b)).toBeCloseTo(1, 14)
  expect(steep.direction.a).toBeGreaterThan(0)
  const domain = getLineDescriptor({ type: 'lineWithEquation', m: 2, n: -1, startX: -3, endX: 5 })
  expect(domain.status).toBe(true)
  if (!domain.status) return
  expect(domain.min * domain.direction.a).toBeCloseTo(-3, 14)
  expect(domain.max * domain.direction.a).toBeCloseTo(5, 14)
  expect(domain.limited).toBe(true)
  const A = { a: 3, b: 2 }
  expect(getLineDescriptor({ type: 'lineWithPoints', A, B: A })).toEqual({ status: false })
  expect(getProjectionOnSegment(A, A, 7, 5)).toEqual({ status: true, a: 3, b: 2, distance: 5 })
  expect(getLineDescriptor({ type: 'lineWithEquation', m: 2, n: 0, startX: 5, endX: 1 })).toEqual({ status: false })
  expect(createLineEquation({ a: 2, b: 5 }, { a: 4, b: 9 })).toEqual({ m: 2, c: 1 })
  expect(Number.isNaN(createLineEquation({ a: 2, b: 0 }, { a: 2, b: 1 }).m)).toBe(true)
})

test('izdüşüm ortogonaldir; segment ve denklem sınırlarına kırpılır', () => {
  for (const scale of [1e-200, 1, 1e150]) {
    const projected = getProjectionOnLine({
      type: 'lineWithPoints', A: { a: 0, b: 0 }, B: { a: 3 * scale, b: 4 * scale },
    }, 4 * scale, -3 * scale)
    expect(projected.status).toBe(true)
    if (!projected.status) continue
    expect(projected.a / scale).toBeCloseTo(0, 12)
    expect(projected.b / scale).toBeCloseTo(0, 12)
    expect(projected.distance / scale).toBeCloseTo(5, 12)
  }
  expect(getProjectionOnSegment({ a: 0, b: 0 }, { a: 3, b: 0 }, 8, 4))
    .toEqual({ status: true, a: 3, b: 0, distance: Math.sqrt(41) })
  expect(getProjectionOnLine({ type: 'lineWithEquation', m: 0, n: 2, startX: 0, endX: 3 }, -1, 2))
    .toEqual({ status: true, a: 0, b: 2, distance: 1 })
  const nearest = getProjectionOnAngle({
    type: 'angle', A: { a: 3, b: 0 }, B: { a: 0, b: 0 }, C: { a: 0, b: 3 },
  }, 0.2, 2)
  expect(nearest.status).toBe(true)
  if (nearest.status) {
    expect(nearest.a).toBeCloseTo(0, 14)
    expect(nearest.b).toBeCloseTo(2, 14)
    expect(nearest.distance).toBeCloseTo(0.2, 14)
  }
  expect(getProjectionOnLine({ type: 'verLine', x: 1e308 }, 1e308, -1e308))
    .toEqual({ status: true, a: 1e308, b: -1e308, distance: 0 })
})

test('üç noktalı çemberin merkezi büyük ötelenmeden ve boyuttan bağımsızdır', () => {
  for (const scale of [1e-200, 1, 1e150]) {
    const circle = getCircle3RA({
      type: 'circle3', A: { a: scale, b: 0 }, B: { a: 0, b: scale }, C: { a: -scale, b: 0 },
    })
    expect(circle.status).toBe(true)
    if (!circle.status) continue
    expect(circle.m / scale).toBeCloseTo(0, 12)
    expect(circle.n / scale).toBeCloseTo(0, 12)
    expect(circle.r / scale).toBeCloseTo(1, 12)
  }
  const pan = 1e12
  expect(getCircle3RA({
    type: 'circle3', A: { a: pan + 5, b: -pan }, B: { a: pan, b: -pan + 5 }, C: { a: pan - 5, b: -pan },
  })).toEqual({ status: true, m: pan, n: -pan, r: 5 })
  expect(getCircle3RA({
    type: 'circle3', A: { a: 1e-200, b: 0 }, B: { a: 2e-200, b: 0 }, C: { a: 3e-200, b: 0 },
  })).toEqual({ status: false })
})

test('çember izdüşümü merkezde deterministiktir ve girdi nesnesini değiştirmez', () => {
  const A = Object.freeze({ a: 2, b: 3 })
  const circle = Object.freeze({ type: 'circleR' as const, A, r: 5 })
  expect(getProjectionOnCircle(circle, 2, 3)).toEqual({ status: true, a: 7, b: 3, distance: 5 })
  expect(getProjectionOnCircle({ ...circle, r: 0 }, 5, 7)).toEqual({ status: true, a: 2, b: 3, distance: 5 })
  const projection = getProjectionOnCircle(circle, 5, 7)
  expect(projection.status).toBe(true)
  if (projection.status) {
    expect(projection.a).toBeCloseTo(5, 14)
    expect(projection.b).toBeCloseTo(7, 14)
    expect(projection.distance).toBeCloseTo(0, 14)
  }
  const descriptor = getCircleDescriptor(circle)
  if (!descriptor.status) throw new Error('Valid circle expected')
  expect(isPointAtCircleCenter(A, descriptor, 0)).toBe(true)
  expect(isPointOnCircleData({ a: 2, b: 8 }, descriptor, 0)).toBe(true)
  expect(isPointOnCircleData({ a: 2, b: 8.02 }, descriptor)).toBe(false)
})

test('dikey açılar ve bütün bölgeler atan2 ile doğru ölçülür', () => {
  const B = { a: 0, b: 0 }
  const A = { a: 1, b: 0 }
  for (const [C, expected] of [
    [{ a: 0, b: 1 }, 90], [{ a: -1, b: 0 }, 180], [{ a: 0, b: -1 }, 270],
  ] as const) {
    const angle = { type: 'angle' as const, A, B, C }
    expect(calculateAngle(angle)).toEqual({ angleBA: 0, angleBC: expected })
    expect(getAngleMeasure(angle)).toBe(expected)
  }
  expect(getAngleMeasure({ type: 'angle', A: { a: 0, b: 1 }, B, C: A })).toBe(270)
  expect(Number.isNaN(getAngleMeasure({ type: 'angle', A: B, B, C: A }))).toBe(true)
  expect(normalizeDegree(-450)).toBe(270)
  expect(normalizeDegree(1e-20)).toBe(1e-20)
})

test('pozitif yay sıfır dereceyi aşar ve uç noktaları dışarıda bırakır', () => {
  const circle = { type: 'circleR' as const, A: { a: 0, b: 0 }, r: 1 }
  const arc = getPositiveArcMeasure({ a: 0, b: -1 }, { a: 0, b: 1 }, circle)
  expect(arc).toEqual({ circleData: { status: true, m: 0, n: 0, r: 1 }, startAngle: 270, span: 180 })
  if (!arc) return
  expect(getPointAngleOnCircle({ a: -1, b: 0 }, arc.circleData)).toBe(180)
  expect(isAngleInCcwArc(0, arc.startAngle, arc.span)).toBe(true)
  expect(isAngleInCcwArc(270, arc.startAngle, arc.span)).toBe(false)
  expect(isAngleInCcwArc(90, arc.startAngle, arc.span)).toBe(false)
  expect(isAngleInCcwArc(180, arc.startAngle, arc.span)).toBe(false)
})
