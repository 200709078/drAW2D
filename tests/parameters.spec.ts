import { expect, test } from '@playwright/test'
import { parseCommand } from '../src/commands/parser'
import { prepareCommand } from '../src/commands/prepare'
import { collectDependents } from '../src/document/dependencies'
import { equalModelGraphs } from '../src/document/graph-equality'
import { recomputeDefinitions, redefineParameter, setParameterRange } from '../src/document/definitions'
import type { GeometryDocumentObject, Parameter } from '../src/geometry/function-types'

function documentWith(...sources: string[]) {
  const objects: GeometryDocumentObject[] = []
  const prepare = (command: Parameters<typeof prepareCommand>[0]) =>
    prepareCommand(command, objects, { nextId: objects.length, randomColor: () => '#123456' })
  const run = (source: string) => {
    const parsed = parseCommand(source)
    if (!parsed.ok) throw new Error(parsed.error)
    const prepared = prepare(parsed.command)
    if (!prepared.ok) throw new Error(prepared.error)
    objects.push(...prepared.objects)
  }
  sources.forEach(run)
  const named = (name: string) => {
    const object = objects.find(item => item.name === name)
    if (!object) throw new Error(`Nesne yok: ${name}`)
    return object
  }
  const parameter = (name: string) => named(name) as Parameter
  const set = (name: string, value: number) => {
    parameter(name).value = value
    recomputeDefinitions(objects, prepare, [name])
  }
  return { objects, prepare, run, named, parameter, set }
}

test('sayısal argümanlar bilinmeyen adlarda ifade olarak kalır; a=2 parametre komutudur', () => {
  expect(parseCommand('a=2')).toEqual({ ok: true, command: { kind: 'parameter', name: 'a', value: 2 } })
  expect(parseCommand('b=a+1')).toEqual({ ok: true, command: { kind: 'parameter', name: 'b', value: { expression: 'a+1' } } })
  expect(parseCommand('(a,2)')).toEqual({ ok: true, command: { kind: 'point', point: { a: { expression: 'a' }, b: 2 } } })
  expect(parseCommand('Çember((0,0),2a)')).toMatchObject({ ok: true, command: { kind: 'circleRadius', radius: { expression: '2a' } } })
  // A bare name stays a point reference; preparation decides whether it is a parameter.
  expect(parseCommand('Çember((0,0),r)')).toMatchObject({ ok: true, command: { kind: 'circle2', B: { kind: 'reference', name: 'r' } } })
  expect(parseCommand('x=k')).toEqual({ ok: true, command: { kind: 'verticalLine', x: { expression: 'k' } } })
  expect(parseCommand('Teğet(x^2,t)')).toEqual({ ok: true, command: { kind: 'tangent', expression: 'x^2', at: { expression: 't' } } })
})

test('parametreye bağlı nesneler kaydırıcıyla yeniden hesaplanır; kimlik ve başvurular korunur', () => {
  const doc = documentWith('a=2', '(a,1)', 'Çember(A,a)', 'a*x^2+1', 'f(x+1)', 'x=a')
  const point = doc.named('A')
  const circle = doc.named('b')
  const curve = doc.named('f')
  const shifted = doc.named('g')
  const ids = doc.objects.map(object => object.id)
  expect(point).toMatchObject({ a: 2, b: 1 })
  expect(circle).toMatchObject({ r: 2 })
  expect(curve).toMatchObject({ type: 'function', func: '2 * x ^ 2 + 1' })
  expect(shifted).toMatchObject({ type: 'function' })
  doc.set('a', 3)
  expect(point).toMatchObject({ a: 3, b: 1 })
  expect(circle).toMatchObject({ r: 3, A: point })
  expect(curve).toMatchObject({ func: '3 * x ^ 2 + 1' })
  // g uses f, which uses a: the change propagates through named functions.
  expect(shifted.type === 'function' && shifted.func).toContain('3')
  expect(doc.named('denk1')).toMatchObject({ x: 3 })
  expect(doc.objects.map(object => object.id)).toEqual(ids)
})

test('doğru olup olmama parametre değerinden bağımsızdır', () => {
  const doc = documentWith('a=1', 'a*x+2', 'x^a', 'x/a')
  expect(doc.named('f').type).toBe('lineWithEquation')
  // x^a is x when a = 1, but a slider can make it a curve: it is created as a function.
  expect(doc.named('g').type).toBe('function')
  expect(doc.named('h').type).toBe('function')
  doc.set('a', -2)
  expect(doc.named('f')).toMatchObject({ m: -2, n: 2 })
  expect(doc.named('g')).toMatchObject({ type: 'function' })
})

