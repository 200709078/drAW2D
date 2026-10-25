import { expect, test } from '@playwright/test'
import { describeCard, editText } from '../src/app/object-cards'
import { beginObjectDrag, moveObjectDrag, translatedExpression } from '../src/app/object-drag'
import { parseCommand } from '../src/commands/parser'
import { prepareCommand } from '../src/commands/prepare'
import { recomputeDefinitions } from '../src/document/definitions'
import { collectDependents, resolveConstraints } from '../src/document/dependencies'
import { redefineObject } from '../src/document/redefine'
import type { GeometryDocumentObject, Parameter } from '../src/geometry/function-types'
import { getCircleDescriptor, getLineDescriptor, numericPoint } from '../src/geometry/primitives'
import type { GeometryPoint } from '../src/geometry/types'

function documentWith(...sources: string[]) {
  const objects: GeometryDocumentObject[] = []
  const prepare = (command: Parameters<typeof prepareCommand>[0]) =>
    prepareCommand(command, objects, { nextId: objects.length ? Math.max(...objects.map(object => object.id ?? 0)) + 1 : 0,
      randomColor: () => '#123456' })
  const run = (source: string) => {
    const parsed = parseCommand(source)
    if (!parsed.ok) throw new Error(parsed.error)
    const prepared = prepare(parsed.command)
    if (!prepared.ok) throw new Error(`${source}: ${prepared.error}`)
    objects.push(...prepared.objects)
    resolveConstraints(objects)
  }
  sources.forEach(run)
  const named = (name: string) => objects.find(item => item.name === name)!
  const point = (name: string) => named(name) as GeometryPoint
  const card = (name: string) => describeCard(named(name), { objects })
  const move = (name: string, a: number, b: number) => {
    Object.assign(point(name), { a, b })
    resolveConstraints(objects)
  }
  const set = (name: string, value: number) => {
    (named(name) as Parameter).value = value
    recomputeDefinitions(objects, prepare, [name])
    resolveConstraints(objects)
  }
  return { objects, named, point, card, move, set, run, prepare }
}

const closeTo = (values: number[], expected: number[], digits = 12) =>
  values.forEach((value, index) => expect(value).toBeCloseTo(expected[index]!, digits))
const at = (point: { a: unknown; b: unknown }) => { const p = numericPoint(point as GeometryPoint)!; return [p.a, p.b] }

test('Vektör iki nokta arasında okun bileşenlerini gösterir; Ötele bir vektörle de çalışır', () => {
  const doc = documentWith('Vektör((1,1),(4,3))', '(0,0)', 'Ötele(C,u)')
  expect(doc.card('u')).toMatchObject({ input: 'u: Vektör(A,B)', output: ['u=(3,2)'], valueFirst: true })
  expect(editText(doc.named('u'), { objects: doc.objects })).toBe('u: Vektör(A,B)')
  expect(at(doc.point("C'"))).toEqual([3, 2])
  expect(doc.card("C'").input).toBe("C'=Ötele(C,u)")
  doc.move('B', 1, 5)
  expect(at(doc.point("C'"))).toEqual([0, 4])
  expect(collectDependents(doc.objects, [doc.named('u').id!]).has(doc.point("C'").id!)).toBe(true)
})

test('DüzgünÇokgen ilk iki köşeden saat yönü tersine kurulur ve köşeleri izler', () => {
  const doc = documentWith('DüzgünÇokgen((0,0),(2,0),4)')
  expect(doc.objects.map(object => object.name)).toEqual(['A', 'B', 'C', 'D', 'a'])
  closeTo(at(doc.point('C')), [2, 2])
  closeTo(at(doc.point('D')), [0, 2])
  expect(doc.card('a')).toMatchObject({ input: 'a: DüzgünÇokgen(A,B,4)', output: ['a = 4'] })
  doc.move('B', 0, 2)
  closeTo(at(doc.point('C')), [-2, 2])
  const hexagon = documentWith('DüzgünÇokgen((0,0),(1,0),6)')
  expect(hexagon.card('a').output).toEqual([`a = ${(3 * Math.sqrt(3) / 2).toFixed(2)}`])
  expect(parseCommand('DüzgünÇokgen(A,B,2.5)').ok && prepareCommand({ kind: 'regularPolygon', A: { kind: 'coordinates', a: 0, b: 0 },
    B: { kind: 'coordinates', a: 1, b: 0 }, sides: 2.5 }, [], { nextId: 0, randomColor: () => '#000' }))
    .toEqual({ ok: false, error: 'İfade oluşturulamadı. Köşe sayısı 3 ile 30 arasında bir tam sayı olmalı.' })
  // Only the first two vertices are free, so dragging moves the polygon through them.
  const drag = beginObjectDrag(doc.named('a'), doc.objects, { a: 0, b: 0 })!
  expect(drag.points.map(item => item.point.name)).toEqual(['A', 'B'])
})

