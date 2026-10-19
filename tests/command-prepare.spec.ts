import { expect, test } from '@playwright/test'
import { createObjectName } from '../src/commands/names'
import { parseCommand } from '../src/commands/parser'
import { prepareCommand, type PreparedCommand } from '../src/commands/prepare'
import type { Command } from '../src/commands/types'
import type { GeometryDocumentObject } from '../src/geometry/function-types'
import { math } from '../src/math'

interface DocumentState {
  document: readonly GeometryDocumentObject[]
  nextId: number
}

const empty: DocumentState = { document: [], nextId: 0 }
const randomColor = () => '#2468ac'

function command(source: string): Command {
  const result = parseCommand(source)
  if (!result.ok) throw new Error(`Örnek komut ayrıştırılamadı: ${source}: ${result.error}`)
  return result.command
}

function prepare(source: string, state: DocumentState): Extract<PreparedCommand, { ok: true }> {
  const result = prepareCommand(command(source), state.document, { nextId: state.nextId, randomColor })
  if (!result.ok) throw new Error(`Örnek komut hazırlanamadı: ${source}: ${result.error}`)
  return result
}

function apply(source: string, state: DocumentState = empty): DocumentState {
  const result = prepare(source, state)
  return { document: [...state.document, ...result.objects], nextId: result.nextId }
}

test('başarısız teğet ve yansıma hazırlığı belgeyi, adları ve sonraki kimliği tüketmez', () => {
  const state = apply('Çember((0,0),2)')
  const snapshot = structuredClone(state.document)
  const metadata = state.document.map(object => ({ id: object.id, name: object.name }))
  const options = Object.freeze({ nextId: state.nextId, randomColor })
  for (const source of ['TeğetC(a,(1,0))', 'YansıtNokta((4,5),MISSING)']) {
    const result = prepareCommand(command(source), state.document, options)
    expect(result.ok, source).toBe(false)
    expect(state.document, source).toEqual(snapshot)
    expect(state.document.map(object => ({ id: object.id, name: object.name })), source).toEqual(metadata)
    expect(options.nextId).toBe(2)
  }
  const point = prepareCommand(command('(3,4)'), state.document, options)
  if (!point.ok) throw new Error(point.error)
  expect(point.objects).toHaveLength(1)
  expect(point.objects[0]).toMatchObject({ type: 'point', id: 2, name: 'B', a: 3, b: 4 })
  expect(point.activeId).toBe(2)
  expect(point.nextId).toBe(3)
  expect(options.nextId).toBe(2)
  expect(state.document).toEqual(snapshot)
})

test('adlandırılmış noktalardan hazırlanan yapı aynı belge noktalarını ve kopyalanabilir grafiği paylaşır', () => {
  const state = apply('(3,5)', apply('(1,2)'))
  const snapshot = structuredClone(state.document)
  const result = prepare('Doğru(A,B)', state)
  expect(result.objects).toHaveLength(1)
  const line = result.objects[0]
  if (!line || line.type !== 'lineWithPoints') throw new Error('Doğru modeli bekleniyordu.')
  expect(line.A).toBe(state.document[0])
  expect(line.B).toBe(state.document[1])
  expect(line.id).toBe(state.nextId)

  const graph = [...state.document, ...result.objects]
  const clone = structuredClone(graph)
  const clonedLine = clone[2]
  if (!clonedLine || clonedLine.type !== 'lineWithPoints') throw new Error('Kopyalanmış doğru modeli bekleniyordu.')
  expect(clonedLine.A).toBe(clone[0])
  expect(clonedLine.B).toBe(clone[1])
  expect(clonedLine.A).not.toBe(line.A)
  expect(clonedLine.B).not.toBe(line.B)
  expect(clone).toEqual(graph)
  expect(state.document).toEqual(snapshot)
})

