import { expect, test } from '@playwright/test'
import { parseCommand } from '../src/commands/parser'
import { prepareCommand } from '../src/commands/prepare'
import { describeCard, formatLine } from '../src/app/object-cards'
import { ViewportState } from '../src/app/viewport-state'
import type { GeometryDocumentObject } from '../src/geometry/function-types'

function build(...sources: string[]): GeometryDocumentObject[] {
  const objects: GeometryDocumentObject[] = []
  for (const source of sources) {
    const parsed = parseCommand(source)
    if (!parsed.ok) throw new Error(parsed.error)
    const prepared = prepareCommand(parsed.command, objects, { nextId: objects.length, randomColor: () => '#123456' })
    if (!prepared.ok) throw new Error(prepared.error)
    objects.push(...prepared.objects)
  }
  return objects
}

const context = (objects: GeometryDocumentObject[]) => ({ objects })

test('tekerlek yakınlaştırması imlecin altındaki matematik noktasını sabit tutar', () => {
  const view = new ViewportState()
  for (const zoomIn of [true, true, false, true]) {
    const before = view.transform(1000, 800)
    const anchor = { x: 731, y: 212 }
    const point = { x: before.pixelToX(anchor.x), y: before.pixelToY(anchor.y) }
    expect(view.zoom(zoomIn, anchor, before)).toBe(true)
    const after = view.transform(1000, 800)
    expect(after.pixelsPerUnitX).not.toBe(before.pixelsPerUnitX)
    expect(after.xToPixel(point.x)).toBeCloseTo(anchor.x, 9)
    expect(after.yToPixel(point.y)).toBeCloseTo(anchor.y, 9)
  }
})

test('eksen sürükleme yalnız o ekseni ölçekler ve tutulan noktayı yerinde bırakır', () => {
  const view = new ViewportState()
  const start = view.transform(1000, 800)
  const grab = { x: 800, y: start.originY }
  const anchor = start.pixelToX(grab.x)
  view.beginAxisDrag('xAxis', grab, start)
  expect(view.drag({ x: grab.x + 75, y: grab.y })).toBe(true)
  const after = view.transform(1000, 800)
  expect(after.pixelsPerUnitX).toBeLessThan(start.pixelsPerUnitX)
  expect(after.pixelsPerUnitY).toBe(start.pixelsPerUnitY)
  expect(after.originY).toBe(start.originY)
  expect(after.xToPixel(anchor)).toBeCloseTo(grab.x, 9)
  view.endDrag()
  view.resetStandard()
  const reset = view.transform(1000, 800)
  expect([reset.originX, reset.originY, reset.pixelsPerUnitX, reset.pixelsPerUnitY])
    .toEqual([start.originX, start.originY, start.pixelsPerUnitX, start.pixelsPerUnitY])
})

test('kaydırma başlangıçtan itibaren piksel farkı kadar taşır', () => {
  const view = new ViewportState()
  const start = view.transform(1000, 800)
  view.beginPan({ x: 100, y: 100 })
  view.drag({ x: 160, y: 70 })
  const after = view.transform(1000, 800)
  expect(after.originX).toBeCloseTo(start.originX + 60, 9)
  expect(after.originY).toBeCloseTo(start.originY - 30, 9)
})

test('kartlar doğru denklemlerini ve uzaklığı üretir; kaydırıcı yalnız parametrelerdedir', () => {
  expect(formatLine(2, -3, ' ')).toBe('2x - 3')
  expect(formatLine(-1, 0.5)).toBe('-x+0.50')
  expect(formatLine(0, 4)).toBe('4')

  const horizontal = build('Doğru((-1,2),(3,2))')
  expect(describeCard(horizontal[2]!, context(horizontal))).toEqual({
    input: 'f: Doğru((-1,2), (3,2))', output: ['f: y = 2'], valueFirst: true, sliders: [],
  })
  const distance = build('Uzaklık((0,0),(3,4))')
  expect(describeCard(distance[2]!, context(distance)).output).toEqual(['a=5'])

  // Points and lines are edited by dragging and by their definition, not by sliders.
  for (const source of ['(1,2)', '2x+1', 'x=3', 'Çember((0,0),2)']) {
    const objects = build(source)
    expect(objects.every(object => describeCard(object, context(objects)).sliders.length === 0), source).toBe(true)
  }

  const slider = build('a=2')
  expect(describeCard(slider[0]!, context(slider))).toEqual({
    input: 'a = 2', output: [], valueFirst: false, sliders: [{ min: -5, max: 5, step: 0.1, value: 2, label: '' }],
    parameter: { min: -5, max: 5, step: 0.1 },
  })
})

test('tanımı olan nesnelerin kartı tanımı, çıktısı adıyla değeri gösterir; değer öne çıkar', () => {
  const objects = build('a=2', 'b=a+1', '(a,1)', 'Çember((0,0),a)', 'a*x+1', 'x^a', 'Teğet(x^2,a)', 'Türev(x^2)')
  const cards = objects.map(object => describeCard(object, context(objects)))
  expect(cards.map(card => [card.input, card.output, card.valueFirst])).toEqual([
    ['a = 2', [], false],
    ['b = a+1', ['b = 3'], true],
    ['A=(a,1)', ['A=(2,1)'], true],
    ['B=(0,0)', [], false],
    ['c: Çember(B,a)', ['c: Çember(B,2)'], true],
    ['f: y = a*x+1', ['f: y = 2x+1'], true],
    ['g: y = x^a', [], false],
    ['Teğet(x^2,a)', ['h: y = 4x-4'], true],
    // Both lines of a derivative are graphs of their own.
    ['p: y = x^2', ["p': y = 2*x"], false],
  ])
})

test('sürekli yakınlaştırma ve iki parmak hareketi tutulan noktayı orta noktada tutar', () => {
  const view = new ViewportState()
  const start = view.transform(1000, 800)
  const anchor = { x: 300, y: 250 }
  const point = { x: start.pixelToX(anchor.x), y: start.pixelToY(anchor.y) }
  expect(view.zoomBy(1.37, anchor, start)).toBe(true)
  let after = view.transform(1000, 800)
  expect(after.pixelsPerUnitX).toBeCloseTo(start.pixelsPerUnitX * 1.37, 9)
  expect(after.xToPixel(point.x)).toBeCloseTo(anchor.x, 9)
  expect(after.yToPixel(point.y)).toBeCloseTo(anchor.y, 9)
  expect(view.zoomBy(1e12, anchor, after)).toBe(false)
  expect(view.zoomBy(Number.NaN, anchor, after)).toBe(false)

  // Fingers spread to twice their distance while their midpoint moves by (40, -20).
  const before = view.transform(1000, 800)
  const middle = { x: before.pixelToX(500), y: before.pixelToY(400) }
  view.beginPinch({ x: 450, y: 400 }, { x: 550, y: 400 }, before)
  expect(view.isPinching).toBe(true)
  view.pinch({ x: 440, y: 380 }, { x: 640, y: 380 })
  after = view.transform(1000, 800)
  expect(after.pixelsPerUnitX).toBeCloseTo(before.pixelsPerUnitX * 2, 9)
  expect(after.pixelsPerUnitY).toBeCloseTo(before.pixelsPerUnitY * 2, 9)
  expect(after.xToPixel(middle.x)).toBeCloseTo(540, 9)
  expect(after.yToPixel(middle.y)).toBeCloseTo(380, 9)
  view.endPinch()
  expect(view.isPinching).toBe(false)
})
