import { expect, test } from '@playwright/test'
import { describeCard, editText } from '../src/app/object-cards'
import { hitTest } from '../src/app/hit-test'
import { ToolController, type ToolInput } from '../src/app/tools'
import { createObjectName } from '../src/commands/names'
import { parseCommand } from '../src/commands/parser'
import { prepareCommand } from '../src/commands/prepare'
import { collectDependents, resolveConstraints } from '../src/document/dependencies'
import { recomputeDefinitions } from '../src/document/definitions'
import { GeometryDocument } from '../src/document/geometry-document'
import { getObjectIntersection } from '../src/geometry/intersections'
import { createGeometryModels } from '../src/geometry/models'
import type { GeometryDocumentObject, Parameter } from '../src/geometry/function-types'
import type { GeometryPoint } from '../src/geometry/types'
import { createCoordinateTransform } from '../src/rendering/coordinate-transform'
import { createFunctionEvaluator } from '../src/rendering/function-evaluator'

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
  const point = (name: string) => named(name) as GeometryPoint
  const card = (name: string) => describeCard(named(name), { objects })
  return { objects, named, point, card, prepare }
}

const at = (point: GeometryPoint) => [Number(point.a), Number(point.b)]
const closeTo = (values: number[], expected: number[]) =>
  values.forEach((value, index) => expect(value).toBeCloseTo(expected[index]!, 12))

test('orta nokta, ışın ve çokgen alanı', () => {
  const doc = documentWith('OrtaNokta((0,0),(4,2))', 'Işın((0,0),(1,2))', 'Çokgen((0,0),(3,0),(3,2),(0,2))')
  expect(doc.card('C')).toEqual({ input: 'C=OrtaNokta(A,B)', output: ['C=(2,1)'], sliders: [] })
  // Typed coordinates create the ray's own points D and E.
  expect(doc.card('f').input).toBe('f: Işın(D,E)')
  const ray = doc.named('f')
  // The ray starts at A: the line y = -1 meets it nowhere, y = 4 meets it at (2,4).
  expect(getObjectIntersection(ray, { type: 'lineWithEquation', m: 0, n: -1 }).points).toEqual([])
  expect(getObjectIntersection(ray, { type: 'lineWithEquation', m: 0, n: 4 }).points).toEqual([{ a: 2, b: 4 }])
  expect(doc.card('a')).toEqual({ input: 'a: Çokgen(F,G,H,I)', output: ['a = 6'], sliders: [] })
  doc.point('H').a = 6
  expect(doc.card('a').output).toEqual(['a = 9'])
})

test('dik, paralel doğru, kenar orta dikmesi ve açıortay noktalarını izler', () => {
  const doc = documentWith('(1,1)', 'Doğru((0,0),(2,1))', 'DikDoğru(A,f)', 'ParalelDoğru(A,f)', 'OrtaDikme((0,0),(4,0))',
    'Açıortay((2,0),(0,0),(0,2))')
  const cards = ['g', 'h', 'p', 'q'].map(name => doc.card(name))
  expect(cards.map(card => card.input)).toEqual(['g: DikDoğru(A,f)', 'h: ParalelDoğru(A,f)', 'p: OrtaDikme(D,E)', 'q: Açıortay(F,G,H)'])
  expect(cards.map(card => card.output)).toEqual([['y = -2x+3'], ['y = 0.50x+0.50'], ['x = 2'], ['y = x']])
  // Helpers are hidden, unnamed and not drawn; they go with their line.
  const helpers = doc.objects.filter(object => object.type === 'point' && object.hideInLabels)
  expect(helpers.every(helper => helper.name === null && !helper.visibility)).toBe(true)
  expect(collectDependents(doc.objects, [doc.named('p').id!]).size).toBe(3)
  doc.point('C').b = 2
  resolveConstraints(doc.objects)
  expect(doc.card('g').output).toEqual(['y = -x+2'])
  expect(prepareCommand({ kind: 'perpendicular', point: { kind: 'reference', name: 'A' }, line: 'A' }, doc.objects,
    { nextId: 99, randomColor: () => '#000' })).toEqual({ ok: false, error: 'İfade oluşturulamadı. Bir doğru girin: A' })
})

