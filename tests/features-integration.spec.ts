import { readFile } from 'node:fs/promises'
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

/** Canvas pixel of a plane point in the standard view (100 px per unit, origin at 500, 500). */
const pixel = (a: number, b: number) => ({ x: 500 + 100 * a, y: 500 - 100 * b })

async function click(page: Page, a: number, b: number): Promise<void> {
  await page.locator('#canvas').click({ position: pixel(a, b) })
}

async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }): Promise<void> {
  const box = (await page.locator('#canvas').boundingBox())!
  await page.mouse.move(box.x + from.x, box.y + from.y)
  await page.mouse.down()
  await page.mouse.move(box.x + (from.x + to.x) / 2, box.y + (from.y + to.y) / 2)
  await page.mouse.move(box.x + to.x, box.y + to.y)
  await page.mouse.up()
}

const inputs = (page: Page) => page.locator('#objectsContainer .expr-block input[readonly]')
const values = (page: Page) => inputs(page).evaluateAll(items => items.map(item => (item as HTMLInputElement).value))

test('düzgün çokgen ve merkez-yarıçap çemberi aracı değeri sorar; iptal çizimi geri alır', async ({ page }) => {
  await selectTool(page, 'regularpolygon')
  await click(page, 1, 1)
  await click(page, 2, 1)
  await expect(page.locator('#promptDialog')).toBeVisible()
  await expect(page.locator('#promptLabel')).toHaveText('Köşe sayısı')
  await page.locator('#promptInput').fill('4')
  await page.locator('#promptInput').press('Enter')
  await expect(page.locator('#promptDialog')).toBeHidden()
  await expect.poll(() => values(page)).toEqual(['a: DüzgünÇokgen(A,B,4)', 'D=(1,2)', 'C=(2,2)', 'B=(2,1)', 'A=(1,1)'])
  await expect(page.locator('#mainToolbar')).toHaveAttribute('data-action', 'select')

  await selectTool(page, 'circleradius')
  await click(page, -2, -2)
  await page.locator('#promptInput').fill('1.5')
  await page.locator('#promptOk').click()
  await expect(inputs(page).first()).toHaveValue('b: Çember(E,1.5)')

  await selectTool(page, 'circleradius')
  await click(page, -3, 2)
  await page.locator('#promptCancel').click()
  await expect.poll(() => values(page)).toHaveLength(7)
  await page.locator('#undo').click()
  await expect.poll(() => values(page)).toHaveLength(5)
})

test('dönüşüm araçları bir nesneyi de seçer: doğruyu bir noktaya göre yansıtır', async ({ page }) => {
  await enterCommand(page, 'Doğru((0,1),(1,1))')
  await enterCommand(page, '(0,0)')
  await selectTool(page, 'reflectpoint')
  await click(page, 0.5, 1)
  await click(page, 0, 0)
  await expect(inputs(page).first()).toHaveValue("f': Yansıt(f,C)")
  await expect(page.locator('[id="4-output"]')).toHaveText("f': y = -1")
})

test('vektör, alan ve eğim araçları; asimptot aracı fonksiyondan çizer', async ({ page }) => {
  await selectTool(page, 'vector')
  await click(page, 0, 0)
  await click(page, 1, 2)
  await expect(inputs(page).first()).toHaveValue('u: Vektör(A,B)')
  await enterCommand(page, 'Çokgen((1,-1),(3,-1),(3,-3))')
  await selectTool(page, 'area')
  await click(page, 2, -1)
  await expect(inputs(page).first()).toHaveValue('b = Alan(a)')
  await expect(page.locator('#objectsContainer .expr-block output').first()).toHaveText('b = 2')
  await enterCommand(page, '1/(x+2)')
  await selectTool(page, 'asymptote')
  await click(page, -1, 1)
  await expect(inputs(page).first()).toHaveValue('g: Asimptot(f)')
  await expect(page.locator('#objectsContainer .expr-block output').first()).toHaveText('x = -2y = 0')
})

