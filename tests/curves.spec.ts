import { expect, test } from '@playwright/test'
import { describeCard, editText } from '../src/app/object-cards'
import { hitTest } from '../src/app/hit-test'
import { parseCommand } from '../src/commands/parser'
import { prepareCommand } from '../src/commands/prepare'
import { recomputeDefinitions } from '../src/document/definitions'
import { resolveConstraints } from '../src/document/dependencies'
import type { GeometryDocumentObject, Parameter } from '../src/geometry/function-types'
import { implicitDistance, implicitPolylines, implicitRegion } from '../src/geometry/implicit'
import { createCoordinateTransform } from '../src/rendering/coordinate-transform'
import { bivariate } from '../src/rendering/curve-geometry'
import { createFunctionEvaluator } from '../src/rendering/function-evaluator'
import { parametricPolylines } from '../src/rendering/parametric-plotter'
import { realEvaluator } from '../src/math/function-algebra'

function documentWith(...sources: string[]) {
  const objects: GeometryDocumentObject[] = []
  const prepare = (command: Parameters<typeof prepareCommand>[0]) =>
    prepareCommand(command, objects, { nextId: objects.length ? Math.max(...objects.map(object => object.id ?? 0)) + 1 : 0,
      randomColor: () => '#123456' })
  for (const source of sources) {
    const parsed = parseCommand(source)
    if (!parsed.ok) throw new Error(parsed.error)
    const prepared = prepare(parsed.command)
    if (!prepared.ok) throw new Error(`${source}: ${prepared.error}`)
    objects.push(...prepared.objects)
  }
  resolveConstraints(objects)
  const named = (name: string) => objects.find(item => item.name === name)!
  const card = (name: string) => describeCard(named(name), { objects })
  const set = (name: string, value: number) => {
    (named(name) as Parameter).value = value
    recomputeDefinitions(objects, prepare, [name])
  }
  return { objects, named, card, set }
}

const command = (source: string) => {
  const parsed = parseCommand(source)
  if (!parsed.ok) throw new Error(parsed.error)
  return parsed.command
}

const grid = { left: -3, right: 3, bottom: -3, top: 3, columns: 120, rows: 120 }

test('x ve y içeren denklem kapalı eğridir; y = f(x), x = c ve parametre eskisi gibi kalır', () => {
  expect(command('x^2+y^2=4')).toEqual({ kind: 'implicit', left: 'x^2+y^2', right: '4' })
  expect(command('x = 2y')).toEqual({ kind: 'implicit', left: 'x', right: '2y' })
  expect(command('y^2 = x')).toEqual({ kind: 'implicit', left: 'y^2', right: 'x' })
  expect(command('y = 2x+1')).toEqual({ kind: 'function', expression: '2x+1' })
  expect(command('x = 3')).toEqual({ kind: 'verticalLine', x: 3 })
  expect(command('a = 2')).toEqual({ kind: 'parameter', name: 'a', value: 2 })
  expect(command('r = 2sin(3θ)')).toEqual({ kind: 'polar', expression: '2sin(3θ)', start: 0, end: 2 * Math.PI })
  expect(command('r = 2')).toEqual({ kind: 'parameter', name: 'r', value: 2 })
})

test('eşitsizlikler bölgedir; koşullu ifade ve parçalı fonksiyon bölge sayılmaz', () => {
  expect(command('y<x^2')).toEqual({ kind: 'inequality', left: 'y', operator: '<', right: 'x^2' })
  expect(command('x^2+y^2 ≤ 4')).toEqual({ kind: 'inequality', left: 'x^2+y^2', operator: '<=', right: '4' })
  expect(command('x>=1')).toEqual({ kind: 'inequality', left: 'x', operator: '>=', right: '1' })
  expect(command('y = x <= 0 ? -x : x')).toMatchObject({ kind: 'function' })
  expect(command('2x+1, x<0; x^2, x>=0')).toMatchObject({ kind: 'piecewise' })
  expect(parseCommand('1 < 2')).toEqual({ ok: false, error: 'Eşitsizlik x veya y içermeli.' })
  expect(parseCommand('x < y < 2')).toEqual({ ok: false, error: 'Tek bir eşitsizlik girin.' })
})

test('marching squares çemberi eğri üzerinde, kapalı tek bir çizgi olarak bulur', () => {
  const lines = implicitPolylines(bivariate('(x^2+y^2)-(4)'), grid)
  expect(lines).toHaveLength(1)
  const [circle] = lines
  expect(circle!.length).toBeGreaterThan(100)
  expect(circle![0]).toEqual(circle!.at(-1))
  // Crossings are refined onto the curve, far below a pixel (a cell is 0.05 units).
  for (const point of circle!) expect(Math.abs(Math.hypot(point.a, point.b) - 2)).toBeLessThan(1e-4)
})

test('kutup üzerinden geçen işaret değişimi eğri sayılmaz', () => {
  // y = tan(x) as an equation: no vertical segments at ±π/2.
  const lines = implicitPolylines(bivariate('(y)-(tan(x))'), { left: -2, right: 2, bottom: -3, top: 3, columns: 80, rows: 120 })
  for (const line of lines) for (const point of line) expect(Math.abs(point.b - Math.tan(point.a)) / (1 + Math.tan(point.a) ** 2)).toBeLessThan(1e-4)
})

