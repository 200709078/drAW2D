import { expect, test } from '@playwright/test'
import {
  getCircleCircleIntersection,
  getLineCircleIntersection,
  getLineIntersection,
  getObjectIntersection,
} from '../src/geometry/intersections'
import type { IntersectionResult } from '../src/geometry/intersections'
import type { CircleLike, LineLike, NumericPoint } from '../src/geometry/primitives'

const point = (a: number, b: number): NumericPoint => ({ a, b })
const line = (A: NumericPoint, B: NumericPoint, segment = false): LineLike => ({
  type: segment ? 'lineSegment' : 'lineWithPoints', A, B,
})
const circle = (a: number, b: number, r: number): CircleLike => ({ type: 'circleR', A: point(a, b), r })

function points(result: IntersectionResult): NumericPoint[] {
  expect(result.status).toBe(true)
  if (!result.status) throw new Error(`Expected finite intersections, got ${result.reason}`)
  expect(result.points.every(p => Number.isFinite(p.a) && Number.isFinite(p.b))).toBe(true)
  return result.points
}

test('doğru kesişimi simetriktir ve birbirine yakın eğimler paralel sayılmaz', () => {
  const first = line(point(-2, -2), point(4, 4))
  const second = line(point(-2, 4), point(4, -2))
  const crossing = getLineIntersection(first, second)
  expect(crossing).toEqual(getLineIntersection(second, first))
  expect(crossing.status).toBe(true)
  if (crossing.status) {
    expect(crossing.a).toBeCloseTo(1, 12)
    expect(crossing.b).toBeCloseTo(1, 12)
  }
  const nearParallel = getLineIntersection(
    { type: 'lineWithEquation', m: 1e-9, n: 0 },
    { type: 'lineWithEquation', m: 2e-9, n: 1 },
  )
  expect(nearParallel.status).toBe(true)
  if (nearParallel.status) {
    expect(Math.abs((nearParallel.a + 1e9) / 1e9)).toBeLessThan(1e-12)
    expect(nearParallel.b).toBeCloseTo(-1, 12)
  }
})

test('doğru parçalarında ayrıklık, uç teması ve küçük pozitif örtüşme ayrılır', () => {
  const first = line(point(0, 0), point(1, 0), true)
  expect(getLineIntersection(first, line(point(2, 0), point(1, 0), true)))
    .toEqual({ status: true, reason: 'point', a: 1, b: 0 })
  expect(getLineIntersection(first, line(point(1 + 1e-10, 0), point(2, 0), true)))
    .toEqual({ status: false, reason: 'empty' })
  expect(getLineIntersection(first, line(point(1 - 1e-12, 0), point(2, 0), true)))
    .toEqual({ status: false, reason: 'infinite' })
  expect(getLineIntersection(first, line(point(0.5, -1), point(0.5, 1), true)))
    .toEqual({ status: true, reason: 'point', a: 0.5, b: 0 })
  expect(getLineIntersection(first, { type: 'verLine', x: 2 }))
    .toEqual({ status: false, reason: 'empty' })
  expect(getLineIntersection(first, { type: 'lineWithEquation', m: 0, n: 0 }))
    .toEqual({ status: false, reason: 'infinite' })
})

test('sıfır uzunluklu parça tek nokta, çakışan noktalardan geçen doğru geçersizdir', () => {
  const single = line(point(1, 0), point(1, 0), true)
  expect(getLineIntersection(single, line(point(0, 0), point(2, 0))))
    .toEqual({ status: true, reason: 'point', a: 1, b: 0 })
  expect(getLineIntersection(single, line(point(2, 0), point(2, 0), true)))
    .toEqual({ status: false, reason: 'empty' })
  expect(getLineIntersection(single, single)).toEqual({ status: true, reason: 'point', a: 1, b: 0 })
  expect(getLineIntersection(line(point(1, 0), point(1, 0)), single))
    .toEqual({ status: false, reason: 'empty' })
  expect(points(getLineCircleIntersection(single, circle(0, 0, 1)))).toEqual([point(1, 0)])
  expect(getLineCircleIntersection(single, circle(0, 0, 2)))
    .toEqual({ status: false, reason: 'empty', points: [] })
})

test('doğru çember kök sırası kararlıdır ve parça ile tanım aralığı sınırları uygulanır', () => {
  const round = circle(0, 0, 5)
  const forward = line(point(-10, 0), point(10, 0))
  const reverse = line(point(10, 0), point(-10, 0))
  expect(points(getLineCircleIntersection(forward, round))).toEqual([point(5, 0), point(-5, 0)])
  expect(getLineCircleIntersection(forward, round)).toEqual(getLineCircleIntersection(reverse, round))
  expect(points(getLineCircleIntersection({ type: 'verLine', x: 0 }, round)))
    .toEqual([point(0, 5), point(0, -5)])
  expect(points(getLineCircleIntersection(line(point(0, 0), point(5, 0), true), round)))
    .toEqual([point(5, 0)])
  expect(points(getLineCircleIntersection({ type: 'lineWithEquation', m: 0, n: 0, startX: -5, endX: 0 }, round)))
    .toEqual([point(-5, 0)])
  expect(getLineCircleIntersection(line(point(0, 0), point(4, 0), true), round))
    .toEqual({ status: false, reason: 'empty', points: [] })
})

