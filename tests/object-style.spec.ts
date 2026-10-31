import { expect, test, type Page } from '@playwright/test'
import { applyStyle, describeCard, styleSpec } from '../src/app/object-cards'
import { beginObjectDrag, moveObjectDrag } from '../src/app/object-drag'
import { parseCommand } from '../src/commands/parser'
import { prepareCommand } from '../src/commands/prepare'
import { resolveConstraints } from '../src/document/dependencies'
import { recomputeDefinitions } from '../src/document/definitions'
import { equalModelGraphs } from '../src/document/graph-equality'
import type { EquationLine, GeometryDocumentObject } from '../src/geometry/function-types'
import type { GeometryPoint } from '../src/geometry/types'
import { createCoordinateTransform } from '../src/rendering/coordinate-transform'
import { createFunctionEvaluator } from '../src/rendering/function-evaluator'
import type { DrawingContext, PainterFrame } from '../src/rendering/painter-types'
import { paintDocumentScene } from '../src/rendering/scene-painter'
import type { ToolAction } from '../src/ui/tool-registry'

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
  return { objects, named, point, prepare }
}

const at = (point: GeometryPoint) => [Number(point.a), Number(point.b)]

/** Records the dash patterns and texts a paint pass uses. */
function recordingFrame(objects: readonly GeometryDocumentObject[]) {
  const dashes: number[][] = []
  const texts: string[] = []
  const noop = () => undefined
  const ctx = {
    save: noop, restore: noop, beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop, stroke: noop,
    fill: noop, arc: noop, ellipse: noop, rect: noop, clip: noop,
    setLineDash: (dash: number[]) => { dashes.push([...dash]) },
    fillText: (text: string) => { texts.push(text) },
    strokeStyle: '', fillStyle: '', lineWidth: 1, font: '', textAlign: 'center',
  } as unknown as DrawingContext
  const frame: PainterFrame = {
    ctx,
    transform: createCoordinateTransform({ width: 1000, height: 1000, minX: -5, minY: -5, scaleX: 100, scaleY: 100, unitX: 1, unitY: 1 }),
    width: 1000,
    height: 1000,
    activeId: null,
    objects,
    evaluator: createFunctionEvaluator(),
  }
  return { frame, dashes, texts }
}

test('görünüm ayarları nesne türüne göre sunulur; varsayılanlar alan olarak saklanmaz', () => {
  const doc = documentWith('(1,2)', 'Doğru((0,0),(2,1))', 'x^2', 'Uzaklık((0,0),(3,4))', 'k=2', 'İntegral(g,0,1)')
  expect(styleSpec(doc.point('A'))).toEqual({
    color: '#123456', size: { value: 3, min: 1, max: 9, caption: 'Boyut' }, lineStyle: null, label: true, guides: null, trace: false,
  })
  expect(styleSpec(doc.named('g'))).toEqual({
    color: '#123456', size: { value: 2, min: 1, max: 8, caption: 'Kalınlık' }, lineStyle: 'solid', label: null, guides: null, trace: false,
  })
  expect(styleSpec(doc.named('k'))).toBeNull()
  const distance = doc.objects.find(object => object.type === 'distanceSegment')!
  expect(styleSpec(distance)).toMatchObject({ size: null, lineStyle: null, label: true, trace: null })
  expect(styleSpec(doc.objects.find(object => object.type === 'integral')!)).toMatchObject({ size: null, lineStyle: null, label: null })

  const line = doc.named('f')
  const before = structuredClone(doc.objects)
  expect(applyStyle(line, { color: '#AA0000', size: 20, lineStyle: 'dashed', labelHidden: true })).toBe(true)
  expect(line).toMatchObject({ color: '#aa0000', size: 8, lineStyle: 'dashed', labelHidden: true })
  // Settings that do not apply are ignored: an integral leaves no trace.
  const integral = doc.objects.find(object => object.type === 'integral')!
  expect(applyStyle(integral, { trace: true })).toBe(false)
  expect(integral.trace).toBeUndefined()
  expect(applyStyle(line, { color: 'red' })).toBe(false)
  // Turning everything back gives the original model, so history sees no change.
  expect(applyStyle(line, { color: '#123456', size: 2, lineStyle: 'solid', labelHidden: false })).toBe(true)
  expect(equalModelGraphs(doc.objects, before)).toBe(true)
})

