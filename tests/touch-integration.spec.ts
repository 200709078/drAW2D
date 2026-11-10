import { expect, test, type CDPSession, type Page } from '@playwright/test'
import type { ToolAction } from '../src/ui/tool-registry'

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

async function selectTool(page: Page, action: ToolAction): Promise<void> {
  await page.evaluate(action => window.drAW2DToolbar!.selectToolByAction(action, { showToast: false }), action)
}

/** On a phone the sheet opens by its own handle; there is no arrow button. */
async function showPanel(page: Page): Promise<void> {
  await page.locator('#panelHandle').tap()
  await expect(page.locator('#rightWrapper')).not.toHaveClass(/\bhide\b/)
}

async function openHistoryControls(page: Page): Promise<void> {
  // Undo and redo stay in the toolbar on small screens.
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
  await expect(cardInputs(page)).toHaveValue('A=(1,0.60)')

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
  await expect(page.locator('#mainToolbar')).toHaveAttribute('data-action', 'select')
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
  await expect(cardInputs(page)).toHaveValue('A=(0.50,0.20)')
  await openHistoryControls(page)
  await expect(page.locator('#undo')).toBeEnabled()
  await page.locator('#undo').click()
  await expect(cardInputs(page)).toHaveCount(0)
  await expect(page.locator('#undo')).toBeDisabled()
})

test('ikinci parmak süren nokta sürüklemesini geçmiş adımı bırakmadan geri alır', async ({ page }) => {
  await showPanel(page)
  await enterCommand(page, '(1,1)')
  await page.locator('#panelHandle').tap()
  await expect(page.locator('#rightWrapper')).toHaveClass(/\bhide\b/)
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

test('alt panel tutamacıyla açılıp kapanır: dokunma, kaydırma, sekme; üst çubukta ok yok', async ({ page }) => {
  const wrapper = page.locator('#rightWrapper')
  const handle = page.locator('#panelHandle')
  await expect(page.locator('#btnCalc')).toBeHidden()
  // Kapalı panelin tutamacı ve sekmeleri altta görünür.
  await expect(wrapper).toHaveClass(/\bhide\b/)
  await expect(page.locator('#tabTools')).toBeInViewport()
  const closedBox = (await handle.boundingBox())!
  expect(closedBox.y).toBeGreaterThan(844 - 70)
  await expect(handle).toHaveAttribute('aria-label', 'Paneli aç')

  await handle.tap()
  await expect(wrapper).not.toHaveClass(/\bhide\b/)
  await expect(handle).toHaveAttribute('aria-expanded', 'true')
  await handle.tap()
  await expect(wrapper).toHaveClass(/\bhide\b/)

  // Kapalıyken Araçlar sekmesi paneli o sekmede açar.
  await page.locator('#tabTools').tap()
  await expect(wrapper).not.toHaveClass(/\bhide\b/)
  await expect(page.locator('#toolsPanel')).toBeVisible()

  const client = await page.context().newCDPSession(page)
  const swipe = async (from: number, to: number) => {
    // The sheet slides for 0.35 s after opening or closing; aim at where the handle settled.
    await page.waitForTimeout(450)
    const box = (await handle.boundingBox())!
    const x = box.x + 60
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: box.y + from }] })
    for (let step = 1; step <= 8; step++) {
      await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: box.y + from + (to - from) * step / 8 }] })
      await page.waitForTimeout(16)
    }
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }
  // Açık panel biraz yukarı sürüklenince büyür, açık kalır.
  const before = (await wrapper.boundingBox())!.height
  await swipe(8, -120)
  await expect.poll(async () => (await wrapper.boundingBox())!.height).toBeGreaterThan(before + 60)
  await expect(wrapper).not.toHaveClass(/\bhide\b/)
  // En küçük boyutun çok altına sürüklenince kapanır.
  await swipe(8, 700)
  await expect(wrapper).toHaveClass(/\bhide\b/)
  // Kapalı tutamaç yukarı kaydırılınca açılır, kapanmadan önceki boyutuyla.
  await swipe(8, -200)
  await expect(wrapper).not.toHaveClass(/\bhide\b/)
  await expect.poll(async () => (await wrapper.boundingBox())!.height).toBeGreaterThan(before + 60)
})

