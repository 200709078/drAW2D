import { expect, test, type Page } from '@playwright/test'
import { TOOLS, visibleGroups } from '../src/ui/tool-registry'

const runtimeFailures = new WeakMap<Page, string[]>()

test.beforeEach(async ({ page }) => {
  const failures: string[] = []
  runtimeFailures.set(page, failures)
  page.on('pageerror', error => failures.push(error.message))
  await page.goto('/')
  await expect(page.locator('#canvas')).toBeVisible()
})

test.afterEach(({ page }) => {
  expect(runtimeFailures.get(page), 'Araç çubuğu JavaScript hatası üretmemeli').toEqual([])
})

test('araç kaydı her aracı bir kez, var olan bir gruba yerleştirir', () => {
  const actions = TOOLS.map(tool => tool.action)
  expect(new Set(actions).size).toBe(actions.length)
  expect(visibleGroups().flatMap(entry => entry.tools.map(tool => tool.action))).toEqual(actions)
  expect(visibleGroups().map(entry => entry.group.label)).toEqual(
    ['Taşı', 'Nokta', 'Doğru', 'Özel Doğrular', 'Çokgen', 'Çember', 'Ölçüm', 'Dönüşüm', 'Fonksiyon'])
})

test('grup düğmesi son aracını seçer, menüden seçilen araç grubun yüzü olur', async ({ page }) => {
  const toolbar = page.locator('#mainToolbar')
  const group = page.locator('#toolgroup-line')
  const menu = page.locator('#toolmenu-line')
  await expect(menu).toBeHidden()
  await group.click()
  await expect(toolbar).toHaveAttribute('data-action', 'line')
  await expect(menu).toBeVisible()
  await expect(page.locator('#snackTitle')).toHaveText('DOĞRU')
  await page.locator('#tool-linesegment').click()
  await expect(menu).toBeHidden()
  await expect(toolbar).toHaveAttribute('data-action', 'linesegment')
  await expect(group).toHaveAttribute('title', 'Doğru: Doğru Parçası')
  await expect(group.locator('img')).toHaveAttribute('src', './img/linesegment.svg')

  // The group remembers its tool: after another tool, its button chooses the segment again.
  await page.locator('#toolgroup-move').click()
  await expect(toolbar).toHaveAttribute('data-action', 'select')
  await expect(page.locator('#toolgroup-line')).not.toHaveClass(/is-active/)
  await group.click()
  await expect(toolbar).toHaveAttribute('data-action', 'linesegment')
  await page.locator('#canvas').click({ position: { x: 300, y: 300 } })
  await expect(menu).toBeHidden()

  // Single-tool groups have no menu.
  await expect(page.locator('#toolmenu-move')).toHaveCount(0)
  // Escape returns to the move tool and closes open menus.
  await page.locator('#toolgroup-circle').click()
  await expect(page.locator('#toolmenu-circle')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('#toolmenu-circle')).toBeHidden()
  await expect(toolbar).toHaveAttribute('data-action', 'select')
})

test('çubuktan seçilen araç çizer ve seçime döner', async ({ page }) => {
  await page.locator('#toolgroup-circle').click()
  await page.locator('#tool-circle2').click()
  await page.locator('#canvas').click({ position: { x: 500, y: 500 } })
  await page.locator('#canvas').click({ position: { x: 600, y: 500 } })
  await expect(page.locator('#objectsContainer .expr-block input[readonly]').first()).toHaveValue('a: Çember(A,B)')
  await expect(page.locator('#mainToolbar')).toHaveAttribute('data-action', 'select')
})

test.describe('dar ekran', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('araçlar alt paneldeki Araçlar sekmesindedir', async ({ page }) => {
    await expect(page.locator('#toolGroups')).toBeHidden()
    const current = page.locator('#currentTool')
    await expect(current).toBeVisible()
    await expect(current).toHaveAttribute('title', 'Araç: Taşı')
    await expect(page.locator('#rightWrapper')).toHaveClass(/\bhide\b/)
    await current.click()
    await expect(page.locator('#rightWrapper')).not.toHaveClass(/\bhide\b/)
    await expect(page.locator('#tabTools')).toHaveAttribute('aria-selected', 'true')
    await expect(page.locator('#toolsPanel')).toBeVisible()
    await expect(page.locator('#scrollWrapper')).toBeHidden()
    await expect(page.locator('#toolsPanel h3')).toHaveText(visibleGroups().map(entry => entry.group.label))

    await page.locator('#paneltool-point').click()
    await expect(page.locator('#paneltool-point')).toHaveClass(/is-active/)
    await expect(current).toHaveAttribute('title', 'Araç: Nokta')
    await page.touchscreen.tap(195 + 100, 200)
    await page.locator('#tabAlgebra').click()
    await expect(page.locator('#scrollWrapper')).toBeVisible()
    await expect(page.locator('#objectsContainer .expr-block input[readonly]')).toHaveValue('A=(1,2.20)')
  })
})
