import { expect, test, type Page } from '@playwright/test'

interface ObjectRow { input: string; output: string }
interface CanvasRegion { x: number; y: number; width: number; height: number }

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
  expect(runtimeFailures.get(page), 'Komutlar uygulamanın JavaScript akışını kesmemeli').toEqual([])
})

async function enterCommand(page: Page, command: string): Promise<void> {
  await page.locator('#giris').fill(command)
  await page.locator('#giris').press('Enter')
  await expect(page.locator('#giris')).toHaveValue('')
}

async function objectRows(page: Page): Promise<ObjectRow[]> {
  return page.locator('#objectsContainer .expr-block').evaluateAll(rows => rows.map(row => ({
    input: row.querySelector('input')!.value,
    output: row.querySelector('output')!.value,
  })))
}

async function nextVisibleObjectId(page: Page): Promise<number> {
  const ids = await page.locator('#objectsContainer .expr-block input[readonly]').evaluateAll(inputs =>
    inputs.map(input => Number(input.id.replace(/-input$/, ''))))
  expect(ids.every(Number.isSafeInteger)).toBe(true)
  return Math.max(-1, ...ids) + 1
}

// The initial viewport has origin CSS(500,500), with 100 CSS pixels per unit.
function aroundWorldPoint(x: number, y: number): CanvasRegion {
  return { x: Math.floor(500 + 100 * x) - 4, y: Math.floor(500 - 100 * y) - 4, width: 9, height: 9 }
}

async function canvasHash(page: Page, region: CanvasRegion): Promise<number> {
  await page.evaluate(() => new Promise<void>(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  }))
  return page.locator('#canvas').evaluate((canvas: HTMLCanvasElement, area) => {
    const rect = canvas.getBoundingClientRect()
    const pixels = canvas.getContext('2d')!.getImageData(
      Math.floor(area.x * canvas.width / rect.width),
      Math.floor(area.y * canvas.height / rect.height),
      Math.ceil(area.width * canvas.width / rect.width),
      Math.ceil(area.height * canvas.height / rect.height),
    ).data
    let hash = 2166136261
    for (const value of pixels) hash = Math.imul(hash ^ value, 16777619)
    return hash >>> 0
  }, region)
}

test('afin ifadeler işlem sırasından bağımsız doğru olur ve kesişime katılır', async ({ page }) => {
  const cards = page.locator('#objectsContainer .expr-block input[readonly]')
  await enterCommand(page, '2+3*x')
  await expect(cards.first()).toHaveValue(/^f:\s*y\s*=\s*3x\s*\+\s*2$/)
  await enterCommand(page, '2*(x+1)')
  await expect(cards.first()).toHaveValue(/^g:\s*y\s*=\s*2x\s*\+\s*2$/)
  await enterCommand(page, 'x/2')
  await expect(cards.first()).toHaveValue(/^h:\s*y\s*=\s*0\.50x$/)
  await enterCommand(page, 'Kesiştir(f,g)')
  const rows = page.locator('#objectsContainer .expr-block')
  await expect(rows).toHaveCount(4)
  await expect(rows.first().locator('input[readonly]')).toHaveValue('A=Kesiştir(f,g)')
  await expect(rows.first().locator('output')).toHaveText('A=(0,2)')
})

test('iç içe virgüllü sayısal ifadeler nokta ve çember argümanlarında değerlendirilir', async ({ page }) => {
  await enterCommand(page, '(log(2,8),max(1,2))')
  await expect.poll(() => objectRows(page)).toEqual([{ input: 'A=(3,2)', output: '' }])
  await enterCommand(page, 'Çember((sin(pi/2),log(2,8)),sqrt(4))')
  await expect.poll(() => objectRows(page)).toEqual([
    { input: 'a: Çember(B,2)', output: '' },
    { input: 'B=(1,3)', output: '' },
    { input: 'A=(3,2)', output: '' },
  ])
})

test('iç noktadan başarısız çember teğeti nokta, kimlik veya geçmiş tüketmez', async ({ page }) => {
  await enterCommand(page, 'Çember((0,0),2)')
  const circleRows = await objectRows(page)
  const nextId = await nextVisibleObjectId(page)
  await enterCommand(page, 'TeğetC(a,(1,0))')
  await expect(page.locator('#snackbar')).toHaveClass(/\bis-visible\b/)
  await expect.poll(() => objectRows(page)).toEqual(circleRows)
  await expect(page.locator('#redo')).toBeDisabled()

  await enterCommand(page, '(3,4)')
  const cards = page.locator('#objectsContainer .expr-block input[readonly]')
  await expect(cards.first()).toHaveValue('B=(3,4)')
  await expect(cards.first()).toHaveAttribute('id', `${nextId}-input`)
  const withPoint = await objectRows(page)
  await page.locator('#undo').click()
  await expect.poll(() => objectRows(page)).toEqual(circleRows)
  await page.locator('#redo').click()
  await expect.poll(() => objectRows(page)).toEqual(withPoint)
  await page.locator('#undo').click()
  await page.locator('#undo').click()
  await expect(cards).toHaveCount(0)
  await expect(page.locator('#undo')).toBeDisabled()
})