test('Yay merkez etrafında saat yönü tersine çizilir; uzunluğu kartta görünür', () => {
  const doc = documentWith('Yay((0,0),(2,0),(0,5))')
  expect(doc.card('a')).toMatchObject({ input: 'a: Yay(A,B,C)', output: [`a = ${Math.PI.toFixed(2)}`] })
  expect(prepareCommand({ kind: 'circularArc', center: { kind: 'coordinates', a: 0, b: 0 }, A: { kind: 'coordinates', a: 0, b: 0 },
    B: { kind: 'coordinates', a: 1, b: 1 } }, [], { nextId: 0, randomColor: () => '#000' }))
    .toEqual({ ok: false, error: 'İfade oluşturulamadı. Yayın noktaları merkezden farklı olmalı.' })
})

test('Alan ve Eğim ölçümleri kaynakları değişince güncellenir', () => {
  const doc = documentWith('Çokgen((0,0),(4,0),(0,3))', 'Alan(a)', 'Çember((0,0),2)', 'Alan(c)', 'Doğru((0,0),(2,1))', 'Eğim(f)', 'x=1', 'Eğim(denk1)')
  expect(doc.card('b')).toMatchObject({ input: 'b = Alan(a)', output: ['b = 6'] })
  expect(doc.card('d').output).toEqual([`d = ${(4 * Math.PI).toFixed(2)}`])
  expect(doc.card('e')).toMatchObject({ input: 'e = Eğim(f)', output: ['e = 0.50'] })
  expect(doc.card('g').output).toEqual(['g = ∅'])
  doc.move('B', 8, 0)
  expect(doc.card('b').output).toEqual(['b = 12'])
  expect(parseCommand('Alan(f)').ok && prepareCommand({ kind: 'area', object: 'f' }, doc.objects, { nextId: 99, randomColor: () => '#000' }))
    .toEqual({ ok: false, error: 'İfade oluşturulamadı. Bir çokgen veya çember girin: f' })
})

test('doğru, çember, çokgen, yay ve denklemli doğru yansıtılır, döndürülür ve ötelenir', () => {
  const doc = documentWith('Doğru((0,1),(1,1))', 'Çokgen((1,0),(2,0),(2,1))', 'Çember((3,0),1)', '(0,0)', 'x=0',
    'Yansıt(f,denk1)', 'Döndür(a,90,G)', 'Ötele(b,(0,0),(0,2))', 'y=2x+1', 'Yansıt(g,G)')
  const line = doc.named("f'")
  expect(line).toMatchObject({ type: 'lineWithPoints', imageOf: { kind: 'reflectLine' } })
  expect(doc.card("f'").input).toBe("f': Yansıt(f,denk1)")
  expect(doc.card("f'").output).toEqual(["f': y = 1"])
  const polygon = doc.named("a'")
  expect(polygon.type).toBe('polygon')
  if (polygon.type !== 'polygon') return
  closeTo(polygon.points.flatMap(at), [0, 1, 0, 2, -1, 2])
  expect(doc.card("a'")).toMatchObject({ input: "a': Döndür(a,c,G)", output: ["a' = 0.50"] })
  const circle = doc.named("b'")
  expect(circle.type).toBe('circle2')
  const descriptor = getCircleDescriptor(circle as Parameters<typeof getCircleDescriptor>[0])
  expect(descriptor).toMatchObject({ status: true, m: 3, n: 2, r: 1 })
  // An equation line has no points: hidden anchors on it are reflected.
  const reflected = getLineDescriptor(doc.named("g'") as Parameters<typeof getLineDescriptor>[0])
  expect(reflected.status && reflected.direction.b / reflected.direction.a).toBeCloseTo(2, 12)
  expect(reflected.status && reflected.origin.b - 2 * reflected.origin.a).toBeCloseTo(-1, 12)
  // The images follow their sources; their helper points are hidden and unnamed.
  doc.move('A', 0, 3)
  expect(doc.card("f'").output).toEqual(["f': y = 2x+3"])
  const helpers = doc.objects.filter(object => object.type === 'point' && object.name === null)
  expect(helpers.length).toBeGreaterThan(0)
  expect(helpers.every(helper => helper.visibility === false)).toBe(true)
  // Deleting the image takes its helpers; deleting the source takes the image.
  const imageParts = collectDependents(doc.objects, [polygon.id!])
  expect(polygon.points.every(point => imageParts.has(point.id!))).toBe(true)
  expect(collectDependents(doc.objects, [doc.named('a').id!]).has(polygon.id!)).toBe(true)
})