test('bölge hücreleri eşitsizliği sağlayan alanı kaplar', () => {
  const polygons = implicitRegion(bivariate('(4)-(x^2+y^2)'), grid)
  let area = 0
  for (const polygon of polygons) {
    for (let index = 0; index < polygon.length; index++) {
      const p = polygon[index]!
      const q = polygon[(index + 1) % polygon.length]!
      area += (p.a * q.b - q.a * p.b) / 2
    }
  }
  expect(area).toBeCloseTo(4 * Math.PI, 1)
})

test('parametrik eğri pikselde düzgün örneklenir ve tanımsız yerde kesilir', () => {
  const transform = createCoordinateTransform({ width: 400, height: 400, minX: -2, minY: -2, scaleX: 100, scaleY: 100, unitX: 1, unitY: 1 })
  const circle = parametricPolylines({ x: realEvaluator('cos(x)'), y: realEvaluator('sin(x)'), start: 0, end: 2 * Math.PI }, transform, 400)
  expect(circle).toHaveLength(1)
  for (const point of circle[0]!) {
    expect(Math.hypot(transform.pixelToX(point.x), transform.pixelToY(point.y))).toBeCloseTo(1, 4)
  }
  // 1/t is undefined at 0: two branches.
  const broken = parametricPolylines({ x: realEvaluator('x'), y: realEvaluator('1/x'), start: -1, end: 1 }, transform, 400)
  expect(broken.length).toBe(2)
})

test('Eğri, Kutupsal, kapalı eğri ve eşitsizlik nesneleri kartta yazıldığı gibi görünür', () => {
  const doc = documentWith('Eğri(cos(t), sin(t), t, 0, 2π)', 'Kutupsal(1+cos(θ))', 'x^2+y^2=4', 'y<x^2', 'x^2+y^2<=1')
  expect(doc.named('f')).toMatchObject({ type: 'curve', xFunc: 'cos(x)', yFunc: 'sin(x)', variable: 't', start: 0, end: 2 * Math.PI })
  expect(doc.card('f').input).toBe('f: Eğri(cos(t),sin(t),t,0,2π)')
  expect(editText(doc.named('f'), { objects: doc.objects })).toBe('f: Eğri(cos(t),sin(t),t,0,2π)')
  expect(doc.named('g')).toMatchObject({ type: 'curve', polar: '1 + cos(x)', xFunc: '(1 + cos(x))*cos(x)' })
  expect(doc.card('g').input).toBe('g: Kutupsal(1+cos(θ),0,2π)')
  expect(doc.named('h')).toMatchObject({ type: 'implicit', func: '(x^2+y^2)-(4)' })
  expect(doc.card('h').input).toBe('h: x^2+y^2 = 4')
  expect(doc.named('a')).toMatchObject({ type: 'inequality', bound: { variable: 'y', expression: 'x^2', below: true } })
  expect(doc.card('a').input).toBe('a: y < x^2')
  expect(doc.named('b')).toMatchObject({ type: 'inequality', operator: '<=' })
  expect(doc.named('b')).not.toHaveProperty('bound')
})

test('parametreye bağlı eğriler parametreyle değişir', () => {
  const doc = documentWith('k=2', 'Eğri(k*cos(t), sin(t), t, 0, π)', 'x^2+y^2=k', 'y>k*x')
  expect(doc.named('f')).toMatchObject({ xFunc: '2 * cos(x)', end: Math.PI })
  doc.set('k', 3)
  expect(doc.named('f')).toMatchObject({ xFunc: '3 * cos(x)' })
  expect(doc.named('g')).toMatchObject({ func: '(x^2+y^2)-(3)' })
  expect(doc.named('a')).toMatchObject({ bound: { variable: 'y', expression: '3 * x', below: false } })
  expect(doc.card('g').input).toBe('g: x^2+y^2 = k')
})

test('kapalı eğri ve parametrik eğri seçilebilir; bölge yalnız sınırından seçilir', () => {
  const doc = documentWith('x^2+y^2=4', 'Eğri(t, t^2, t, -2, 2)', 'x^2+y^2<1')
  const transform = createCoordinateTransform({ width: 800, height: 800, minX: -4, minY: -4, scaleX: 100, scaleY: 100, unitX: 1, unitY: 1 })
  const options = { transform, evaluator: createFunctionEvaluator(), width: 800, height: 800 }
  expect(hitTest(doc.objects, { a: 2.03, b: 0 }, options)?.object.name).toBe('f')
  expect(hitTest(doc.objects, { a: 1, b: 1.02 }, options)?.object.name).toBe('g')
  expect(hitTest(doc.objects, { a: 0, b: 0.98 }, options)?.object.name).toBe('a')
  expect(hitTest(doc.objects, { a: 0.1, b: -0.3 }, options)).toBeNull()
  // |F| / |∇F| is the first-order distance: 2.25 / 5 at (2.5, 0).
  expect(implicitDistance(bivariate('(x^2+y^2)-(4)'), 2.5, 0, 1e-6)).toBeCloseTo(0.45, 5)
})
