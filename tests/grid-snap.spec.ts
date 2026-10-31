import { expect, test, type Page } from '@playwright/test'
import { beginObjectDrag, moveObjectDrag } from '../src/app/object-drag'
import { pointCandidate } from '../src/app/tools'
import type { GeometryPoint } from '../src/geometry/types'
import { snapToGrid, type GridViewport } from '../src/rendering/coordinate-grid'

const freePoint = (a: number, b: number) => ({ type: 'point', a, b, onOther: [] }) as unknown as GeometryPoint

const view = (extra: Partial<GridViewport> = {}): GridViewport => ({
  width: 1000, height: 1000, minX: -5, minY: -5, scaleX: 100, scaleY: 100, unitX: 1, unitY: 1, ...extra,
})

test.describe('hesap', () => {
  test('nokta çizilen küçük karelerin en yakın köşesine, gürültüsüz gelir', () => {
    expect(snapToGrid(view(), { a: 1.37, b: 2.11 })).toEqual({ a: 1.4, b: 2.2 })
    expect(snapToGrid(view(), { a: 0.29, b: -0.31 })).toEqual({ a: 0.2, b: -0.4 })
    expect(snapToGrid(view(), { a: 0.04, b: -0.04 })).toEqual({ a: 0, b: 0 })
    expect(Object.is(snapToGrid(view(), { a: -0.01, b: 0 }).a, -0)).toBe(false)
    for (let index = -50; index <= 50; index++) {
      expect(snapToGrid(view(), { a: index / 5 + 0.03, b: 0 }).a).toBe(Number((index / 5).toFixed(1)))
    }
  })

  test('adım yakınlaştırmayla değişir, tam sayıya sabit değildir', () => {
    // 1000 px/birim: büyük aralık 0.1, küçük kare 0.02.
    expect(snapToGrid(view({ scaleX: 1000, scaleY: 1000 }), { a: 1.3749, b: 0.0151 })).toEqual({ a: 1.38, b: 0.02 })
    // 10 px/birim: büyük aralık 10, küçük kare 2.
    expect(snapToGrid(view({ scaleX: 10, scaleY: 10 }), { a: 7.1, b: -2.9 })).toEqual({ a: 8, b: -2 })
  })

  test('x ve y kendi adımını, π birimi π katlarını kullanır', () => {
    // scaleY yatayın, scaleX dikeyin ölçeğidir: x'te 0.2, y'de 2.
    expect(snapToGrid(view({ scaleX: 10 }), { a: 1.37, b: 3.3 })).toEqual({ a: 1.4, b: 4 })
    expect(snapToGrid(view({ unitY: Math.PI }), { a: 1.9, b: 0 }).a).toBeCloseTo(3 * Math.PI / 5, 10)
  })

  test('geçersiz görünümde konum değişmez', () => {
    expect(snapToGrid(view({ width: 0 }), { a: 1.37, b: 2.11 })).toEqual({ a: 1.37, b: 2.11 })
  })

  test('yakalanan nesne yoksa nokta köşeye konur, köşedeki nokta yeniden kullanılır', () => {
    const position = { a: 1.37, b: 2.11 }
    const corner = { a: 1.4, b: 2.2 }
    expect(pointCandidate({ position, hit: null })).toEqual({ position })
    expect(pointCandidate({ position, hit: null, grid: { position: corner, point: null } })).toEqual({ position: corner })
    const standing = freePoint(1.4, 2.2)
    expect(pointCandidate({ position, hit: null, grid: { position: corner, point: standing } })).toEqual({ existing: standing })
  })

  test('sürüklenen şeklin yakalanan noktası köşeye oturur, şekil onunla kayar', () => {
    const snap = (point: { a: number; b: number }) => snapToGrid(view(), point) as { a: number; b: number }
    const A = freePoint(0.6, 0.6)
    const B = freePoint(1.37, 0.6)
    const drag = beginObjectDrag({ type: 'lineSegment', A, B } as never, [], { a: 1.3, b: 0.6 })!
    moveObjectDrag(drag, { a: 1.65, b: 0.61 }, snap)
    // B en yakın nokta: 1.72 → 1.8; A aynı kaymayla gelir, uzunluk korunur.
    expect(B.a).toBe(1.8)
    expect(A.a).toBeCloseTo(1.03, 10)
    expect(B.b).toBe(0.6)
    moveObjectDrag(drag, { a: 1.3, b: 0.6 }, snap)
    expect(B.a).toBe(1.37)
    expect(A.a).toBe(0.6)
  })
})

const cards = (page: Page) => page.locator('#objectsContainer .expr-block input[readonly]')

async function enterCommand(page: Page, command: string): Promise<void> {
  await page.locator('#giris').fill(command)
  await page.locator('#giris').press('Enter')
}