test('tek çember teğeti komutundaki kaynak ve temas noktaları benzersiz ad ve bağımlılık alır', () => {
  const state = apply('Çember((0,0),2)')
  const result = prepare('TeğetC(a,(3,2))', state)
  expect(result.objects.map(object => object.name)).toEqual(['B', 'f', 'C', 'D'])
  expect(result.objects.map(object => object.id)).toEqual([2, 3, 4, 5])
  expect(result.activeId).toBe(3)
  expect(result.nextId).toBe(6)
  const [point, tangent, firstTouch, secondTouch] = result.objects
  if (!point || point.type !== 'point' || !tangent || tangent.type !== 'circleTangent'
    || !firstTouch || firstTouch.type !== 'point' || !secondTouch || secondTouch.type !== 'point') {
    throw new Error('Kaynak nokta, teğet ve iki temas noktası bekleniyordu.')
  }
  expect(tangent.A).toBe(point)
  expect(tangent.circle).toBe(state.document[1])
  for (const [index, touch] of [firstTouch, secondTouch].entries()) {
    expect(touch.onOther).toEqual([{ type: 'circleTangentTouchPoint', tangentId: tangent.id, pointIndex: index }])
    expect(Math.hypot(Number(touch.a), Number(touch.b))).toBeCloseTo(2, 14)
    expect(Number(touch.a) * (3 - Number(touch.a)) + Number(touch.b) * (2 - Number(touch.b)))
      .toBeCloseTo(0, 14)
  }
  const names = [...state.document, ...result.objects].map(object => object.name)
  const snapshot = [...names]
  expect(new Set(names).size).toBe(names.length)
  expect(createObjectName('point', names)).toBe('E')
  expect(createObjectName('point', names)).toBe('E')
  expect(names).toEqual(snapshot)
})

test('parçalı fonksiyonun sonraki dalı geçersizse kısmi nesne veya kimlik kalmaz', () => {
  const state = apply('(1,2)')
  const snapshot = structuredClone(state.document)
  const options = Object.freeze({ nextId: state.nextId, randomColor })
  const result = prepareCommand(command('x^2,x<0; missing(x),x>=0'), state.document, options)
  expect(result.ok).toBe(false)
  expect(state.document).toEqual(snapshot)
  expect(options.nextId).toBe(1)
  const valid = prepare('x^2,x<0; x+1,x>=0', state)
  expect(valid.objects).toHaveLength(1)
  expect(valid.objects[0]).toMatchObject({ type: 'sectionalFunctions', id: 1, name: 'f' })
  expect(valid.nextId).toBe(2)
  expect(state.document).toEqual(snapshot)
})

test('afin komut hazırlığı katsayıları kart yuvarlaması olmadan tam hassasiyetle saklar', () => {
  const result = prepare('2*(x/14+1/26)', empty)
  expect(result.objects).toHaveLength(1)
  const line = result.objects[0]
  if (!line || line.type !== 'lineWithEquation') throw new Error('Afin denklem doğrusu bekleniyordu.')
  expect(line.m).toBe(1 / 7)
  expect(line.n).toBe(1 / 13)
  expect(line.m).not.toBe(Number(line.m.toFixed(2)))
  expect(line.n).not.toBe(Number(line.n.toFixed(2)))
  for (const x of [-2.375, 0, 1.137]) {
    expect(math.evaluate(line.func, { x })).toBeCloseTo(x / 7 + 1 / 13, 14)
  }
  expect(result.activeId).toBe(0)
  expect(result.nextId).toBe(1)
  expect(empty).toEqual({ document: [], nextId: 0 })
})

test('parçalı fonksiyon açık, kapalı, ters eşitsizlik ve tek nokta aralıklarını korur', () => {
  const result = prepare('x^2,-pi<x<=pi; 2,x=5; -x,8>x>=6', empty)
  const object = result.objects[0]
  if (!object || object.type !== 'sectionalFunctions') throw new Error('Parçalı fonksiyon bekleniyordu.')
  expect(object.secFuncs).toHaveLength(3)
  expect(object.secFuncs[0]).toMatchObject({
    startX: -Math.PI, endX: Math.PI, startInclusive: false, endInclusive: true,
  })
  expect(object.secFuncs[1]).toMatchObject({
    startX: 5, endX: 5, startInclusive: true, endInclusive: true,
  })
  expect(object.secFuncs[2]).toMatchObject({
    startX: 6, endX: 8, startInclusive: true, endInclusive: false,
  })
  expect(result.objects).toHaveLength(1)
  expect(result.nextId).toBe(1)
  expect(structuredClone(result.objects)).toEqual(result.objects)
})