test('görünüm ayarları yeniden hesaplamada korunur', () => {
  const doc = documentWith('a=2', 'a*x+1')
  const line = doc.named('f')
  applyStyle(line, { lineStyle: 'dotted', size: 5, color: '#00aa00' })
  ;(doc.named('a') as { value: number }).value = 3
  recomputeDefinitions(doc.objects, doc.prepare, ['a'])
  expect(line).toMatchObject({ lineStyle: 'dotted', size: 5, color: '#00aa00', m: 3 })
})

test('çizgi stili kesik desen, gizli etiket ad olmadan çizilir', () => {
  const doc = documentWith('(1,2)', 'Doğru((0,0),(2,1))', 'Açı((1,0),(0,0),(0,1))', 'x^2')
  const plain = recordingFrame(doc.objects)
  paintDocumentScene(plain.frame)
  expect(plain.texts).toEqual(expect.arrayContaining(['A', 'f', 'α=90°']))
  expect(plain.dashes.every(dash => dash.length === 0)).toBe(true)

  applyStyle(doc.point('A'), { labelHidden: true })
  applyStyle(doc.named('f'), { lineStyle: 'dashed', labelHidden: true })
  applyStyle(doc.named('α'), { labelHidden: true })
  applyStyle(doc.named('g'), { lineStyle: 'dotted' })
  const styled = recordingFrame(doc.objects)
  paintDocumentScene(styled.frame)
  expect(styled.texts).not.toContain('A')
  expect(styled.texts).not.toContain('f')
  // A measure keeps its value without the name.
  expect(styled.texts).toContain('90°')
  // Width 2: dashes 10/6, dots 2/6.
  expect(styled.dashes).toEqual(expect.arrayContaining([[10, 6], [2, 6]]))
})

test('doğru, çember ve çokgen serbest noktalarıyla bütün olarak sürüklenir', () => {
  const doc = documentWith('Doğru((0,0),(2,1))', 'Çember((1,1),2)', 'Çokgen((0,0),(1,0),(0,1))')
  const line = doc.named('f')
  const drag = beginObjectDrag(line, doc.objects, { a: 1, b: 0.5 })!
  expect(drag.points.map(item => item.point.name)).toEqual(['A', 'B'])
  moveObjectDrag(drag, { a: 2, b: 2.5 })
  expect([at(doc.point('A')), at(doc.point('B'))]).toEqual([[1, 2], [3, 3]])
  // Back at the start, the stored values return exactly.
  moveObjectDrag(drag, { a: 1, b: 0.5 })
  expect([at(doc.point('A')), at(doc.point('B'))]).toEqual([[0, 0], [2, 1]])

  const circle = beginObjectDrag(doc.named('a'), doc.objects, { a: 3, b: 1 })!
  expect(circle.points.map(item => item.point.name)).toEqual(['C'])
  const polygon = beginObjectDrag(doc.objects.find(object => object.type === 'polygon')!, doc.objects, { a: 0, b: 0 })!
  moveObjectDrag(polygon, { a: -1, b: 1 })
  expect(polygon.points.map(item => at(item.point))).toEqual([[-1, 1], [0, 1], [-1, 2]])
})

test('bağımlı noktası olan nesne yerinde kalır; yapı doğrusu kaynak noktasıyla sürüklenir', () => {
  const doc = documentWith('(1,1)', 'Doğru((0,0),(2,1))', 'ParalelDoğru(A,f)', 'OrtaNokta(A,(3,3))', 'Doğru(E,(5,0))')
  // The line through the midpoint E cannot move E itself.
  const through = doc.objects.filter(object => object.type === 'lineWithPoints').at(-1)!
  expect(beginObjectDrag(through, doc.objects, { a: 2, b: 2 })).toBeNull()
  // The parallel line moves with A; its hidden helper follows.
  const parallel = doc.named('g')
  const drag = beginObjectDrag(parallel, doc.objects, { a: 1, b: 1 })!
  expect(drag.points.map(item => item.point.name)).toEqual(['A'])
  moveObjectDrag(drag, { a: 1, b: 2 })
  resolveConstraints(doc.objects)
  expect(describeCard(parallel, { objects: doc.objects }).output).toEqual(['g: y = 0.50x+1.50'])
  // A point bound to a line still slides along it.
  const onLine = documentWith('Doğru((0,0),(2,1))')
  expect(beginObjectDrag(onLine.point('A'), onLine.objects, { a: 0, b: 0 })).not.toBeNull()
})

