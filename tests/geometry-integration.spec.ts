import { expect, test, type Page } from '@playwright/test'
import type { ToolAction } from '../src/ui/tool-registry'

interface PaintedPoint { x: number; y: number }
interface PaintedEllipse { x: number; y: number; radiusX: number; radiusY: number }
interface GeometryPaintProbe { points: PaintedPoint[]; ellipses: PaintedEllipse[] }
type ProbedWindow = Window & { __geometryPaintProbe: GeometryPaintProbe }
const runtimeFailures = new WeakMap<Page, string[]>()

test.beforeEach(async ({ page }) => {
  const failures: string[] = []
  runtimeFailures.set(page, failures)
  page.on('pageerror', error => failures.push(error.message))
  await page.addInitScript(() => {
    const probe: GeometryPaintProbe = { points: [], ellipses: [] }
    ;(window as ProbedWindow).__geometryPaintProbe = probe
    const originalDrawImage = CanvasRenderingContext2D.prototype.drawImage
    const originalArc = CanvasRenderingContext2D.prototype.arc
    const originalEllipse = CanvasRenderingContext2D.prototype.ellipse
    CanvasRenderingContext2D.prototype.drawImage = function (...args: unknown[]) {
      if (this.canvas.id === 'canvas') {
        probe.points = []
        probe.ellipses = []
      }
      return Reflect.apply(originalDrawImage, this, args)
    }
    CanvasRenderingContext2D.prototype.arc = function (x, y, radius, start, end, counterclockwise) {
      if (this.canvas.id === 'canvas') probe.points.push({ x, y })
      return originalArc.call(this, x, y, radius, start, end, counterclockwise)
    }
    CanvasRenderingContext2D.prototype.ellipse = function (x, y, radiusX, radiusY, rotation, start, end, counterclockwise) {
      if (this.canvas.id === 'canvas') probe.ellipses.push({ x, y, radiusX, radiusY })
      return originalEllipse.call(this, x, y, radiusX, radiusY, rotation, start, end, counterclockwise)
    }
  })
  await page.goto('/')
  await expect(page.locator('#giris')).toBeVisible()
})

test.afterEach(({ page }) => {
  expect(runtimeFailures.get(page), 'Geometri işlemleri JavaScript hatası üretmemeli').toEqual([])
})

async function enterCommand(page: Page, command: string): Promise<void> {
  await page.locator('#giris').fill(command)
  await page.locator('#giris').press('Enter')
  await expect(page.locator('#giris')).toHaveValue('')
}

async function settlePaint(page: Page): Promise<void> {
  await page.evaluate(() => new Promise<void>(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  }))
}

async function paintProbe(page: Page): Promise<GeometryPaintProbe> {
  await settlePaint(page)
  return page.evaluate(() => (window as ProbedWindow).__geometryPaintProbe)
}

async function selectTool(page: Page, action: ToolAction): Promise<void> {
  await page.evaluate(action => {
    if (!window.drAW2DToolbar) throw new Error('Araç çubuğu başlatılmadı')
    window.drAW2DToolbar.selectToolByAction(action, { showToast: false })
  }, action)
}

async function objectRows(page: Page) {
  return page.locator('#objectsContainer .expr-block').evaluateAll(rows => rows.map(row => ({
    input: row.querySelector('input')!.value,
    output: row.querySelector('output')!.value,
  })))
}

async function drag(page: Page, start: PaintedPoint, end: PaintedPoint): Promise<void> {
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(end.x, end.y)
  await page.mouse.up()
}

test('yakın eğimli farklı doğruların kesişimi paralel diye kaybolmaz', async ({ page }) => {
  await enterCommand(page, '0.000000001x')
  await enterCommand(page, '0.000000002x-0.000000001')
  await enterCommand(page, 'Kesiştir(f,g)')
  const intersection = page.locator('#objectsContainer .expr-block').first()
  await expect(intersection.locator('input[readonly]')).toHaveValue('A=Kesiştir(f,g)')
  await expect(intersection.locator('output')).toHaveText('A=(1,0)')
  const point = (await paintProbe(page)).points.find(point => Math.abs(point.x - 600) < 1)
  expect(point, 'Kesişim gerçek katsayılarla hesaplanıp çizilmeli').toBeDefined()
  expect(point!.x).toBeCloseTo(600, 8)
  expect(point!.y).toBeCloseTo(500 - 1e-7, 8)
})

