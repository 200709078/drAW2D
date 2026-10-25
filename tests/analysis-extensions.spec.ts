import { expect, test } from '@playwright/test'
import { describeCard, editText } from '../src/app/object-cards'
import { parseCommand } from '../src/commands/parser'
import { prepareCommand } from '../src/commands/prepare'
import { recomputeDefinitions } from '../src/document/definitions'
import { resolveConstraints } from '../src/document/dependencies'
import { growPointSets } from '../src/document/point-sets'
import { asymptotesOf, curveOf, type GraphCurve } from '../src/geometry/analysis'
import type { GeometryDocumentObject, Parameter } from '../src/geometry/function-types'
import { createGeometryModels } from '../src/geometry/models'
import { createObjectName } from '../src/commands/names'

function documentWith(...sources: string[]) {
  const objects: GeometryDocumentObject[] = []
  const nextId = () => objects.length ? Math.max(...objects.map(object => object.id ?? 0)) + 1 : 0
  const prepare = (command: Parameters<typeof prepareCommand>[0]) =>
    prepareCommand(command, objects, { nextId: nextId(), randomColor: () => '#123456', range: { start: -10, end: 10 } })
  for (const source of sources) {
    const parsed = parseCommand(source)
    if (!parsed.ok) throw new Error(parsed.error)
    const prepared = prepare(parsed.command)
    if (!prepared.ok) throw new Error(`${source}: ${prepared.error}`)
    objects.push(...prepared.objects)
  }
  const models = createGeometryModels({
    createName: group => createObjectName(group, objects.map(object => object.name)), nextId, randomColor: () => '#123456',
  })
  const settle = () => {
    growPointSets(objects, (a, b) => {
      const point = new models.mPoint(a, b)
      objects.push(point)
      return point
    })
    resolveConstraints(objects)
  }
  settle()
  const named = (name: string) => objects.find(item => item.name === name)!
  const card = (name: string) => describeCard(named(name), { objects })
  const set = (name: string, value: number) => {
    (named(name) as Parameter).value = value
    recomputeDefinitions(objects, prepare, [name])
    settle()
  }
  return { objects, named, card, set }
}

const graph = (expression: string) => {
  const doc = documentWith(expression)
  return curveOf(doc.objects[0]!) as GraphCurve
}

test('analiz komutları fonksiyonu adı yerine ifadesiyle de alır; önce fonksiyon çizilir', () => {
  const doc = documentWith('Kök(x^2-4)', 'İntegral(x,0,2)', 'Kesiştir(x^2, x+2)')
  expect(doc.objects.map(object => `${object.type}:${object.name}`)).toEqual([
    'function:f', 'point:A', 'point:B', 'lineWithEquation:g', 'integral:a', 'function:h', 'lineWithEquation:p', 'point:C', 'point:D',
  ])
  expect(doc.card('A').output).toEqual(['A=(-2,0)', 'B=(2,0)'])
  expect(doc.card('A').input).toBe('A=Kök(f)')
  expect(doc.card('a').output).toEqual(['a = 2'])
  expect(doc.card('C').output).toEqual(['C=(-1,1)', 'D=(2,4)'])
  // A name that is not in the document is still an error, not a new function.
  expect(prepareCommand({ kind: 'root', function: 'q' }, doc.objects, { nextId: 99, randomColor: () => '#000' }))
    .toEqual({ ok: false, error: 'İfade oluşturulamadı. Nesne bulunamadı: q' })
})

test('parçalı fonksiyonun ekstremum ve dönüm noktaları parça parça bulunur; köşeler ekstremumdur', () => {
  const piecewise = documentWith('x^2-1, x<1; -(x-3)^2+4, x>=1', 'Ekstremum(f)')
  expect(piecewise.card('A').output).toEqual(['A=(0,-1)', 'B=(3,4)'])
  const cubic = documentWith('x^3, x<2; 8, x>=2', 'Dönüm(f)')
  expect(cubic.card('A').output).toEqual(['A=(0,0)'])
  // |x| has a corner at 0; 1/x² has a pole there, which is no extremum.
  expect(documentWith('abs(x)', 'Ekstremum(f)').card('A').output).toEqual(['A=(0,0)'])
  expect(documentWith('1/x^2', 'Ekstremum(f)').card('A').output).toEqual(['∅'])
  expect(documentWith('abs(x-1), x<3; 2, x>=3', 'Ekstremum(f)').card('A').output).toEqual(['A=(1,0)'])
})