test('tuvaldeki kaydırıcı sürüklenir ve tek geri alma adımıdır; başlığından taşınır', async ({ page }) => {
  await enterCommand(page, 'a=1')
  await enterCommand(page, 'x=a')
  await page.locator('[id="0-input"]').click()
  await page.locator('[id="0-onCanvas"]').check()
  // The track starts at (24, 90) and is 160 px long for −5…5.
  await drag(page, { x: 120, y: 90 }, { x: 184, y: 90 })
  await expect(page.locator('[id="0-input"]')).toHaveValue('a = 5')
  await expect(page.locator('[id="1-output"]')).toHaveText('denk1: x = 5')
  await page.locator('#undo').click()
  await expect(page.locator('[id="0-input"]')).toHaveValue('a = 1')
  // Dragging the caption moves the slider by (200, 100): the track now starts at (224, 190).
  await drag(page, { x: 40, y: 72 }, { x: 240, y: 172 })
  await page.locator('#undo').click()
  await page.locator('#redo').click()
  await drag(page, { x: 230, y: 190 }, { x: 384, y: 190 })
  await expect(page.locator('[id="0-input"]')).toHaveValue('a = 5')
  await page.locator('[id="0-input"]').click()
  await page.locator('[id="0-onCanvas"]').uncheck()
  await drag(page, { x: 384, y: 190 }, { x: 240, y: 190 })
  await expect(page.locator('[id="0-input"]')).toHaveValue('a = 5')
})

test('fonksiyon grafiği sürüklenerek ötelenir; geri alma ilk denkleme döner', async ({ page }) => {
  await enterCommand(page, 'x^2')
  await page.keyboard.press('Escape')
  await drag(page, pixel(0, 0), pixel(1, 1))
  await expect(page.locator('[id="0-input"]')).toHaveValue('f: y = (x-1)^2+1')
  await page.locator('#undo').click()
  await expect(page.locator('[id="0-input"]')).toHaveValue('f: y = x^2')
})

test('çizgi izi kaydırıcıyla değişen doğrunun kopyalarını bırakır', async ({ page }) => {
  await enterCommand(page, 'a=1')
  await enterCommand(page, 'a*x')
  await page.locator('[id="1-output"]').click()
  await page.locator('[id="1-style"]').click()
  await page.locator('[id="1-trace"]').check()
  // The darkest channel around (1.3, 1.3), on y = x but away from axes and grid lines.
  const darkest = () => page.locator('#canvas').evaluate((canvas: HTMLCanvasElement) => {
    const ratio = canvas.width / canvas.getBoundingClientRect().width
    const data = canvas.getContext('2d')!.getImageData(Math.round(626 * ratio), Math.round(366 * ratio), Math.round(8 * ratio), Math.round(8 * ratio)).data
    let result = 255
    for (let index = 0; index < data.length; index += 4) result = Math.min(result, data[index]!, data[index + 1]!, data[index + 2]!)
    return result
  })
  await page.locator('[id="0-sliderA"]').evaluate((element: HTMLInputElement) => {
    element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    for (const value of ['2', '3', '-1']) {
      element.value = value
      element.dispatchEvent(new Event('input', { bubbles: true }))
    }
    element.dispatchEvent(new Event('change', { bubbles: true }))
  })
  // The line is now y = −x; a translucent copy of y = x stays.
  await expect.poll(darkest).toBeLessThan(225)
  await page.locator('[id="1-trace"]').uncheck()
  await expect.poll(darkest).toBeGreaterThan(225)
})

test('kapalı eğri, eğri ve eşitsizlik girişten çizilir', async ({ page }) => {
  await enterCommand(page, 'x^2+y^2=4')
  await enterCommand(page, 'Eğri(cos(t), sin(t), t, 0, π)')
  await enterCommand(page, 'y<x')
  await expect.poll(() => values(page)).toEqual(['a: y < x', 'g: Eğri(cos(t),sin(t),t,0,π)', 'f: x^2+y^2 = 4'])
})