test('üç noktalı çember doğrusal duruma gelip tekrar geçerli olduğunda toparlanır', async ({ page }) => {
  await enterCommand(page, 'Çember((0,0),(1,1),(2,0))')
  await expect(page.locator('#objectsContainer .expr-block')).toHaveCount(4)
  expect((await paintProbe(page)).ellipses).toEqual([{ x: 600, y: 500, radiusX: 100, radiusY: 100 }])
  await selectTool(page, 'select')

  await drag(page, { x: 600, y: 400 }, { x: 600, y: 500 })
  await expect.poll(async () => (await objectRows(page)).map(row => row.input)).toContain('B=(1,0)')
  expect((await paintProbe(page)).ellipses, 'Doğrusal üç noktada sonlu olmayan çember çizilmemeli').toEqual([])
  await expect(page.locator('#objectsContainer .expr-block')).toHaveCount(4)

  await drag(page, { x: 600, y: 500 }, { x: 600, y: 400 })
  await expect.poll(async () => (await objectRows(page)).map(row => row.input)).toContain('B=(1,1)')
  expect((await paintProbe(page)).ellipses).toEqual([{ x: 600, y: 500, radiusX: 100, radiusY: 100 }])
})

test('çembere bağlı nokta kart yuvarlamasından bağımsız tam hassasiyetle izdüşürülür', async ({ page }) => {
  await enterCommand(page, 'Çember((0,0),2)')
  await selectTool(page, 'point')
  await page.locator('#canvas').click({ position: { x: 642, y: 360 } })
  await expect(page.locator('#objectsContainer .expr-block input[readonly]').first()).toHaveValue('B=(1.42,1.40)')
  const point = (await paintProbe(page)).points.find(point => Math.abs(point.x - 642) < 3 && Math.abs(point.y - 360) < 3)
  expect(point).toBeDefined()
  const x = (point!.x - 500) / 100
  const y = (500 - point!.y) / 100
  expect(Math.hypot(x, y), 'Yuvarlama noktayı çemberden ayırmamalı').toBeCloseTo(2, 12)
  expect(x).toBeCloseTo(2 * 1.42 / Math.hypot(1.42, 1.4), 12)
  expect(Math.abs(x - Number(x.toFixed(2)))).toBeGreaterThan(1e-4)
})

test('çember teğetlerinin temas noktaları ayrı ad alır ve geçmişte aynı geometriye döner', async ({ page }) => {
  await enterCommand(page, 'Çember((0,0),2)')
  await enterCommand(page, 'TeğetC(a,(3,2))')
  const expectedRows = [
    { input: 'D=TeğetNokta(f,2)', output: 'D=(1.85,-0.77)' },
    { input: 'C=TeğetNokta(f,1)', output: 'C=(0,2)' },
    { input: 'f: Teğet(B,a)', output: '' },
    { input: 'B=(3,2)', output: '' },
    { input: 'a: Çember(A,2)', output: '' },
    { input: 'A=(0,0)', output: '' },
  ]
  await expect.poll(() => objectRows(page)).toEqual(expectedRows)
  const before = await paintProbe(page)
  for (const expected of [{ a: 0, b: 2 }, { a: 24 / 13, b: -10 / 13 }]) {
    const point = before.points.find(point => Math.abs(point.x - (500 + 100 * expected.a)) < 1
      && Math.abs(point.y - (500 - 100 * expected.b)) < 1)
    expect(point).toBeDefined()
    const a = (point!.x - 500) / 100
    const b = (500 - point!.y) / 100
    expect(Math.hypot(a, b)).toBeCloseTo(2, 12)
    expect(a * (3 - a) + b * (2 - b), 'Temas yarıçapı teğete dik olmalı').toBeCloseTo(0, 12)
  }
  await page.setViewportSize({ width: 1450, height: 900 })
  await settlePaint(page)
  await page.setViewportSize({ width: 1440, height: 900 })
  await settlePaint(page)
  await expect.poll(() => objectRows(page)).toEqual(expectedRows)
  await page.locator('#undo').click()
  await expect(page.locator('#objectsContainer .expr-block')).toHaveCount(2)
  await page.locator('#redo').click()
  await expect.poll(() => objectRows(page)).toEqual(expectedRows)
  expect((await paintProbe(page)).points).toEqual(before.points)
  await expect(page.locator('#redo')).toBeDisabled()
})

