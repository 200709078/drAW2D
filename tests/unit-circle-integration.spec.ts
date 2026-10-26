import { expect, test, type Page } from '@playwright/test'

const runtimeFailures = new WeakMap<Page, string[]>()

test.beforeEach(async ({ page }) => {
  const failures: string[] = []
  runtimeFailures.set(page, failures)
  page.on('pageerror', error => failures.push(error.message))
  await page.goto('/')
  await expect(page.locator('#giris')).toBeVisible()
})

test.afterEach(({ page }) => {
  expect(runtimeFailures.get(page), 'Uygulama JavaScript hatası üretmemeli').toEqual([])
})

/** Canvas pixel of a plane point in the standard view (100 px per unit, origin at 500, 500). */
const pixel = (a: number, b: number) => ({ x: 500 + 100 * a, y: 500 - 100 * b })
const box = (page: Page, part: string) => page.locator(`[id="1-show-${part}"]`)
const values = (page: Page) => page.locator('[id="1-output"]')

async function createUnitCircle(page: Page): Promise<void> {
  await page.evaluate(() => window.drAW2DToolbar!.selectToolByAction('unitcircle', { showToast: false }))
  // Anywhere on the plane: the circle is always at O.
  await page.locator('#canvas').click({ position: { x: 800, y: 250 } })
  await expect(page.locator('[id="1-input"]')).toHaveValue('a: x² + y² = 1')
}

test('araç O merkezli birim çember ve θ kaydırıcısı oluşturur; değer kutucuğu A\'yı açıp kilitler', async ({ page }) => {
  await createUnitCircle(page)
  await expect(page.locator('#mainToolbar')).toHaveAttribute('data-action', 'select')
  await expect(page.locator('[id="0-input"]')).toHaveValue('θ = 30')
  await expect(values(page)).toBeHidden()
  // The angle's slider is on θ's card, not on the circle's.
  await expect(page.locator('[id="0-sliderA"]')).toBeVisible()
  await expect(page.locator('[id="1-sliderA"]')).toBeHidden()
  for (const part of ['A', 'sin', 'cos', 'tan', 'cot', 'sec', 'csc']) await expect(box(page, part)).not.toBeChecked()

  await box(page, 'tan').check()
  await expect(box(page, 'A')).toBeChecked()
  await expect(box(page, 'A')).toBeDisabled()
  await expect(values(page)).toHaveText('θ = 30°tan θ = √3/3')
  await box(page, 'sin').check()
  await expect(values(page)).toHaveText('θ = 30°sin θ = 1/2tan θ = √3/3')
  await box(page, 'sin').uncheck()
  await box(page, 'tan').uncheck()
  // A stays on, and can be turned off again by hand.
  await expect(box(page, 'A')).toBeChecked()
  await expect(box(page, 'A')).toBeEnabled()
  await box(page, 'A').uncheck()
  await expect(values(page)).toBeHidden()
  // Every box is one undoable step.
  await page.locator('#undo').click()
  await expect(box(page, 'A')).toBeChecked()
})

test('θ kaydırıcısı ve sürüklenen A açıyı değiştirir; radyanda yazılır; geri alma eski açıya döner', async ({ page }) => {
  await createUnitCircle(page)
  await box(page, 'cos').check()
  await page.locator('[id="0-sliderA"]').evaluate((element: HTMLInputElement) => {
    element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    element.value = '120'
    element.dispatchEvent(new Event('input', { bubbles: true }))
    element.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await expect(values(page)).toHaveText('θ = 120°cos θ = -1/2')
  await expect(page.locator('[id="0-input"]')).toHaveValue('θ = 120')

  // Drag A from 120° to straight down; it snaps to 270°.
  const canvas = (await page.locator('#canvas').boundingBox())!
  const from = pixel(Math.cos(2 * Math.PI / 3), Math.sin(2 * Math.PI / 3))
  const to = pixel(0.02, -1)
  await page.keyboard.press('Escape')
  await page.mouse.move(canvas.x + from.x, canvas.y + from.y)
  await page.mouse.down()
  await page.mouse.move(canvas.x + (from.x + to.x) / 2, canvas.y + (from.y + to.y) / 2)
  await page.mouse.move(canvas.x + to.x, canvas.y + to.y)
  await page.mouse.up()
  await expect(values(page)).toHaveText('θ = 270°cos θ = 0')

  await page.locator('[id="1-angleUnit"]').selectOption('radian')
  await expect(values(page)).toHaveText('θ = 3π/2cos θ = 0')
  await page.locator('#undo').click()
  await page.locator('#undo').click()
  await expect(values(page)).toHaveText('θ = 120°cos θ = -1/2')
})

test('BirimÇember komutu ve kaydetme sonrası açılış aynı çemberi getirir', async ({ page }) => {
  await page.locator('#giris').fill('BirimÇember(45)')
  await page.locator('#giris').press('Enter')
  await expect(page.locator('[id="1-input"]')).toHaveValue('a: x² + y² = 1')
  await box(page, 'sec').check()
  await expect(values(page)).toHaveText('θ = 45°sec θ = √2')
  await page.reload()
  await expect(values(page)).toHaveText('θ = 45°sec θ = √2')
  await expect(box(page, 'A')).toBeDisabled()
})

test('θ silinince birim çember de silinir; geri alma ikisini birlikte getirir', async ({ page }) => {
  await createUnitCircle(page)
  await box(page, 'sin').check()
  const cards = page.locator('#objectsContainer .expr-block')
  await expect(cards).toHaveCount(2)
  await cards.filter({ has: page.locator('[id="0-input"]') }).locator('.sil').click()
  await expect(cards).toHaveCount(0)
  await page.locator('#undo').click()
  await expect(cards).toHaveCount(2)
  await expect(values(page)).toHaveText('θ = 30°sin θ = 1/2')
})