test('öğretim komutları sabit yaklaşım değeri için kaydırıcı oluşturur', () => {
  const doc = documentWith('Teğet(x^2,1)', 'TeğetH(x^2,1)', 'TeğetX(x^2,1)', 'Limit(1/x,2)')
  const parameters = doc.objects.filter(object => object.type === 'parameter') as Parameter[]
  expect(parameters.map(parameter => [parameter.name, parameter.value, parameter.min, parameter.max, parameter.step])).toEqual([
    ['a', 1, -5, 5, 0.1],
    ['b', 1, -5, 5, 0.1], ['h', 2, 0, 10, 0.1],
    ['c', 1, -5, 5, 0.1], ['d', 2, -5, 5, 0.1],
    ['δ', 0.4, 0, 2, 0.01],
  ])
  const tangent = doc.objects.find(object => object.type === 'tangent')!
  expect(tangent.definition).toEqual({ kind: 'tangent', expression: 'x^2', at: { expression: 'a' } })
  doc.set('a', 3)
  expect(tangent).toMatchObject({ approachVal: 3, tngLine: { m: 6, n: -9 } })
  doc.set('h', 0.5)
  expect(doc.objects.find(object => object.type === 'tangentHX' && object.haveH)).toMatchObject({ h: 0.5 })
  doc.set('δ', 0.1)
  expect(doc.objects.find(object => object.type === 'limit')).toMatchObject({ approachValRight: 2.1, approachValLeft: 1.9 })
  // An explicit parameter argument creates no slider.
  const explicit = documentWith('t=1', 'Teğet(x^2,t)')
  expect(explicit.objects.filter(object => object.type === 'parameter')).toHaveLength(1)
})

test('değerlendirilemeyen tanım son değerini korur ve geçerli olunca toparlanır', () => {
  const doc = documentWith('a=4', 'Çember((0,0),a)', 'Dizi(1/n,1,a)')
  doc.set('a', -1)
  expect(doc.named('b')).toMatchObject({ r: 4, invalid: true })
  expect(doc.named('c')).toMatchObject({ end: 4, invalid: true })
  doc.set('a', 2)
  expect(doc.named('b')).toMatchObject({ r: 2 })
  expect(doc.named('b').invalid).toBeUndefined()
  expect(doc.named('c')).toMatchObject({ end: 2 })
})

test('bağımlı parametreler, yeniden tanımlama ve döngü engeli', () => {
  const doc = documentWith('a=2', 'b=a+1', 'c=2b')
  expect(doc.parameter('c').value).toBe(6)
  doc.set('a', 5)
  expect([doc.parameter('b').value, doc.parameter('c').value]).toEqual([6, 12])
  // a = c would make a depend on itself through b and c.
  expect(redefineParameter(doc.objects, doc.parameter('a'), { expression: 'c' })).toEqual({
    ok: false, error: 'Döngüsel parametre tanımı kullanılamaz.',
  })
  expect(redefineParameter(doc.objects, doc.parameter('a'), 8)).toEqual({ ok: true })
  expect(doc.parameter('a')).toMatchObject({ value: 8, max: 8 })
  // An earlier parameter can be redefined in terms of a later one.
  const order = documentWith('p=1', 'q=10', 'p*x')
  expect(redefineParameter(order.objects, order.parameter('p'), { expression: 'q/2' })).toEqual({ ok: true })
  order.set('q', 4)
  expect(order.parameter('p').value).toBe(2)
  expect(order.named('f')).toMatchObject({ m: 2 })
  expect(prepareCommand({ kind: 'parameter', name: 'x', value: 1 }, [], { nextId: 0, randomColor: () => '#000' }))
    .toEqual({ ok: false, error: 'İfade oluşturulamadı. Parametre adı olarak kullanılamaz: x' })
  expect(prepareCommand({ kind: 'parameter', name: 'sin', value: 1 }, [], { nextId: 0, randomColor: () => '#000' }).ok).toBe(false)
})

test('kaydırıcı aralığı doğrulanır ve değer aralıkta tutulur', () => {
  const doc = documentWith('a=4')
  expect(setParameterRange(doc.parameter('a'), 0, 3, 0.5)).toEqual({ ok: true })
  expect(doc.parameter('a')).toMatchObject({ min: 0, max: 3, step: 0.5, value: 3 })
  for (const [min, max, step] of [[3, 3, 1], [0, 3, 0], [0, 3, 5], [Number.NaN, 3, 1]]) {
    expect(setParameterRange(doc.parameter('a'), min!, max!, step!).ok).toBe(false)
  }
})

test('parametreyi silmek ona dayanan bütün tanımları da siler', () => {
  const doc = documentWith('a=2', 'b=a+1', '(b,0)', 'Çember((0,0),a)', 'x^2', 'Teğet(x^2,a)')
  const removed = [...collectDependents(doc.objects, [doc.named('a').id!])].map(id => doc.objects.find(object => object.id === id)!.name)
  expect(removed.sort()).toEqual(['A', 'a', 'b', 'c', 'g'].sort())
})

test('değeri değişmeyen yeniden hesaplama belge grafiğini değiştirmez', () => {
  const doc = documentWith('Teğet(x^2,1)', 'TeğetH(x^2,1)', 'Türev(a*x^2)', 'a*x+1, x<0; x^2, x>=0', 'Çember((0,0),a)')
  const before = structuredClone(doc.objects)
  for (const parameter of doc.objects.filter(object => object.type === 'parameter') as Parameter[]) {
    doc.set(parameter.name!, parameter.value)
  }
  expect(equalModelGraphs(doc.objects, before)).toBe(true)
})
