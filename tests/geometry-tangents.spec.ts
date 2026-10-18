import { expect, test } from '@playwright/test'
import { bignumber, complex, fraction } from 'mathjs'
import type { CircleLike, NumericPoint } from '../src/geometry/primitives'
import {
  getCircleTangentLines,
  getCircleTangentTouchPoint,
  getProjectionOnCircleTangent,
} from '../src/geometry/tangents'

function circle(a: number, b: number, r: number): CircleLike {
  return { type: 'circleR', A: { a, b }, r }
}

function assertTangency(source: NumericPoint, center: NumericPoint, radius: number) {
  const result = getCircleTangentLines(source, circle(center.a, center.b, radius))
  expect(result.status).toBe(true)
  if (!result.status) throw new Error(result.reason)
  expect(result.lines).toHaveLength(2)
  for (const [index, touch] of result.tangentPoints.entries()) {
    const radialX = (touch.a - center.a) / radius
    const radialY = (touch.b - center.b) / radius
    expect(Math.hypot(radialX, radialY)).toBeCloseTo(1, 12)
    const directionX = (source.a - touch.a) / radius
    const directionY = (source.b - touch.b) / radius
    expect(radialX * directionX + radialY * directionY).toBeCloseTo(0, 12)
    expect(result.lines[index].A).toEqual(source)
    expect(result.lines[index].B).toEqual(touch)
    expect(Object.keys(touch).sort()).toEqual(['a', 'b'])
  }
  return result
}

test('dış noktadan iki teğet yarıçapa diktir ve dallar kararlı sırada kalır', () => {
  const result = assertTangency({ a: 3, b: 2 }, { a: 0, b: 0 }, 2)
  expect(result.tangentPoints[0].a).toBeCloseTo(0, 12)
  expect(result.tangentPoints[0].b).toBeCloseTo(2, 12)
  expect(result.tangentPoints[1].a).toBeCloseTo(24 / 13, 12)
  expect(result.tangentPoints[1].b).toBeCloseTo(-10 / 13, 12)
})

test('öteleme ve çok küçük/büyük ölçekler teğet geometrisini korur', () => {
  for (const scale of [1e-9, 1, 1e100, 1e-200]) {
    assertTangency(
      { a: 13 * scale, b: -3 * scale },
      { a: 10 * scale, b: -5 * scale },
      2 * scale,
    )
  }
})

test('çember üzerindeki noktanın tek teğeti sonlu ve iki ayrı uçludur', () => {
  for (const scale of [1e-200, 1, 1e100]) {
    const result = getCircleTangentLines({ a: 3 * scale, b: 0 }, circle(0, 0, 3 * scale))
    expect(result.status).toBe(true)
    if (!result.status) throw new Error(result.reason)
    expect(result.lines).toHaveLength(1)
    expect(result.tangentPoints).toEqual([{ a: 3 * scale, b: 0 }])
    expect(result.lines[0].B.a).toBe(3 * scale)
    expect(result.lines[0].B.b).toBe(3 * scale)
  }
})

test('taşan merkez uzaklığı ve büyük ötelemede uçların sayısal çözünürlüğü ele alınır', () => {
  const distant = getCircleTangentLines({ a: 1e308, b: 0 }, circle(-1e308, 0, 1e308))
  expect(distant.status).toBe(true)
  if (!distant.status) throw new Error(distant.reason)
  expect(distant.tangentPoints[0].a / 1e308).toBeCloseTo(-0.5, 12)
  expect(distant.tangentPoints[0].b / 1e308).toBeCloseTo(Math.sqrt(3) / 2, 12)
  expect(distant.lines.flatMap(line => [line.A.a, line.A.b, line.B.a, line.B.b]).every(Number.isFinite)).toBe(true)

  const surface = getCircleTangentLines({ a: 1e100, b: 1 }, circle(1e100, 0, 1))
  expect(surface.status).toBe(true)
  if (!surface.status) throw new Error(surface.reason)
  expect(surface.lines[0].B.a).not.toBe(surface.lines[0].A.a)
  expect(surface.lines[0].B.b).toBe(1)
  expect(Number.isFinite(surface.lines[0].B.a)).toBe(true)
})

test('iç nokta, sıfır yarıçap, geçersiz çember ve nokta açık hata verir', () => {
  expect(getCircleTangentLines({ a: 1e-12, b: 0 }, circle(0, 0, 2e-12)))
    .toEqual({ status: false, reason: 'inside', lines: [] })
  expect(getCircleTangentLines({ a: 1, b: 0 }, circle(0, 0, 0)))
    .toEqual({ status: false, reason: 'degenerate', lines: [] })
  expect(getCircleTangentLines({ a: 1, b: 0 }, circle(0, 0, -1)))
    .toEqual({ status: false, reason: 'invalidCircle', lines: [] })
  expect(getCircleTangentLines({ a: NaN, b: 0 }, circle(0, 0, 1)))
    .toEqual({ status: false, reason: 'invalidPoint', lines: [] })
  expect(getCircleTangentLines({ a: complex(1, 2), b: 0 }, circle(0, 0, 1)).status).toBe(false)
})

test('sayısal metin ve mathjs değerleri saf sayısal çıktıya dönüştürülür', () => {
  const result = getCircleTangentLines(
    { a: '3', b: bignumber(2) },
    { type: 'circleR', A: { a: fraction(0), b: complex(0) }, r: '2' },
  )
  expect(result.status).toBe(true)
  if (!result.status) throw new Error(result.reason)
  expect(result.tangentPoints[0].b).toBeCloseTo(2, 12)
  expect(result.lines[0].A).toEqual({ a: 3, b: 2 })
})

test('izdüşüm seçilmiş dalı korur, aksi durumda en yakın teğeti seçer', () => {
  const tangent = { type: 'circleTangent' as const, A: { a: 3, b: 2 }, circle: circle(0, 0, 2) }
  const nearest = getProjectionOnCircleTangent(tangent, 0, 3)
  expect(nearest).toEqual({ status: true, a: 0, b: 2, distance: 1, lineIndex: 0 })
  const selected = getProjectionOnCircleTangent(tangent, 0, 3, 1)
  expect(selected.status).toBe(true)
  if (!selected.status) throw new Error('Teğet izdüşümü bekleniyordu')
  expect(selected.lineIndex).toBe(1)
  expect(selected.distance).toBeGreaterThan(1)
  expect(getProjectionOnCircleTangent(tangent, 0, 3, 99)).toEqual(nearest)
  expect(getProjectionOnCircleTangent(tangent, Infinity, 0)).toEqual({ status: false })
  const touch = getCircleTangentTouchPoint(tangent, 0)
  expect(touch?.a).toBeCloseTo(0, 12)
  expect(touch?.b).toBeCloseTo(2, 12)
  expect(getCircleTangentTouchPoint(tangent, 2)).toBeNull()
  expect(getCircleTangentTouchPoint(tangent, -1)).toBeNull()
})