test('denklemle verilen doğru denklemi değişerek sürüklenir; parametreye bağlı olan sürüklenmez', () => {
  const doc = documentWith('2x+1', 'x=3', 'a=1', 'a*x')
  const line = doc.named('f') as EquationLine
  const drag = beginObjectDrag(line, doc.objects, { a: 0, b: 1 })!
  moveObjectDrag(drag, { a: 1, b: 1 })
  expect([line.m, line.n]).toEqual([2, -1])
  expect(describeCard(line, { objects: doc.objects }).input).toBe('f: y = 2x - 1')
  moveObjectDrag(drag, { a: 0, b: 1 })
  expect([line.n, line.func]).toEqual([1, '(2)*x+1'])
  const vertical = doc.named('denk1')
  const verticalDrag = beginObjectDrag(vertical, doc.objects, { a: 3, b: 0 })!
  moveObjectDrag(verticalDrag, { a: 4.5, b: 7 })
  expect(describeCard(vertical, { objects: doc.objects }).input).toBe('denk1: x = 4.50')
  expect(beginObjectDrag(doc.named('g'), doc.objects, { a: 0, b: 0 })).toBeNull()
})

// --- In the application -----------------------------------------------------------

const cards = (page: Page) => page.locator('#objectsContainer .expr-block')

async function enterCommand(page: Page, command: string): Promise<void> {
  await page.locator('#giris').fill(command)
  await page.locator('#giris').press('Enter')
  await expect(page.locator('#giris')).toHaveValue('')
}

async function selectTool(page: Page, action: ToolAction): Promise<void> {
  await page.evaluate(action => {
    window.drAW2DToolbar!.selectToolByAction(action, { showToast: false })
  }, action)
}

/** A fingerprint of the painted canvas, computed in the page. */
async function canvasPixels(page: Page): Promise<string> {
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
  return page.locator('#canvas').evaluate((canvas: HTMLCanvasElement) => {
    const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data
    let first = 0x811c9dc5
    let second = 0
    for (let index = 0; index < data.length; index++) {
      first = Math.imul(first ^ data[index]!, 0x01000193)
      second = (second + data[index]! * (index % 65521 + 1)) % 2147483647
    }
    return `${first >>> 0}:${second}`
  })
}

/** Pick a color without opening the browser's color chooser. */
async function pickColor(page: Page, id: string, color: string): Promise<void> {
  await page.locator(`[id="${id}"]`).evaluate((input: HTMLInputElement, value) => {
    input.value = value
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }, color)
}

const differs = (first: string, second: string) => first !== second