test('doğruya göre yansıtma, döndürme ve öteleme; döndürme açısı kaydırıcıdır', () => {
  const doc = documentWith('(3,1)', 'x=1', 'Yansıt(A,denk1)', 'Döndür(A,90,(0,0))', 'Ötele(A,(0,0),(2,-1))')
  closeTo(at(doc.point("A'")), [-1, 1])
  closeTo(at(doc.point("A'1")), [-1, 3])
  closeTo(at(doc.point("A'2")), [5, 0])
  expect(doc.card("A'").input).toBe("A'=Yansıt(A,denk1)")
  expect(doc.card("A'1").input).toBe("A'1=Döndür(A,a,B)")
  expect(doc.card("A'2").input).toBe("A'2=Ötele(A,B,C)")
  const slider = doc.named('a') as Parameter
  expect(slider).toMatchObject({ value: 90, min: 0, max: 360, step: 1 })
  slider.value = 180
  recomputeDefinitions(doc.objects, doc.prepare, ['a'])
  resolveConstraints(doc.objects)
  closeTo(at(doc.point("A'1")), [-3, -1])
  expect(editText(doc.named("A'1"), { objects: doc.objects })).toBe("A'1 = Döndür(A,a,B)")
})

test('araçlar: dik doğru, çokgen ve öteleme', () => {
  const document = new GeometryDocument()
  const randomColor = () => '#123456'
  const models = createGeometryModels({
    createName: group => createObjectName(group, document.objects.map(object => object.name)),
    nextId: () => document.allocateId(),
    randomColor,
  })
  const tools = new ToolController({
    document, models, visibleRange: () => ({ start: -5, end: 5 }),
    prepare: command => prepareCommand(command, document.objects, { nextId: document.nextId, randomColor }),
  })
  const transform = createCoordinateTransform({ width: 1000, height: 1000, minX: -5, minY: -5, scaleX: 100, scaleY: 100, unitX: 1, unitY: 1 })
  const evaluator = createFunctionEvaluator()
  const at = (a: number, b: number): ToolInput => ({ position: { a, b }, hit: hitTest(document.objects, { a, b }, { transform, evaluator }) })
  const prepared = prepareCommand({ kind: 'verticalLine', x: 2 }, [], { nextId: 0, randomColor })
  if (!prepared.ok) throw new Error(prepared.error)
  document.append(...prepared.objects)

  tools.setAction('perpendicular')
  expect(tools.press(at(0, 1)).message?.text).toBe('Şimdi bir doğru seçiniz.')
  expect(tools.press(at(-3, -3)).message?.text).toBe('Bir doğru seçiniz.')
  expect(tools.press(at(2, 4)).completed).toBe(true)
  const line = document.objects.find(object => object.type === 'lineWithPoints')!
  expect(describeCard(line, { objects: document.objects })).toMatchObject({ input: 'f: DikDoğru(A,denk1)', output: ['y = 1'] })

  tools.setAction('polygon')
  for (const [a, b] of [[-4, -4], [-1, -4], [-1, -1]]) tools.press(at(a, b))
  expect(tools.press(at(-4, -4)).completed).toBe(true)
  const polygon = document.objects.find(object => object.type === 'polygon')!
  expect(describeCard(polygon, { objects: document.objects }).output).toEqual(['a = 4.50'])

  tools.setAction('translate')
  tools.press(at(3, 3))
  tools.press(at(0, -2))
  expect(tools.press(at(1, -2)).completed).toBe(true)
  const moved = document.objects.at(-1) as GeometryPoint
  expect([moved.name, moved.a, moved.b]).toEqual(["E'", 4, 3])
})
