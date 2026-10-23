import { expect, test } from '@playwright/test'
import { describeCard, editText } from '../src/app/object-cards'
import { parseCommand } from '../src/commands/parser'
import { prepareCommand } from '../src/commands/prepare'
import { resolveConstraints } from '../src/document/dependencies'
import { recomputeDefinitions } from '../src/document/definitions'
import { equalModelGraphs } from '../src/document/graph-equality'
import { redefineObject, splitEditText } from '../src/document/redefine'
import type { GeometryDocumentObject } from '../src/geometry/function-types'

function documentWith(...sources: string[]) {
  const objects: GeometryDocumentObject[] = []
  let nextId = 0
  const prepare = (command: Parameters<typeof prepareCommand>[0]) =>
    prepareCommand(command, objects, { nextId, randomColor: () => '#123456' })
  const add = (prepared: ReturnType<typeof prepare>) => {
    if (!prepared.ok) throw new Error(prepared.error)
    objects.push(...prepared.objects)
    nextId = prepared.nextId
  }
  for (const source of sources) {
    const parsed = parseCommand(source)
    if (!parsed.ok) throw new Error(parsed.error)
    add(prepare(parsed.command))
  }
  const named = (name: string) => {
    const object = objects.find(item => item.name === name)
    if (!object) throw new Error(`Nesne yok: ${name}`)
    return object
  }
  const context = { objects }
  const card = (name: string) => describeCard(named(name), context)
  /** Edit a card as the panel does: its current edit text is the reference. */
  const edit = (name: string, text: string) => {
    const target = named(name)
    const result = redefineObject(objects, target, text, editText(target, context)!, prepare)
    if (result.ok) {
      for (const id of result.remove) objects.splice(objects.findIndex(object => object.id === id), 1)
      objects.push(...result.append)
      nextId = Math.max(nextId, ...objects.map(object => (object.id ?? 0) + 1))
      recomputeDefinitions(objects, prepare, result.changedNames)
      resolveConstraints(objects)
    }
    return result
  }
  return { objects, named, card, edit, text: (name: string) => editText(named(name), context) }
}

test('düzenleme metni ad ve tanım olarak ayrılır', () => {
  expect(splitEditText('f: y = 2x - 3')).toEqual({ name: 'f', definition: 'y = 2x - 3' })
  expect(splitEditText('A = (1,2)')).toEqual({ name: 'A', definition: '(1,2)' })
  expect(splitEditText("A' = YansıtNokta(A,B)")).toEqual({ name: "A'", definition: 'YansıtNokta(A,B)' })
  expect(splitEditText('f(x) = ParçalıFonksiyon(x, x<0)')).toEqual({ name: 'f', definition: 'ParçalıFonksiyon(x, x<0)' })
  expect(splitEditText('y = 2x')).toEqual({ name: null, definition: 'y = 2x' })
  expect(splitEditText('x = 3')).toEqual({ name: null, definition: 'x = 3' })
  expect(splitEditText('Teğet(x^2,a)')).toEqual({ name: null, definition: 'Teğet(x^2,a)' })
})

test('her kartın düzenleme metni aynı nesneyi yeniden üretir', () => {
  const doc = documentWith('a=2', '(1,2)', 'Çember(A,a)', 'Doğru((0,0),(2,1))', 'DoğruParçası(A,B)', 'Uzaklık(A,C)',
    'Açı(A,B,C)', 'x=a', '2x-3', 'x^2', 'Teğet(x^2,1)', 'TeğetH(x^2,1)', 'Limit(1/x,2)', 'Dizi(1/n,1,7)',
    'Türev(sin(x))', 'Bileşke(x+1,x^2)', 'ParçalıFonksiyon(x, x<0; 1, x>=0)', 'Kesiştir(c,f)', 'YansıtNokta(A,B)')
  const before = structuredClone(doc.objects)
  for (const object of [...doc.objects]) {
    const text = editText(object, { objects: doc.objects })
    if (text === null || object.name === null) continue
    // Apply the text as a new definition (the reference text differs); nothing may change.
    const result = redefineObject(doc.objects, object, text, `${object.name} = __`, (command) =>
      prepareCommand(command, doc.objects, { nextId: 1000, randomColor: () => '#123456' }))
    expect(result.ok, text).toBe(true)
  }
  recomputeDefinitions(doc.objects, command => prepareCommand(command, doc.objects, { nextId: 2000, randomColor: () => '#123456' }))
  resolveConstraints(doc.objects)
  for (const [index, object] of doc.objects.entries()) {
    expect(equalModelGraphs([object], [before[index]!]), editText(object, { objects: doc.objects }) ?? object.type).toBe(true)
  }
})

test('ad değiştirmek tanımlardaki başvuruları da günceller', () => {
  const doc = documentWith('a=2', '(1,1)', 'Çember(A,a)', 'a*x', 'f(x+1)', 'Türev(x^2)')
  expect(doc.edit('A', 'P = (1,1)').ok).toBe(true)
  expect(doc.card('b').input).toBe('b: Çember(P,a)')
  expect(doc.edit('a', 'k = 2').ok).toBe(true)
  expect(doc.card('b').input).toBe('b: Çember(P,k)')
  expect(doc.card('f').input).toBe('f: y = k*x')
  // The derivative already took h, so f cannot be renamed to it.
  expect(doc.edit('f', 'h: y = k*x')).toEqual({ ok: false, error: 'Bu ad başka bir nesnede kullanılıyor: h' })
  expect(doc.edit('f', 'q: y = k*x').ok).toBe(true)
  expect(doc.card('g').input).toBe('g: y = q(x+1)')
  expect(doc.edit('h', 'u: Türev(x^2)').ok).toBe(true)
  expect(doc.card('u').output).toEqual(["u': y = 2*x"])
  for (const name of ['b', 'x', 'sin']) expect(doc.edit('P', `${name} = (1,1)`).ok, name).toBe(false)
})

