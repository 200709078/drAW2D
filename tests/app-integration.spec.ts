import { expect, test, type Page } from '@playwright/test'
import type { ToolAction } from '../src/ui/tool-registry'

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

async function enterCommand(page: Page, command: string): Promise<void> {
  await page.locator('#giris').fill(command)
  await page.locator('#giris').press('Enter')
  await expect(page.locator('#giris')).toHaveValue('')
}

async function selectTool(page: Page, action: ToolAction): Promise<void> {
  await page.evaluate(action => window.drAW2DToolbar!.selectToolByAction(action, { showToast: false }), action)
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
  await expect(page.locator('#mainToolbar')).toHaveAttribute('data-action', 'select')
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

const cardValue = (page: Page, id: number) => page.locator(`[id="${id}-input"]`)

async function slide(page: Page, id: number, value: string): Promise<void> {
  await page.locator(`[id="${id}-sliderA"]`).evaluate((element: HTMLInputElement, value) => {
    element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    element.value = value
    element.dispatchEvent(new Event('input', { bubbles: true }))
    element.dispatchEvent(new Event('change', { bubbles: true }))
  }, value)
}

test('parametre kaydırıcısı bağlı nesneleri günceller ve tek geri alma adımıdır', async ({ page }) => {
  await enterCommand(page, 'a=2')
  await enterCommand(page, 'a*x+1')
  await enterCommand(page, '(a,1)')
  // The parameter's slider stays visible even when another card is selected.
  await expect(page.locator('[id="0-sliderA"]')).toBeVisible()
  await expect(cardValue(page, 1)).toHaveValue('f: y = a*x+1')
  await expect(page.locator('[id="1-output"]')).toHaveText('y = 2x+1')
  await slide(page, 0, '-1.5')
  await expect(cardValue(page, 0)).toHaveValue('a = -1.50')
  await expect(page.locator('[id="1-output"]')).toHaveText('y = -1.50x+1')
  await expect(page.locator('[id="2-output"]')).toHaveText('A=(-1.50,1)')
  await page.locator('#undo').click()
  await expect(cardValue(page, 0)).toHaveValue('a = 2')
  await expect(page.locator('[id="2-output"]')).toHaveText('A=(2,1)')
})

test('a=3 var olan parametreyi değiştirir; aralık kartta düzenlenir', async ({ page }) => {
  await enterCommand(page, 'a=2')
  await enterCommand(page, 'Çember((0,0),a)')
  await enterCommand(page, 'a=7')
  await expect(page.locator('#objectsContainer .expr-block')).toHaveCount(3)
  await expect(cardValue(page, 0)).toHaveValue('a = 7')
  await expect(page.locator('[id="2-output"]')).toHaveText('r = 7')
  // Selecting the parameter reveals its bounds; a smaller maximum clamps the value.
  await cardValue(page, 0).click()
  await expect(page.locator('[id="0-max"]')).toHaveValue('7')
  await page.locator('[id="0-max"]').fill('4')
  await page.locator('[id="0-max"]').press('Enter')
  await expect(cardValue(page, 0)).toHaveValue('a = 4')
  await expect(page.locator('[id="2-output"]')).toHaveText('r = 4')
  await page.locator('[id="0-step"]').fill('-1')
  await page.locator('[id="0-step"]').press('Enter')
  await expect(page.locator('#snackbar')).toHaveClass(/\bis-visible\b/)
  await expect(cardValue(page, 0)).toHaveValue('a = 4')
})

test('animasyon parametreyi değiştirir; durdurmak tek geçmiş adımı kaydeder', async ({ page }) => {
  await enterCommand(page, 'a=0')
  await enterCommand(page, 'x=a')
  await cardValue(page, 0).click()
  const play = page.locator('[id="0-play"]')
  await expect(play).toHaveAttribute('title', 'Oynat')
  await play.click()
  await expect(play).toHaveAttribute('title', 'Durdur')
  await expect.poll(async () => cardValue(page, 0).inputValue()).not.toBe('a = 0')
  await play.click()
  const stopped = await cardValue(page, 0).inputValue()
  await expect(page.locator('[id="1-output"]')).toHaveText(`x = ${stopped.slice(4)}`)
  await page.waitForTimeout(200)
  await expect(cardValue(page, 0)).toHaveValue(stopped)
  await page.locator('#undo').click()
  await expect(cardValue(page, 0)).toHaveValue('a = 0')
})

test('parametreye bağlı nokta sürüklenmez, serbest nokta sürüklenir', async ({ page }) => {
  await enterCommand(page, 'a=1')
  await enterCommand(page, '(a,1)')
  await selectTool(page, 'select')
  const canvas = (await page.locator('#canvas').boundingBox())!
  await page.mouse.move(canvas.x + 600, canvas.y + 400)
  await page.mouse.down()
  await page.mouse.move(canvas.x + 650, canvas.y + 350)
  await page.mouse.up()
  await expect(page.locator('[id="1-output"]')).toHaveText('A=(1,1)')
  await expect(page.locator('#undo')).toBeEnabled()
  await page.locator('#undo').click()
  await expect(page.locator('#objectsContainer .expr-block')).toHaveCount(1)
})

test('kart düzenlenerek nesne yeniden tanımlanır ve yeniden adlandırılır; tek geri alma adımıdır', async ({ page }) => {
  await enterCommand(page, 'Çember((0,0),2)')
  const circle = cardValue(page, 1)
  await expect(circle).toHaveValue('a: Çember(A,2)')
  await page.locator('[id="1-edit"]').click()
  await expect(circle).not.toHaveAttribute('readonly')
  await expect(circle).toHaveValue('a: Çember(A,2)')
  await expect(circle).toBeFocused()
  await circle.fill('c: Çember(A,3)')
  await circle.press('Enter')
  await expect(circle).toHaveAttribute('readonly')
  await expect(circle).toHaveValue('c: Çember(A,3)')
  await page.locator('#undo').click()
  await expect(cardValue(page, 1)).toHaveValue('a: Çember(A,2)')

  // Escape and leaving the field cancel; an error keeps the text for correction.
  await cardValue(page, 0).dblclick()
  await cardValue(page, 0).fill('A = (5,5)')
  await cardValue(page, 0).press('Escape')
  await expect(cardValue(page, 0)).toHaveValue('A=(0,0)')
  await cardValue(page, 0).dblclick()
  await cardValue(page, 0).fill('A = (5,')
  await cardValue(page, 0).press('Enter')
  await expect(page.locator('#snackTitle')).toHaveText('DÜZENLE')
  await expect(cardValue(page, 0)).toHaveValue('A = (5,')
  await expect(cardValue(page, 0)).toBeFocused()
  await cardValue(page, 0).fill('A = (1,1)')
  await cardValue(page, 0).press('Enter')
  await expect(cardValue(page, 0)).toHaveValue('A=(1,1)')
  await expect(page.locator('#objectsContainer .expr-block')).toHaveCount(2)
})

test('Kök aracı eğriye tıklanınca görünür aralıktaki kökleri oluşturur', async ({ page }) => {
  await enterCommand(page, 'x^2-1')
  await page.locator('#toolgroup-function').click()
  await expect(page.locator('#mainToolbar')).toHaveAttribute('data-action', 'root')
  // The curve passes through (0,-1), drawn at (500, 600).
  await page.locator('#canvas').click({ position: { x: 500, y: 600 } })
  await expect(page.locator('[id="1-input"]')).toHaveValue('A=Kök(f)')
  await expect(page.locator('[id="1-output"]')).toHaveText('A=(-1,0)B=(1,0)')
  await expect(page.locator('#mainToolbar')).toHaveAttribute('data-action', 'select')
})

test('nokta aracı eğriye bağlı nokta oluşturur; sürüklenen nokta eğri boyunca gider', async ({ page }) => {
  await enterCommand(page, 'x^2/2')
  await selectTool(page, 'point')
  await page.locator('#canvas').click({ position: { x: 600, y: 452 } })
  await expect(page.locator('[id="1-input"]')).toHaveValue('A=(1,0.50)')
  await selectTool(page, 'select')
  const canvas = (await page.locator('#canvas').boundingBox())!
  await page.mouse.move(canvas.x + 600, canvas.y + 450)
  await page.mouse.down()
  await page.mouse.move(canvas.x + 700, canvas.y + 300)
  await page.mouse.up()
  await expect(page.locator('[id="1-input"]')).toHaveValue('A=(2,2)')
})

test('integral alanı taranır ve değeri kartta görünür', async ({ page }) => {
  await enterCommand(page, 'x^2')
  const inside = await page.locator('#canvas').evaluate(async (canvas: HTMLCanvasElement) => {
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    return [...canvas.getContext('2d')!.getImageData(650 * devicePixelRatio, 490 * devicePixelRatio, 1, 1).data]
  })
  await enterCommand(page, 'İntegral(f,0,2)')
  await expect(page.locator('[id="1-output"]')).toHaveText('a = 2.67')
  const shaded = await page.locator('#canvas').evaluate(async (canvas: HTMLCanvasElement) => {
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
    return [...canvas.getContext('2d')!.getImageData(650 * devicePixelRatio, 490 * devicePixelRatio, 1, 1).data]
  })
  expect(shaded, 'Eğrinin altındaki bölge taranmalı').not.toEqual(inside)
})