test('çok küçük ve büyük çemberlerde karesi taşan veya sıfırlanan yarıçaplar çalışır', () => {
  for (const radius of [1e-200, 1e200]) {
    const round = circle(0, 0, radius)
    const roots = points(getLineCircleIntersection({ type: 'lineWithEquation', m: 0, n: 0 }, round))
    expect(roots).toHaveLength(2)
    expect(roots.map(p => p.a / radius)).toEqual([1, -1])
    const intersections = points(getCircleCircleIntersection(round, circle(radius, 0, radius)))
    expect(intersections).toHaveLength(2)
    for (const p of intersections) {
      expect(p.a / radius).toBeCloseTo(0.5, 12)
      expect(Math.abs(p.b / radius)).toBeCloseTo(Math.sqrt(3) / 2, 12)
    }
  }
  const closeCenters = points(getCircleCircleIntersection(circle(0, 0, 1e200), circle(1e-200, 0, 1e200)))
  expect(closeCenters).toEqual([point(5e-201, 1e200), point(5e-201, -1e200)])
  expect(points(getCircleCircleIntersection(circle(-1e308, 0, 1e308), circle(1e308, 0, 1e308))))
    .toEqual([point(0, 0)])
  const remoteOrigin = points(getLineCircleIntersection(
    line(point(-1e308, 0), point(0, 0)), circle(1e308, 0, 1e300),
  ))
  expect(remoteOrigin).toHaveLength(2)
  expect(remoteOrigin[0].a).toBeGreaterThan(1e308)
  expect(remoteOrigin[1].a).toBeLessThan(1e308)
})

test('teğet ile teğete yakın iki gerçek kök ayrılır ve boş durumlar sonludur', () => {
  const unit = circle(0, 0, 1)
  expect(points(getLineCircleIntersection({ type: 'lineWithEquation', m: 0, n: 1 }, unit)))
    .toEqual([point(0, 1)])
  expect(points(getLineCircleIntersection({ type: 'lineWithEquation', m: 0, n: 1 - 1e-12 }, unit)))
    .toHaveLength(2)
  expect(points(getCircleCircleIntersection(unit, circle(2, 0, 1)))).toEqual([point(1, 0)])
  expect(points(getCircleCircleIntersection(unit, circle(2 - 1e-12, 0, 1)))).toHaveLength(2)
  expect(getCircleCircleIntersection(unit, circle(2 + 1e-10, 0, 1)))
    .toEqual({ status: false, reason: 'empty', points: [] })
  expect(getCircleCircleIntersection(unit, unit)).toEqual({ status: false, reason: 'infinite', points: [] })
  expect(getCircleCircleIntersection(unit, circle(1e-20, 0, 1 + 1e-15)))
    .toEqual({ status: false, reason: 'empty', points: [] })
})

test('büyük koordinatlara öteleme geometrik kökleri ve girdi simetrisini korur', () => {
  const offset = 1e12
  const first = circle(offset, -offset, 5)
  const second = circle(offset + 6, -offset, 5)
  const expected = [point(offset + 3, -offset + 4), point(offset + 3, -offset - 4)]
  expect(points(getCircleCircleIntersection(first, second))).toEqual(expected)
  expect(points(getCircleCircleIntersection(second, first))).toEqual([...expected].reverse())
  const roots = points(getLineCircleIntersection(
    line(point(offset - 20, -offset), point(offset + 20, -offset)), first,
  ))
  expect(roots).toEqual([point(offset + 5, -offset), point(offset - 5, -offset)])
})

test('sıfır yarıçaplı çember tek nokta kesişimi verir', () => {
  const single = circle(3, 4, 0)
  expect(points(getCircleCircleIntersection(single, single))).toEqual([point(3, 4)])
  expect(points(getCircleCircleIntersection(single, circle(0, 0, 5)))).toEqual([point(3, 4)])
  expect(points(getLineCircleIntersection({ type: 'verLine', x: 3 }, single))).toEqual([point(3, 4)])
  expect(getLineCircleIntersection({ type: 'verLine', x: 0 }, single))
    .toEqual({ status: false, reason: 'empty', points: [] })
})

test('belge sınırı bozuk veriyi reddeder ve desteklenen nesneleri iki sırada işler', () => {
  const vertical = { type: 'verLine' as const, x: 0 }
  const round = circle(0, 0, 2)
  expect(getObjectIntersection(vertical, round)).toEqual(getObjectIntersection(round, vertical))
  for (const invalid of [null, undefined, {}, { type: 'lineSegment' }, { type: 'circleR', A: {} }, { type: 'verLine', x: Infinity }]) {
    expect(getObjectIntersection(invalid, round)).toEqual({ status: false, reason: 'empty', points: [] })
  }
  expect(getObjectIntersection(circle(0, 0, -1), round))
    .toEqual({ status: false, reason: 'empty', points: [] })
})