async function selectTool(page: Page, action: string): Promise<void> {
  await page.evaluate(action => window.drAW2DToolbar!.selectToolByAction(action, { showToast: false }), action)
}

test.describe('arayüz', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#giris')).toBeVisible()
  })

  test('varsayılan açıktır; fareyle konan nokta kareye yapışır, tam sayıya değil', async ({ page }) => {
    await expect(page.locator('#gridSnap')).toHaveAttribute('aria-pressed', 'true')
    await selectTool(page, 'point')
    await page.locator('#canvas').click({ position: { x: 743, y: 258 } })
    await expect(cards(page)).toHaveValue('A=(2.40,2.40)')
  })

  test('kalem de aynı köşeye koyar', async ({ page }) => {
    await selectTool(page, 'point')
    await page.locator('#canvas').evaluate(canvas => {
      const box = canvas.getBoundingClientRect()
      const event = (type: string) => new PointerEvent(type, {
        pointerId: 7, pointerType: 'pen', button: 0, bubbles: true, clientX: box.left + 743, clientY: box.top + 258,
      })
      canvas.dispatchEvent(event('pointerdown'))
      canvas.dispatchEvent(event('pointerup'))
    })
    await expect(cards(page)).toHaveValue('A=(2.40,2.40)')
  })

  test('köşede duran nokta yeniden kullanılır, üst üste nokta açılmaz', async ({ page }) => {
    await enterCommand(page, '(2,2)')
    await selectTool(page, 'point')
    // 11 piksel uzakta: yakalama sınırının dışında, ama en yakın köşe aynı nokta.
    await page.locator('#canvas').click({ position: { x: 708, y: 292 } })
    await expect(cards(page)).toHaveCount(1)
  })

  test('nesne üzerindeki nokta nesnede kalır, kareye yapışmaz', async ({ page }) => {
    await enterCommand(page, 'y=0.37')
    await selectTool(page, 'point')
    await page.locator('#canvas').click({ position: { x: 743, y: 460 } })
    await expect(cards(page).first()).toHaveValue('A=(2.43,0.37)')
  })

  test('araçların aldığı noktalar da yapışır', async ({ page }) => {
    await selectTool(page, 'linesegment')
    await page.locator('#canvas').click({ position: { x: 543, y: 458 } })
    await page.locator('#canvas').click({ position: { x: 743, y: 258 } })
    await expect(page.locator('#objectsContainer .expr-block')).toHaveCount(3)
    await expect(cards(page).nth(1)).toHaveValue('B=(2.40,2.40)')
    await expect(cards(page).nth(2)).toHaveValue('A=(0.40,0.40)')
  })

  test('sürüklenen nokta yapışır; seçerken titreyen el kare dışı noktayı oynatmaz', async ({ page }) => {
    await enterCommand(page, '(1.37,1.13)')
    await selectTool(page, 'select')
    await page.mouse.move(637, 387)
    await page.mouse.down()
    await page.mouse.move(638, 388)
    await page.mouse.up()
    await expect(cards(page)).toHaveValue('A=(1.37,1.13)')
    await expect(page.locator('#undo')).toBeEnabled()

    await page.mouse.move(637, 387)
    await page.mouse.down()
    await page.mouse.move(683, 337)
    await page.mouse.up()
    await expect(cards(page)).toHaveValue('A=(1.80,1.60)')
  })

  test('düğmeyle kapanır, kapalıyken serbest konur ve sayfa yenilenince kapalı kalır', async ({ page }) => {
    await page.locator('#gridSnap').click()
    await expect(page.locator('#gridSnap')).toHaveAttribute('aria-pressed', 'false')
    await selectTool(page, 'point')
    await page.locator('#canvas').click({ position: { x: 743, y: 258 } })
    await expect(cards(page)).toHaveValue('A=(2.43,2.42)')

    await selectTool(page, 'select')
    await page.mouse.move(743, 258)
    await page.mouse.down()
    await page.mouse.move(751, 250)
    await page.mouse.up()
    await expect(cards(page)).toHaveValue('A=(2.51,2.50)')

    await page.reload()
    await expect(page.locator('#gridSnap')).toHaveAttribute('aria-pressed', 'false')
    await page.locator('#gridSnap').click()
    await expect(page.locator('#gridSnap')).toHaveAttribute('aria-pressed', 'true')
    await page.reload()
    await expect(page.locator('#gridSnap')).toHaveAttribute('aria-pressed', 'true')
  })

  test('eski nokta anahtar açılınca kendiliğinden kaymaz', async ({ page }) => {
    await page.locator('#gridSnap').click()
    await enterCommand(page, '(1.37,1.13)')
    await page.locator('#gridSnap').click()
    await expect(cards(page)).toHaveValue('A=(1.37,1.13)')
  })
})