test('Asimptot düşey, yatay ve eğik asimptotları bulur', () => {
  expect(asymptotesOf(graph('(x^2+1)/(x-1)'), -10, 10)).toEqual({ vertical: [1], lines: [{ m: 1, n: 1 }] })
  expect(asymptotesOf(graph('1/x'), -10, 10)).toEqual({ vertical: [0], lines: [{ m: 0, n: 0 }] })
  expect(asymptotesOf(graph('x/sqrt(x^2+1)'), -10, 10)).toEqual({ vertical: [], lines: [{ m: 0, n: -1 }, { m: 0, n: 1 }] })
  expect(asymptotesOf(graph('e^x'), -10, 10)).toEqual({ vertical: [], lines: [{ m: 0, n: 0 }] })
  expect(asymptotesOf(graph('log(E, x)'), -10, 10)).toEqual({ vertical: [0], lines: [] })
  expect(asymptotesOf(graph('1/sqrt(x)'), -10, 10)).toEqual({ vertical: [0], lines: [{ m: 0, n: 0 }] })
  // No asymptote: a parabola, a converging limit at a domain end, an oscillation.
  expect(asymptotesOf(graph('x^2'), -10, 10)).toEqual({ vertical: [], lines: [] })
  expect(asymptotesOf(graph('sqrt(x)'), -10, 10)).toEqual({ vertical: [], lines: [] })
  expect(asymptotesOf(graph('x+sin(x)'), -10, 10)).toEqual({ vertical: [], lines: [] })
  const tan = asymptotesOf(graph('tan(x)'), -4, 4)
  expect(tan.vertical).toHaveLength(2)
  tan.vertical.forEach((x, index) => expect(x).toBeCloseTo((index ? 1 : -1) * Math.PI / 2, 8))
})

test('Asimptot nesnesi kartında doğruları listeler ve kaynak değişince izler', () => {
  const doc = documentWith('a=1', 'Asimptot(1/(x-a))')
  expect(doc.named('g')).toMatchObject({ type: 'asymptote', lineStyle: 'dashed', start: -10, end: 10 })
  expect(doc.card('g')).toMatchObject({ input: 'g: Asimptot(f)', output: ['x = 1', 'y = 0'] })
  expect(editText(doc.named('g'), { objects: doc.objects })).toBe('g: Asimptot(f,-10,10)')
  doc.set('a', 3)
  expect(doc.card('g').output).toEqual(['x = 3', 'y = 0'])
  expect(documentWith('x^2', 'Asimptot(f)').card('g').output).toEqual(['∅'])
})

test('arama aralığı parametre olabilir; aralık değişince noktalar yeniden aranır', () => {
  const doc = documentWith('b=1', 'sin(x)', 'Kök(f,-b,b)')
  expect(doc.card('A').output).toEqual(['A=(0,0)'])
  expect(doc.named('A').definition).toEqual({ kind: 'root', function: 'f', start: { expression: '-b' }, end: { expression: 'b' } })
  expect(editText(doc.named('A'), { objects: doc.objects })).toBe('A = Kök(f,-1,1)')
  doc.set('b', 4)
  // The set grows: π and −π are new points of it.
  expect(doc.card('A').output).toEqual(['A=(-3.14,0)', 'B=(0,0)', 'C=(3.14,0)'])
  doc.set('b', 1)
  expect(doc.card('A').output).toEqual(['A=(0,0)'])
})

test('çözüm sayısı artınca küme yeni adlı noktalar alır; azalınca fazlası tanımsız kalır', () => {
  const doc = documentWith('c=-1', 'x^2+c', 'Kök(f)')
  expect(doc.card('A').output).toEqual(['A=(-1,0)', 'B=(1,0)'])
  doc.set('c', 1)
  expect(doc.card('A').output).toEqual(['∅'])
  doc.set('c', -4)
  expect(doc.card('A').output).toEqual(['A=(-2,0)', 'B=(2,0)'])
  const sine = documentWith('k=1', 'sin(k*x)', 'Kök(f,0.5,7)')
  expect(sine.card('A').output).toEqual(['A=(3.14,0)', 'B=(6.28,0)'])
  sine.set('k', 2)
  expect(sine.card('A').output).toHaveLength(4)
  expect(sine.objects.filter(object => object.type === 'point').map(object => object.name)).toEqual(['A', 'B', 'C', 'D'])
})

test('parçalı fonksiyonun aralık sınırları parametre olabilir', () => {
  const doc = documentWith('a=1', 'ParçalıFonksiyon(x^2, x<a; 2x, x>=a)')
  const sections = () => (doc.named('f') as Extract<GeometryDocumentObject, { type: 'sectionalFunctions' }>).secFuncs
  expect(sections().map(section => [section.startX, section.endX])).toEqual([[null, 1], [1, null]])
  doc.set('a', 2)
  expect(sections().map(section => [section.startX, section.endX])).toEqual([[null, 2], [2, null]])
  expect(doc.card('f').input).toBe('f(x) = {x^2, x<a; 2x, x>=a}')
  expect(parseCommand('ParçalıFonksiyon(x, x<a; 1, x>=a)')).toMatchObject({ ok: true })
  const empty = documentWith('a=1')
  const parsed = parseCommand('ParçalıFonksiyon(x, a<x<0)')
  expect(parsed.ok && prepareCommand(parsed.command, empty.objects, { nextId: 5, randomColor: () => '#000' }))
    .toEqual({ ok: false, error: 'İfade oluşturulamadı. Tanım aralığı boş olamaz.' })
})