test.describe('uygulamada', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#giris')).toBeVisible()
  })

  test('değeri olmayan kart tek satırdır; değer kartı seçilince tanımını gösterir', async ({ page }) => {
    await enterCommand(page, 'a=2')
    await enterCommand(page, '(a,1)')
    await enterCommand(page, '(3,1)')
    // A free point: one row.
    await expect(page.locator('[id="2-output"]')).toBeHidden()
    await expect(page.locator('[id="2-input"]')).toBeVisible()
    // A point given by a parameter: the value alone until selected.
    const value = page.locator('[id="1-output"]')
    const definition = page.locator('[id="1-input"]')
    await expect(value).toHaveText('A=(2,1)')
    await expect(definition).toBeHidden()
    await value.click()
    await expect(definition).toBeVisible()
    await expect(definition).toHaveValue('A=(a,1)')
    const valueBox = (await value.boundingBox())!
    const definitionBox = (await definition.boundingBox())!
    expect(valueBox.y).toBeLessThan(definitionBox.y)
    // Editing opens the definition text.
    await page.locator('[id="1-edit"]').click()
    await expect(definition).toBeFocused()
    await expect(definition).toHaveValue('A = (a,1)')
    await definition.press('Escape')
    await page.locator('[id="2-input"]').click()
    await expect(definition).toBeHidden()
  })

  test('renk, kalınlık, çizgi stili ve etiket kartta değişir; her değişiklik bir geri alma adımıdır', async ({ page }) => {
    await enterCommand(page, 'Doğru((0,0),(2,1))')
    // The picture without a selection, as after undoing the appearance changes.
    await page.keyboard.press('Escape')
    const initial = await canvasPixels(page)
    await page.locator('[id="2-output"]').click()
    const card = cards(page).first()
    const settings = page.locator('[id="2-settings"]')
    await expect(page.locator('[id="2-style"]')).toBeVisible()
    await expect(settings).toBeHidden()
    await page.locator('[id="2-style"]').click()
    await expect(settings).toBeVisible()
    // Lines leave traces too.
    await expect(page.locator('[id="2-trace"]')).toBeVisible()
    const before = await canvasPixels(page)

    await pickColor(page, '2-color', '#ff0000')
    await expect(card.locator('.gizle')).toHaveCSS('background-color', 'rgb(255, 0, 0)')
    const red = await canvasPixels(page)
    expect(differs(before, red)).toBe(true)
    await page.locator('[id="2-lineStyle"]').selectOption('dashed')
    await page.locator('[id="2-label"]').uncheck()
    await page.locator('[id="2-size"]').fill('6')
    const styled = await canvasPixels(page)
    expect(differs(red, styled)).toBe(true)

    for (let step = 0; step < 4; step++) await page.locator('#undo').click()
    expect(await canvasPixels(page)).toEqual(initial)
    // The construction itself is the step before.
    await page.locator('#undo').click()
    await expect(cards(page)).toHaveCount(0)
  })

  test('iz bırakan nokta sürüklenince düzlemde izi kalır; iz kapatılınca silinir', async ({ page }) => {
    await enterCommand(page, '(0,0)')
    await page.locator('[id="0-input"]').click()
    await page.locator('[id="0-style"]').click()
    await page.locator('[id="0-trace"]').check()
    const still = await canvasPixels(page)
    await selectTool(page, 'select')
    const box = (await page.locator('#canvas').boundingBox())!
    // The standard view draws the origin at (500, 500).
    await page.mouse.move(box.x + 500, box.y + 500)
    await page.mouse.down()
    for (let step = 1; step <= 10; step++) await page.mouse.move(box.x + 500 + step * 10, box.y + 500)
    await page.mouse.up()
    await expect(page.locator('[id="0-input"]')).not.toHaveValue('A=(0,0)')
    const traced = await canvasPixels(page)

    // Switching the trace off removes it; the moved point stays. The settings stay open.
    await page.locator('[id="0-trace"]').uncheck()
    const cleared = await canvasPixels(page)
    expect(differs(traced, cleared)).toBe(true)
    expect(differs(still, cleared)).toBe(true)
  })

  test('doğru parçası bütün olarak sürüklenir; sürükleme tek geri alma adımıdır', async ({ page }) => {
    await enterCommand(page, 'DoğruParçası((1,1),(2,2))')
    await selectTool(page, 'select')
    const box = (await page.locator('#canvas').boundingBox())!
    // The segment's middle is drawn at (650, 350).
    await page.mouse.move(box.x + 650, box.y + 350)
    await expect(page.locator('#canvas')).toHaveCSS('cursor', 'grab')
    await page.mouse.down()
    await page.mouse.move(box.x + 600, box.y + 400)
    await page.mouse.move(box.x + 550, box.y + 450)
    await page.mouse.up()
    await expect(page.locator('[id="0-input"]')).toHaveValue('A=(0,0)')
    await expect(page.locator('[id="1-input"]')).toHaveValue('B=(1,1)')
    await expect(page.locator('[id="2-input"]')).toHaveValue('a: DoğruParçası((0,0), (1,1))')
    await page.locator('#undo').click()
    await expect(page.locator('[id="0-input"]')).toHaveValue('A=(1,1)')
    await expect(page.locator('[id="2-input"]')).toHaveValue('a: DoğruParçası((1,1), (2,2))')
  })
})