test('belge otomatik kaydedilir ve sayfa yeniden açılınca geri gelir; Yeni boş belge açar', async ({ page }) => {
  await enterCommand(page, 'a=2')
  await enterCommand(page, 'Çember((1,1),a)')
  await page.reload()
  await expect(page.locator('#giris')).toBeVisible()
  await expect.poll(() => values(page)).toEqual(['b: Çember(A,a)', 'A=(1,1)', 'a = 2'])
  await expect(page.locator('#snackContent')).toHaveText(/Son çalışmanız geri yüklendi/)
  // History starts at the restored document.
  await expect(page.locator('#undo')).toBeDisabled()
  await page.locator('#fileMenuButton').click()
  await page.locator('#fileNew').click()
  await expect(inputs(page)).toHaveCount(0)
  await page.locator('#undo').click()
  await expect.poll(() => values(page)).toHaveLength(3)
})

test('kaydedilen .drw2 dosyası açılınca aynı belge ve görünüm gelir; görüntü SVG ve PNG olarak kaydedilir', async ({ page }) => {
  // Without the File System Access API the browser downloads and uploads.
  await page.evaluate(() => {
    Object.assign(window, { showSaveFilePicker: undefined, showOpenFilePicker: undefined })
  })
  await enterCommand(page, '(1,2)')
  await enterCommand(page, 'Doğru(A,(3,3))')
  await enterCommand(page, 'Kök(x^2-1)')
  const before = await values(page)
  await page.locator('#fileMenuButton').click()
  const downloading = page.waitForEvent('download')
  await page.locator('#fileSave').click()
  const download = await downloading
  expect(download.suggestedFilename()).toBe('adsız.drw2')
  const text = await readFile((await download.path())!, 'utf8')
  expect(JSON.parse(text)).toMatchObject({ app: 'drAW2D', format: 1 })

  await page.locator('#clear').click()
  await expect(inputs(page)).toHaveCount(0)
  await page.locator('#fileMenuButton').click()
  const choosing = page.waitForEvent('filechooser')
  await page.locator('#fileOpen').click()
  await (await choosing).setFiles({ name: 'ders.drw2', mimeType: 'application/json', buffer: Buffer.from(text) })
  await expect.poll(() => values(page)).toEqual(before)
  await expect(page.locator('#snackContent')).toHaveText('ders.drw2 açıldı.')
  // Opening is one undoable step.
  await page.locator('#undo').click()
  await expect(inputs(page)).toHaveCount(0)
  await page.locator('#redo').click()

  await page.locator('#fileMenuButton').click()
  const svgDownload = page.waitForEvent('download')
  await page.locator('#fileExportSvg').click()
  const svg = await svgDownload
  expect(svg.suggestedFilename()).toBe('ders.svg')
  expect(await readFile((await svg.path())!, 'utf8')).toMatch(/^<\?xml[\s\S]*<svg xmlns="http:\/\/www.w3.org\/2000\/svg"[\s\S]*>A<\/text>/)
  await page.locator('#fileMenuButton').click()
  const pngDownload = page.waitForEvent('download')
  await page.locator('#fileExportPng').click()
  const png = await readFile((await (await pngDownload).path())!)
  expect([...png.subarray(1, 4)].map(code => String.fromCharCode(code)).join('')).toBe('PNG')

  await page.locator('#fileMenuButton').click()
  const broken = page.waitForEvent('filechooser')
  await page.locator('#fileOpen').click()
  await (await broken).setFiles({ name: 'bozuk.drw2', mimeType: 'application/json', buffer: Buffer.from('{"app":"drAW3D"}') })
  await expect(page.locator('#snackContent')).toHaveText('Bu dosya bir drAW2D belgesi değil.')
  await expect.poll(() => values(page)).toEqual(before)
})
