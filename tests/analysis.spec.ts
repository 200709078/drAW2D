import { expect, test } from '@playwright/test'
import { describeCard, editText } from '../src/app/object-cards'
import { parseCommand } from '../src/commands/parser'
import { prepareCommand } from '../src/commands/prepare'
import { collectDependents, resolveConstraints } from '../src/document/dependencies'
import { recomputeDefinitions } from '../src/document/definitions'
import { definiteIntegral, zerosOf } from '../src/geometry/analysis'
import type { GeometryDocumentObject, Parameter } from '../src/geometry/function-types'
import { realEvaluator } from '../src/math/function-algebra'

function documentWith(...sources: string[]) {
  const objects: GeometryDocumentObject[] = []
  const prepare = (command: Parameters<typeof prepareCommand>[0]) =>
    prepareCommand(command, objects, { nextId: objects.length ? Math.max(...objects.map(object => object.id ?? 0)) + 1 : 0,
      randomColor: () => '#123456', range: { start: -10, end: 10 } })
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
    resolveConstraints(objects)
  }
  return { objects, named, card, set, prepare }
}

const close = (values: number[], expected: number[]) => {
  expect(values).toHaveLength(expected.length)
  values.forEach((value, index) => expect(value).toBeCloseTo(expected[index]!, 9))
}

test('kökler işaret değişimi ve çift kökle bulunur; kutup ve sıçrama kök sayılmaz', () => {
  close(zerosOf(realEvaluator('x^2-4'), -10, 10), [-2, 2])
  close(zerosOf(realEvaluator('x^2'), -3, 3.7), [0])
  close(zerosOf(realEvaluator('(x-1)^2*(x+2)'), -5, 5), [-2, 1])
  close(zerosOf(realEvaluator('sin(x)'), -7, 7), [-2 * Math.PI, -Math.PI, 0, Math.PI, 2 * Math.PI])
  close(zerosOf(realEvaluator('tan(x)'), -2, 2), [0])
  close(zerosOf(realEvaluator('1/x'), -3, 3), [])
  close(zerosOf(realEvaluator('floor(x)-0.5'), -3, 3), [])
  close(zerosOf(realEvaluator('sqrt(x)-1'), -3, 3), [1])
  expect(zerosOf(realEvaluator('x'), 2, 1)).toEqual([])
})

test('Kök, Ekstremum ve Dönüm noktaları x sırasıyla oluşur ve tek kartta listelenir', () => {
  const doc = documentWith('x^2-4', 'Kök(f)', 'x^3-3x', 'Ekstremum(g)', 'Dönüm(g)')
  expect(doc.card('A')).toEqual({ input: 'A=Kök(f)', output: ['A=(-2,0)', 'B=(2,0)'], sliders: [] })
  expect(doc.card('C')).toEqual({ input: 'C=Ekstremum(g)', output: ['C=(-1,2)', 'D=(1,-2)'], sliders: [] })
  expect(doc.card('E')).toEqual({ input: 'E=Dönüm(g)', output: ['E=(0,0)'], sliders: [] })
  expect(editText(doc.named('A'), { objects: doc.objects })).toBe('A = Kök(f,-10,10)')
  // An explicit range limits the search.
  const ranged = documentWith('sin(x)', 'Kök(f,0.5,7)')
  expect(ranged.card('A').output).toEqual(['A=(3.14,0)', 'B=(6.28,0)'])
  expect(prepareCommand({ kind: 'root', function: 'f', start: 2, end: 1 }, ranged.objects, { nextId: 99, randomColor: () => '#000' }))
    .toEqual({ ok: false, error: 'İfade oluşturulamadı. Arama aralığının başlangıcı bitişinden küçük olmalı.' })
  const point = documentWith('(1,1)')
  expect(prepareCommand({ kind: 'root', function: 'A' }, point.objects, { nextId: 9, randomColor: () => '#000' }))
    .toEqual({ ok: false, error: 'İfade oluşturulamadı. Bir fonksiyon girin: A' })
})

