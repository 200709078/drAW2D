import { expect, test } from '@playwright/test'
import { parseCommand } from '../src/commands/parser'
import { prepareCommand } from '../src/commands/prepare'
import { applySliderValues, describeCard, formatLine } from '../src/app/object-cards'
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

const context = (objects: GeometryDocumentObject[]) =>
  ({ objects, bounds: { left: -5, right: 5, top: 5, bottom: -5 }, unitX: 1, unitY: 1 })

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

test('kartlar doğru denklemlerini, uzaklığı ve kaydırıcıları tek yerden üretir', () => {
  expect(formatLine(2, -3, ' ')).toBe('2x - 3')
  expect(formatLine(-1, 0.5)).toBe('-x+0.50')
  expect(formatLine(0, 4)).toBe('4')

  const horizontal = build('Doğru((-1,2),(3,2))')
  expect(describeCard(horizontal[2]!, context(horizontal))).toEqual({
    input: 'f: Doğru((-1,2), (3,2))', output: ['y = 2'], sliders: [],
  })
  const distance = build('Uzaklık((0,0),(3,4))')
  expect(describeCard(distance[2]!, context(distance)).output).toEqual(['a=5'])

  const points = build('(1,2)')
  const card = describeCard(points[0]!, context(points))
  expect(card.sliders.map(slider => [slider.min, slider.max, slider.value, slider.label]))
    .toEqual([[-6, 6, 1, 'a = 1'], [-6, 6, 2, 'b = 2']])
})

test('kaydırıcı değerleri modele uygulanır, hesaplanamayan teğet modeli değiştirmez', () => {
  const [line] = build('2x+1')
  expect(applySliderValues(line!, [3, -1], { updateTangent() {}, updateTangentHX() {} })).toEqual({ ok: true })
  expect(line).toMatchObject({ m: 3, n: -1 })

  const [tangent] = build('Teğet(x^2,1)')
  const before = structuredClone(tangent)
  const failing = { updateTangent() { throw new Error('tanımsız') }, updateTangentHX() {} }
  expect(applySliderValues(tangent!, [2], failing)).toEqual({ ok: false, error: 'Bu konumda sonlu bir gerçek teğet hesaplanamıyor.' })
  expect(tangent).toEqual(before)
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