test('nokta, çember, doğru ve fonksiyon tanımları yerinde değişir; bağımlılar izler', () => {
  const doc = documentWith('(1,0)', 'Çember((0,0),2)', 'Doğru((0,0),(1,1))', 'Kesiştir(a,f)', 'x^2', 'g(x+1)')
  const circle = doc.named('a')
  const intersection = doc.named('E')
  const ids = doc.objects.map(object => object.id)
  expect(doc.edit('A', 'A = (3,4)').ok).toBe(true)
  expect(doc.named('A')).toMatchObject({ a: 3, b: 4 })
  expect(doc.edit('a', 'a: Çember(B,3)').ok).toBe(true)
  expect(doc.named('a')).toBe(circle)
  expect(intersection).toMatchObject({ a: expect.closeTo(3 / Math.SQRT2, 12), b: expect.closeTo(3 / Math.SQRT2, 12) })
  // The line is used by the intersection: it may become another kind of line, not a circle.
  expect(doc.edit('f', 'f: y = 0')).toMatchObject({ ok: true })
  expect(intersection).toMatchObject({ a: 3, b: 0 })
  expect(doc.edit('f', 'f: Çember((0,0),1)')).toEqual({ ok: false, error: 'Bu nesneye bağlı yapılar var; tanım aynı türde bir nesne üretmelidir.' })
  // A function redefined by its card: the function using it follows.
  expect(doc.edit('g', 'g: y = x^3').ok).toBe(true)
  expect(doc.named('h')).toMatchObject({ func: expect.stringContaining('^ 3') })
  expect(doc.objects.map(object => object.id).slice(0, ids.length)).toEqual(ids)
})

test('nesneye bağlı noktaya yazılan koordinat noktayı o nesne üzerinde taşır', () => {
  const doc = documentWith('Çember((0,0),2)')
  const circle = doc.named('a')
  const point = { type: 'point' as const, name: 'P', id: 10, a: 2, b: 0, color: '#000', visibility: true, size: 3, temp: false,
    onOther: [{ type: 'onCircle' as const, circleId: circle.id }] }
  doc.objects.push(point)
  expect(doc.edit('P', 'P = (0,5)').ok).toBe(true)
  expect(point).toMatchObject({ a: expect.closeTo(0, 12), b: 2, onOther: [{ type: 'onCircle' }] })
})

test('kesişim ve teğet yeniden tanımlanınca yardımcı noktalar kimliklerini korur', () => {
  const doc = documentWith('Çember((0,0),2)', '2', '0', 'Kesiştir(a,f)', 'TeğetC(a,(3,2))')
  const owner = doc.named('B')
  const second = doc.objects.find(object => object.type === 'point' && object.hideInLabels)!
  const touches = doc.objects.filter(object => object.type === 'point' && object.onOther.some(constraint => constraint.type === 'circleTangentTouchPoint'))
  const count = doc.objects.length
  expect(doc.edit('B', 'B = Kesiştir(a,g)').ok).toBe(true)
  expect(doc.card('B').input).toBe('B=Kesiştir(a,g)')
  expect(doc.card('B').output.map(line => line.replace(/^\w+=/, '')).sort()).toEqual(['(-2,0)', '(2,0)'])
  expect(doc.objects.filter(object => object.hideInLabels)).toEqual([second])
  expect(owner.type === 'point' && owner.intersectionPointIds).toEqual([owner.id, second.id])
  expect(doc.edit('h', 'h: TeğetC(a,(0,4))').ok).toBe(true)
  const touched = touches.map(touch => touch.type === 'point' ? [Number(touch.a), Number(touch.b)] : []).sort((p, q) => p[0]! - q[0]!)
  expect(touched).toEqual([[expect.closeTo(-Math.sqrt(3), 12), expect.closeTo(1, 12)], [expect.closeTo(Math.sqrt(3), 12), expect.closeTo(1, 12)]])
  // Only the new tangent point (0,4) was added.
  expect(doc.objects).toHaveLength(count + 1)
})

test('döngüsel tanım ve geçersiz girişler belgeyi değiştirmez', () => {
  const doc = documentWith('(1,1)', '(0,0)', 'YansıtNokta(A,B)', 'Teğet(x^2,1)')
  const before = structuredClone(doc.objects)
  expect(doc.edit('B', "B = YansıtNokta(A',A)")).toEqual({ ok: false, error: 'Nesne kendisine veya ona bağlı bir nesneye başvuramaz.' })
  expect(doc.edit('A', 'A = (1,')).toMatchObject({ ok: false })
  expect(doc.edit('a', 'a = x+1')).toMatchObject({ ok: false })
  expect(doc.edit('A', 'A = ')).toMatchObject({ ok: false })
  expect(equalModelGraphs(doc.objects, before)).toBe(true)
})

test('düzenlenen Teğet kaydırıcısını, TeğetH h kaydırıcısını korur', () => {
  const doc = documentWith('TeğetH(x^2,1)')
  const parameters = () => doc.objects.filter(object => object.type === 'parameter').map(object => object.name)
  expect(parameters()).toEqual(['a', 'h'])
  expect(doc.edit('f', 'f: TeğetH(x^3,a)').ok).toBe(true)
  expect(parameters()).toEqual(['a', 'h'])
  // (f(3) - f(1)) / 2 = (27 - 1) / 2
  expect(doc.card('f').output).toEqual(['[f(1+h) - f(1)] / h = 13'])
})