test('çember doğru kesişimi teğet, iki nokta ve boş küme arasında bağımlı olarak güncellenir', async ({ page }) => {
  // The line's intercept is the slider parameter k.
  await enterCommand(page, 'Çember((0,0),2)')
  await enterCommand(page, 'k=2')
  await enterCommand(page, 'y=k')
  await enterCommand(page, 'Kesiştir(a,f)')
  const rows = page.locator('#objectsContainer .expr-block')
  await expect(rows).toHaveCount(5)
  await expect(rows.first().locator('output')).toHaveText('B=(0,2)')

  const intercept = page.locator('[id="2-sliderA"]')
  const setIntercept = async (value: string) => {
    await intercept.evaluate((element: HTMLInputElement, value) => {
      element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
      element.value = value
      element.dispatchEvent(new Event('input', { bubbles: true }))
      element.dispatchEvent(new Event('change', { bubbles: true }))
    }, value)
    await settlePaint(page)
  }
  await setIntercept('0')
  await expect.poll(async () => {
    const html = await rows.first().locator('output').innerHTML()
    return Array.from(html.matchAll(/[A-Z]+=\(([^)]*)\)/g), match => match[1]).sort()
  }).toEqual(['-2,0', '2,0'])
  await setIntercept('2')
  await expect(rows.first().locator('output')).toHaveText('B=(0,2)')
  await setIntercept('3')
  await expect(rows.first().locator('output')).toHaveText('∅')
  await expect(rows).toHaveCount(5)
})


test('dik eğimli doğrunun seçimi dik uzaklık kullanır ve nokta doğruya bağlanır', async ({ page }) => {
  await enterCommand(page, '10x')
  await selectTool(page, 'point')
  await page.locator('#canvas').click({ position: { x: 526, y: 300 } })
  await expect(page.locator('#objectsContainer .expr-block input[readonly]').first()).toHaveValue('A=(0.20,2.01)')
  const point = (await paintProbe(page)).points.find(point => Math.abs(point.x - 520) < 1)
  expect(point).toBeDefined()
  const a = (point!.x - 500) / 100
  const b = (500 - point!.y) / 100
  expect(b).toBeCloseTo(10 * a, 12)
})

test('tanımsız çemberin bağlı noktası kaybolur ve çember düzelince aynı konuma döner', async ({ page }) => {
  await enterCommand(page, 'Çember((0,0),(1,1),(2,0))')
  await selectTool(page, 'point')
  await page.locator('#canvas').click({ position: { x: 600, y: 600 } })
  await expect(page.locator('#objectsContainer .expr-block input[readonly]').first()).toHaveValue('D=(1,-1)')
  const hasAttachedPoint = async () => (await paintProbe(page)).points.some(point =>
    Math.abs(point.x - 600) < 1e-8 && Math.abs(point.y - 600) < 1e-8)
  expect(await hasAttachedPoint()).toBe(true)
  await selectTool(page, 'select')
  await drag(page, { x: 600, y: 400 }, { x: 600, y: 500 })
  await expect(page.locator('#objectsContainer .expr-block').first().locator('output')).toHaveText('∅')
  expect(await hasAttachedPoint()).toBe(false)
  await drag(page, { x: 600, y: 500 }, { x: 600, y: 400 })
  await expect(page.locator('#objectsContainer .expr-block').first().locator('output')).toHaveText('')
  expect(await hasAttachedPoint()).toBe(true)
})