test('Kesiştir fonksiyonları fonksiyon, doğru, dik doğru ve çemberle kesiştirir', () => {
  const doc = documentWith('x^2', 'x+2', 'Kesiştir(f,g)', 'x=1.5', 'Kesiştir(f,denk1)', 'Çember((0,0),2)', 'Kesiştir(f,a)',
    'Doğru((0,1),(1,1))', 'Kesiştir(f,h)')
  expect(doc.card('A').output).toEqual(['A=(-1,1)', 'B=(2,4)'])
  expect(doc.card('C').output).toEqual(['C=(1.50,2.25)'])
  const circle = doc.card('E').output
  expect(circle).toHaveLength(2)
  // x² meets x² + y² = 4 where y = (√17 − 1)/2.
  const y = (Math.sqrt(17) - 1) / 2
  for (const line of circle) expect(line).toMatch(new RegExp(`=\\(-?${Math.sqrt(y).toFixed(2)},${y.toFixed(2)}\\)$`))
  expect(doc.card('I').output).toEqual(['I=(-1,1)', 'J=(1,1)'])
})

test('kaynak fonksiyon parametreyle değişince analiz noktaları izler; olmayan çözüm ∅ olur', () => {
  const doc = documentWith('a=1', 'a*x^2-4', 'Kök(f)')
  expect(doc.card('A').output).toEqual(['A=(-2,0)', 'B=(2,0)'])
  doc.set('a', 4)
  expect(doc.card('A').output).toEqual(['A=(-1,0)', 'B=(1,0)'])
  doc.set('a', -1)
  expect(doc.card('A').output).toEqual(['∅'])
  doc.set('a', 1)
  expect(doc.card('A').output).toEqual(['A=(-2,0)', 'B=(2,0)'])
})

test('belirli integral alanı hesaplar; sınırlar parametre olabilir', () => {
  expect(definiteIntegral(realEvaluator('x^2'), 0, 3)).toBeCloseTo(9, 9)
  expect(definiteIntegral(realEvaluator('sin(x)'), 0, Math.PI)).toBeCloseTo(2, 9)
  expect(definiteIntegral(realEvaluator('x'), 2, 0)).toBeCloseTo(-2, 9)
  expect(definiteIntegral(realEvaluator('sqrt(x)'), -1, 1)).toBeNull()
  const doc = documentWith('b=3', 'x^2', 'İntegral(f,0,b)')
  expect(doc.card('a')).toEqual({ input: 'a = İntegral(f,0,b)', output: ['a = 9'], sliders: [] })
  doc.set('b', 1)
  expect(doc.card('a').output).toEqual(['a = 0.33'])
  expect(editText(doc.named('a'), { objects: doc.objects })).toBe('a = İntegral(f,0,b)')
})

test('fonksiyon üzerindeki nokta fonksiyonu izler; fonksiyonu silmek ona bağlı her şeyi siler', () => {
  const doc = documentWith('a=1', 'a*x^2', 'Kök(f)', 'İntegral(f,0,1)')
  doc.objects.push({ type: 'point', name: 'P', id: 50, a: 2, b: 0, color: '#000', visibility: true, size: 3, temp: false,
    onOther: [{ type: 'onFunction', functionId: doc.named('f').id }] })
  resolveConstraints(doc.objects)
  expect(doc.named('P')).toMatchObject({ a: 2, b: 4 })
  doc.set('a', 2)
  expect(doc.named('P')).toMatchObject({ a: 2, b: 8 })
  const removed = [...collectDependents(doc.objects, [doc.named('f').id!])].map(id => doc.objects.find(object => object.id === id)!.name)
  // a·x² has one (double) root, so the root owner A has no second point.
  expect(removed.sort()).toEqual(['A', 'P', 'b', 'f'].sort())
})

test('analiz komutları ayrıştırılır', () => {
  expect(parseCommand('Kök(f)')).toEqual({ ok: true, command: { kind: 'root', function: 'f' } })
  expect(parseCommand('kok(f, 0, 2pi)')).toEqual({ ok: true, command: { kind: 'root', function: 'f', start: 0, end: 2 * Math.PI } })
  expect(parseCommand('Ekstremum(g)')).toMatchObject({ ok: true, command: { kind: 'extremum' } })
  expect(parseCommand('DönümNoktası(g)')).toMatchObject({ ok: true, command: { kind: 'inflection' } })
  expect(parseCommand('Integral(f,0,1)')).toEqual({ ok: true, command: { kind: 'integral', function: 'f', start: 0, end: 1 } })
  expect(parseCommand('Kesiştir(f,g,-1,1)')).toEqual({ ok: true, command: { kind: 'intersect', first: 'f', second: 'g', start: -1, end: 1 } })
  for (const source of ['Kök()', 'Kök(f,1)', 'İntegral(f,1)', 'Kesiştir(f,g,1)']) expect(parseCommand(source).ok, source).toBe(false)
})