test('döndürülen nesnenin açısı kaydırıcıdır; açı değişince bütün köşeler döner', () => {
  const doc = documentWith('Doğru((1,0),(2,0))', '(0,0)', 'Döndür(f,90,C)')
  const image = doc.named("f'")
  expect(doc.card("f'").input).toBe("f': Döndür(f,a,C)")
  expect(doc.card("f'").output).toEqual(["f': x = 0"])
  doc.set('a', 180)
  expect(image.imageOf?.angle).toBe(180)
  expect(doc.card("f'").output).toEqual(["f': y = 0"])
  expect(editText(image, { objects: doc.objects })).toBe("f': Döndür(f,a,C)")
})

test('görüntü nesnesi karttan yeniden tanımlanınca yardımcı noktaları korunur', () => {
  const doc = documentWith('Çokgen((1,0),(2,0),(2,1))', '(0,0)', 'Yansıt(a,D)')
  const image = doc.named("a'")
  const ids = image.type === 'polygon' ? image.points.map(point => point.id) : []
  const result = redefineObject(doc.objects, image, "a': Döndür(a,90,D)", "a': Yansıt(a,D)", doc.prepare)
  expect(result.ok).toBe(true)
  resolveConstraints(doc.objects)
  expect(image.type === 'polygon' && image.points.map(point => point.id)).toEqual(ids)
  expect(image.type === 'polygon' && image.points.flatMap(at).map(value => Math.round(value * 1e9) / 1e9)).toEqual([0, 1, 0, 2, -1, 2])
})

test('kendi başına bir fonksiyon grafiği sürüklenince f(x − dx) + dy olur; geri gelince ilk hali kalır', () => {
  expect(translatedExpression('x^2', 1.5, 0.3)).toBe('(x-1.5)^2+0.3')
  expect(translatedExpression('sin(x)', -2, 0)).toBe('sin(x+2)')
  expect(translatedExpression('x^2', 0, -1)).toBe('x^2-1')
  const doc = documentWith('x^2', 'a=1', 'a*x^2', 'f(x+1)')
  const f = doc.named('f')
  const drag = beginObjectDrag(f, doc.objects, { a: 0, b: 0 }, 0.01)!
  moveObjectDrag(drag, { a: 1.004, b: 2.003 })
  expect(f).toMatchObject({ func: '(x-1)^2+2', translation: { base: 'x^2', dx: 1, dy: 2 } })
  expect(doc.card('f').input).toBe('f: y = (x-1)^2+2')
  moveObjectDrag(drag, { a: 0, b: 0 })
  expect(f).toEqual(expect.objectContaining({ func: 'x^2' }))
  expect(f).not.toHaveProperty('translation')
  // A second drag adds to the first offset instead of nesting the formula.
  moveObjectDrag(drag, { a: 1, b: 0 })
  const second = beginObjectDrag(f, doc.objects, { a: 0, b: 0 }, 0.01)!
  moveObjectDrag(second, { a: 1, b: 1 })
  expect(f).toMatchObject({ func: '(x-2)^2+1', translation: { base: 'x^2', dx: 2, dy: 1 } })
  // Graphs built on parameters or other functions stay in place.
  expect(beginObjectDrag(doc.named('g'), doc.objects, { a: 0, b: 0 })).toBeNull()
  expect(beginObjectDrag(doc.named('h'), doc.objects, { a: 0, b: 0 })).toBeNull()
})
