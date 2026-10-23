import { expect, test, type CDPSession, type Page } from '@playwright/test'
import type { RadialToolAction } from '../src/ui/toolbar-types'

// A phone-sized touch screen. The canvas fills the viewport, so page and canvas pixels agree.
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

interface Finger { x: number; y: number }

const runtimeFailures = new WeakMap<Page, string[]>()

test.beforeEach(async ({ page }) => {
  const failures: string[] = []
  runtimeFailures.set(page, failures)
  page.on('pageerror', error => failures.push(error.message))
  await page.goto('/')
  await expect(page.locator('#canvas')).toBeVisible()
})

test.afterEach(({ page }) => {
  expect(runtimeFailures.get(page), 'Dokunma işlemleri JavaScript hatası üretmemeli').toEqual([])
})

/** Real touch input: Chromium turns these into touch and pointer events with pointerType "touch". */
async function touch(client: CDPSession, type: 'touchStart' | 'touchMove' | 'touchEnd', fingers: Finger[]): Promise<void> {
  await client.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: fingers.map((finger, id) => ({ ...finger, id, radiusX: 1, radiusY: 1, force: 1 })),
  })
}

async function selectTool(page: Page, action: RadialToolAction): Promise<void> {
  await page.evaluate(action => window.drAW2DRadialToolbar!.selectToolByAction(action, { showToast: false }), action)
}

async function showPanel(page: Page): Promise<void> {
  await page.locator('#btnCalc').click()
  await expect(page.locator('#rightWrapper')).not.toHaveClass(/\bhide\b/)
}

async function openHistoryControls(page: Page): Promise<void> {
  await page.locator('#btnAcordeon').click()
  await expect(page.locator('#undo')).toBeVisible()
}

async function enterCommand(page: Page, command: string): Promise<void> {
  await page.locator('#giris').fill(command)
  await page.locator('#giris').press('Enter')
  await expect(page.locator('#giris')).toHaveValue('')
}

const cardInputs = (page: Page) => page.locator('#objectsContainer .expr-block input[readonly]')

test('dar ekranda panel gizli başlar, başlangıç noktası ortadadır ve panel alttan açılır', async ({ page }) => {
  await expect(page.locator('#rightWrapper')).toHaveClass(/\bhide\b/)
  await selectTool(page, 'point')
  await page.touchscreen.tap(195 + 100, 422 - 50)
  await showPanel(page)
  await expect(cardInputs(page)).toHaveValue('A=(1,0.50)')

  // Wait for the slide-in transition to finish before measuring.
  await expect.poll(async () => {
    const box = (await page.locator('#rightWrapper').boundingBox())!
    return box.y + box.height
  }).toBeCloseTo(844, 0)
  const sheet = (await page.locator('#rightWrapper').boundingBox())!
  expect(sheet.x).toBe(0)
  expect(sheet.width).toBe(390)
  expect(sheet.height).toBeLessThan(844 / 2)

  // The grip along the top edge resizes the sheet with a finger.
  const client = await page.context().newCDPSession(page)
  const grip = { x: 195, y: sheet.y + 8 }
  await touch(client, 'touchStart', [grip])
  await touch(client, 'touchMove', [{ x: grip.x, y: grip.y - 150 }])
  await touch(client, 'touchEnd', [])
  await expect.poll(async () => (await page.locator('#rightWrapper').boundingBox())!.height).toBeCloseTo(sheet.height + 150, 0)
})

test('yapı aracında parmak nişan alır ve nokta parmak kalkınca konur', async ({ page }) => {
  const client = await page.context().newCDPSession(page)
  await selectTool(page, 'linesegment')
  await touch(client, 'touchStart', [{ x: 180, y: 422 }])
  await touch(client, 'touchMove', [{ x: 195, y: 422 }])
  await touch(client, 'touchEnd', [])
  await touch(client, 'touchStart', [{ x: 260, y: 300 }])
  await touch(client, 'touchMove', [{ x: 295, y: 322 }])
  await touch(client, 'touchEnd', [])
  await showPanel(page)
  await expect(cardInputs(page).first()).toHaveValue('a: DoğruParçası((0,0), (1,1))')
  await expect(page.locator('#radialToolbar .center-button')).toHaveAttribute('data-action', 'select')
})

test('iki parmak orta noktanın altındaki noktayı tutarak yakınlaştırır ve kaydırır', async ({ page }) => {
  const client = await page.context().newCDPSession(page)
  // Fingers 100 px apart around (195, 422), the origin, spread to 200 px around (215, 402).
  await touch(client, 'touchStart', [{ x: 145, y: 422 }, { x: 245, y: 422 }])
  await touch(client, 'touchMove', [{ x: 135, y: 412 }, { x: 255, y: 412 }])
  await touch(client, 'touchMove', [{ x: 115, y: 402 }, { x: 315, y: 402 }])
  await touch(client, 'touchEnd', [])
  // The origin is now at (215, 402) and one unit is 200 px.
  await selectTool(page, 'point')
  await page.touchscreen.tap(215 + 100, 402 - 50)
  await showPanel(page)
  await expect(cardInputs(page)).toHaveValue('A=(0.50,0.25)')
  await openHistoryControls(page)
  await expect(page.locator('#undo')).toBeEnabled()
  await page.locator('#undo').click()
  await expect(cardInputs(page)).toHaveCount(0)
  await expect(page.locator('#undo')).toBeDisabled()
})

test('ikinci parmak süren nokta sürüklemesini geçmiş adımı bırakmadan geri alır', async ({ page }) => {
  await showPanel(page)
  await enterCommand(page, '(1,1)')
  await page.locator('#btnCalc').click()
  await expect(page.locator('#rightWrapper')).toBeHidden()
  const client = await page.context().newCDPSession(page)
  await touch(client, 'touchStart', [{ x: 295, y: 322 }])
  await touch(client, 'touchMove', [{ x: 315, y: 302 }])
  await touch(client, 'touchStart', [{ x: 315, y: 302 }, { x: 100, y: 200 }])
  await touch(client, 'touchMove', [{ x: 315, y: 302 }, { x: 110, y: 200 }])
  await touch(client, 'touchEnd', [])
  await showPanel(page)
  await expect(cardInputs(page)).toHaveValue('A=(1,1)')
  await openHistoryControls(page)
  await page.locator('#undo').click()
  await expect(cardInputs(page)).toHaveCount(0)
  await expect(page.locator('#undo')).toBeDisabled()
})