test('geçersiz başvurular ve yarım komutlar geri alınmış belgenin yinelemesini korur', async ({ page }) => {
  await enterCommand(page, '(0,0)')
  await enterCommand(page, '(1,1)')
  const completeRows = await objectRows(page)
  const nextId = await nextVisibleObjectId(page)
  await page.locator('#undo').click()
  const undoneRows = await objectRows(page)
  const invalidCommands = [
    'YansıtNokta((4,5),MISSING)',
    'Çember((0,0),2,)',
    'Bileşke(x^2,)',
    'x^2,x<0; missing(x),x>=0',
    'Türev(Bileşke(f,g))',
    '(combinations(1e20,0),0)',
    'gamma(bignumber(1e20))',
    '(fraction(2)^fraction(61)-fraction(1))^fraction(1,2)',
  ]
  for (const command of invalidCommands) {
    await test.step(command, async () => {
      await enterCommand(page, command)
      await expect.poll(() => objectRows(page)).toEqual(undoneRows)
      await expect(page.locator('#redo')).toBeEnabled()
    })
  }
  await page.locator('#redo').click()
  await expect.poll(() => objectRows(page)).toEqual(completeRows)
  await expect(page.locator('#redo')).toBeDisabled()
  await enterCommand(page, '(2,3)')
  const newest = page.locator('#objectsContainer .expr-block input[readonly]').first()
  await expect(newest).toHaveValue('C=(2,3)')
  await expect(newest).toHaveAttribute('id', `${nextId}-input`)
})

test('adlandırılmış fonksiyon çağrısı argümanı yerine koyar ve türev kartındaki kaynak adını kullanır', async ({ page }) => {
  await enterCommand(page, 'Türev(x^2)')
  const source = page.locator('#objectsContainer .expr-block')
  await expect(source).toHaveCount(1)
  await expect(source.locator('input[readonly]')).toHaveValue(/^f:\s*y\s*=\s*x\s*\^\s*2$/)
  const x = 0.37
  const region = aroundWorldPoint(x, (x + 1) ** 2 + Math.sin(x))
  const beforeCall = await canvasHash(page, region)
  await enterCommand(page, 'f(x+1)+sin(x)')
  await expect(source).toHaveCount(2)
  await expect(source.first().locator('input[readonly]')).toHaveValue(/^g:\s*y\s*=.*sin\(x\)/)
  expect(await canvasHash(page, region), 'f(x+1) kaynak x² ifadesine x+1 yerleştirmeli')
    .not.toBe(beforeCall)
})

test('normal metin kısayolları çalışır ve IME Enter tuşu komutu erken göndermez', async ({ page }) => {
  const input = page.locator('#giris')
  await input.fill('silinecek metin')
  await input.press('Control+a')
  await input.pressSequentially('-x+2')
  await expect(input).toHaveValue('-x+2')
  await input.press('Enter')
  const cards = page.locator('#objectsContainer .expr-block input[readonly]')
  await expect(cards).toHaveCount(1)
  await expect(cards.first()).toHaveValue(/^f:\s*y\s*=\s*-x\s*\+\s*2$/)

  await input.fill('(1,2)')
  await input.evaluate(element => {
    element.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter', code: 'Enter', isComposing: true, bubbles: true, cancelable: true,
    }))
    const legacyComposition = new KeyboardEvent('keydown', {
      key: 'Enter', code: 'Enter', bubbles: true, cancelable: true,
    })
    Object.defineProperty(legacyComposition, 'keyCode', { value: 229 })
    element.dispatchEvent(legacyComposition)
  })
  await expect(input).toHaveValue('(1,2)')
  await expect(cards).toHaveCount(1)
  await input.press('Enter')
  await expect(input).toHaveValue('')
  await expect(cards).toHaveCount(2)
  await expect(cards.first()).toHaveValue('A=(1,2)')
})

test('tek noktalı parçalı fonksiyon tanım noktasında görünür', async ({ page }) => {
  const region = aroundWorldPoint(1.37, 1.83)
  const empty = await canvasHash(page, region)
  await enterCommand(page, '-1,x<0; 1.83,x=1.37')
  await expect(page.locator('#objectsContainer .expr-block')).toHaveCount(1)
  expect(await canvasHash(page, region), 'x=1.37 dalı y=1.83 noktasını görünür kılmalı').not.toBe(empty)
})
