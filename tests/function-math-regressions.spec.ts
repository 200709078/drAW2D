import { expect, test, type Page } from '@playwright/test'

interface CanvasRegion {
  x: number
  y: number
  width: number
  height: number
}

const runtimeFailures = new WeakMap<Page, string[]>()

test.beforeEach(async ({ page }) => {
  const failures: string[] = []
  runtimeFailures.set(page, failures)
  page.on('pageerror', error => failures.push(error.message))
  await page.goto('/')
  await expect(page.locator('#giris')).toBeVisible()
})

test.afterEach(({ page }) => {
  expect(runtimeFailures.get(page), 'Mathematical inputs must not interrupt the application').toEqual([])
})

async function enterCommand(page: Page, command: string): Promise<void> {
  await page.locator('#giris').fill(command)
  await page.locator('#giris').press('Enter')
  await expect(page.locator('#giris')).toHaveValue('')
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

// The initial viewport places the origin at CSS(500,500), with 100px per unit.
function aroundWorldPoint(x: number, y: number): CanvasRegion {
  return { x: Math.floor(500 + 100 * x) - 4, y: Math.floor(500 - 100 * y) - 4, width: 9, height: 9 }
}

test('equation cards retain whole coefficients and fractional intercepts', async ({ page }) => {
  await enterCommand(page, '21x+0.25')
  const cards = page.locator('#objectsContainer .expr-block input[readonly]')
  await expect(cards).toHaveCount(1)
  await expect(cards.first()).toHaveValue(/^f:\s*y\s*=\s*21x\s*\+\s*0\.25$/)

  await enterCommand(page, '0.11x+0.25')
  await expect(cards).toHaveCount(2)
  await expect(cards.first()).toHaveValue(/^g:\s*y\s*=\s*0\.11x\s*\+\s*0\.25$/)
})

test('named function references work alongside builtins and draw the combined value', async ({ page }) => {
  await enterCommand(page, 'x^2')
  const region = aroundWorldPoint(1.37, 1.37 ** 2 + Math.sin(1.37))
  const sourceOnly = await canvasHash(page, region)

  await enterCommand(page, 'sin(x)+f')
  await expect(page.locator('#objectsContainer .expr-block')).toHaveCount(2)
  await expect(page.locator('#objectsContainer .expr-block input[readonly]').first())
    .toHaveValue(/^g:\s*y\s*=.*sin\(x\)/)
  expect(await canvasHash(page, region), 'The curve must include the named function in its computed value')
    .not.toBe(sourceOnly)
})

test('piecewise expressions accept builtin argument commas and draw both branches', async ({ page }) => {
  const positive = aroundWorldPoint(2.37, Math.log(2.37) / Math.log(5))
  const negative = aroundWorldPoint(-1.37, 1)
  const beforePositive = await canvasHash(page, positive)
  const beforeNegative = await canvasHash(page, negative)

  await enterCommand(page, 'log(5,x),x>0; max(x,1),x<=0')
  await expect(page.locator('#objectsContainer .expr-block')).toHaveCount(1)
  await expect(page.locator('#objectsContainer .expr-block input[readonly]'))
    .toHaveValue(/^f\(x\)\s*=\s*\{.*log\(5,x\).*max\(x,1\).*\}$/)
  expect(await canvasHash(page, positive), 'The positive branch must use log(base,value)')
    .not.toBe(beforePositive)
  expect(await canvasHash(page, negative), 'The negative branch must remain visible')
    .not.toBe(beforeNegative)
})

test('huge sequences and a limit with an undefined center leave drawing and input responsive', async ({ page }) => {
  await enterCommand(page, 'Dizi(n,1,9007199254740991)')
  await expect(page.locator('#objectsContainer .expr-block')).toHaveCount(1)
  await enterCommand(page, 'x=2')
  await expect(page.locator('#objectsContainer .expr-block')).toHaveCount(2)

  // factorial(-x) is undefined at x=1, but its negative-x branch is finite.
  const branch = aroundWorldPoint(-1.5, 3 * Math.sqrt(Math.PI) / 4)
  const beforeLimit = await canvasHash(page, branch)
  // The limit and its δ slider parameter.
  await enterCommand(page, 'Limit(factorial(-x),1)')
  await expect(page.locator('#objectsContainer .expr-block')).toHaveCount(4)
  expect(await canvasHash(page, branch), 'An undefined limit center must not prevent valid branches from painting')
    .not.toBe(beforeLimit)

  await enterCommand(page, 'x=-1')
  await expect(page.locator('#objectsContainer .expr-block')).toHaveCount(5)
  await expect(page.locator('#objectsContainer .expr-block input[readonly]').first())
    .toHaveValue(/^denk2:\s*x\s*=\s*-1$/)
})
