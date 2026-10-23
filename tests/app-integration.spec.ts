import { expect, test, type Page } from '@playwright/test'
import type { RadialToolAction } from '../src/ui/toolbar-types'

const runtimeFailures = new WeakMap<Page, string[]>()

test.beforeEach(async ({ page }) => {
  const failures: string[] = []
  runtimeFailures.set(page, failures)
  page.on('pageerror', error => failures.push(error.message))
  await page.goto('/')
  await expect(page.locator('#giris')).toBeVisible()
  await page.locator('#btnAcordeon').click()
})

test.afterEach(({ page }) => {
  expect(runtimeFailures.get(page), 'Uygulama JavaScript hatası üretmemeli').toEqual([])
})

async function enterCommand(page: Page, command: string): Promise<void> {
  await page.locator('#giris').fill(command)
  await page.locator('#giris').press('Enter')
  await expect(page.locator('#giris')).toHaveValue('')
}

async function selectTool(page: Page, action: RadialToolAction): Promise<void> {
  await page.evaluate(action => window.drAW2DRadialToolbar!.selectToolByAction(action, { showToast: false }), action)
}

const inputs = (page: Page) => page.locator('#objectsContainer .expr-block input[readonly]')

test('silme bağımlı yapıları birlikte kaldırır ve tek adımda geri getirir', async ({ page }) => {
  await enterCommand(page, 'Çember((0,0),2)')
  await enterCommand(page, 'TeğetC(a,(3,2))')
  const all = await inputs(page).evaluateAll(items => items.map(item => (item as HTMLInputElement).value))
  await page.locator('#objectsContainer .expr-block').filter({ has: page.locator('input[id="1-input"]') }).locator('.sil').click()
  await expect.poll(() => inputs(page).evaluateAll(items => items.map(item => (item as HTMLInputElement).value)))
    .toEqual(['B=(3,2)', 'A=(0,0)'])
  await page.locator('#undo').click()
  await expect.poll(() => inputs(page).evaluateAll(items => items.map(item => (item as HTMLInputElement).value))).toEqual(all)
})

test('tamamlanan araç seçim aracına döner ve yeni nesneyi seçili bırakır', async ({ page }) => {
  await selectTool(page, 'linesegment')
  await page.locator('#canvas').click({ position: { x: 600, y: 400 } })
  await page.locator('#canvas').click({ position: { x: 700, y: 300 } })
  await expect(page.locator('#radialToolbar .center-button')).toHaveAttribute('data-action', 'select')
  const segment = page.locator('input[id="2-input"]')
  await expect(segment).toHaveValue('a: DoğruParçası((1,1), (2,2))')
  await expect(segment).toHaveCSS('background-color', 'rgb(234, 243, 255)')
  await expect(page.locator('#undo')).toBeEnabled()
  await page.locator('#undo').click()
  await expect(inputs(page)).toHaveCount(0)
})

test('tekerlek yakınlaştırması imlecin altındaki noktayı yerinde tutar', async ({ page }) => {
  await enterCommand(page, '(1,1)')
  const canvas = page.locator('#canvas')
  const box = (await canvas.boundingBox())!
  await page.mouse.move(box.x + 600, box.y + 400)
  await page.mouse.wheel(0, -100)
  await page.mouse.wheel(0, -100)
  await selectTool(page, 'select')
  // The point stayed under the cursor, so a drag from there still moves it.
  await page.mouse.move(box.x + 600, box.y + 400)
  await page.mouse.down()
  await page.mouse.move(box.x + 650, box.y + 400)
  await page.mouse.up()
  await expect(inputs(page).first()).not.toHaveValue('A=(1,1)')
  await expect(inputs(page).first()).toHaveValue(/^A=\(1\.\d+,1\)$/)
})
