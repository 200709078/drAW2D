import { expect, test, type Page } from '@playwright/test'

/** Buttons visible in the bar (not in a menu) and how many of them overlap. */
async function barState(page: Page) {
  return page.evaluate(() => {
    const bar = document.querySelector<HTMLElement>('#mainToolbar')!
    const buttons = [...bar.querySelectorAll<HTMLButtonElement>('button')]
      .filter(button => button.offsetParent !== null && !button.closest('.tool-menu, .file-menu'))
    const rects = buttons.map(button => button.getBoundingClientRect())
    let overlaps = 0
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i]!, b = rects[j]!
        if (a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1) overlaps++
      }
    }
    const right = bar.getBoundingClientRect().right
    return {
      ids: buttons.map(button => button.id),
      overlaps,
      outside: buttons.filter(button => button.getBoundingClientRect().right > right + 1).map(button => button.id),
      more: !document.querySelector<HTMLElement>('.more-menu-wrapper')!.hidden,
      menu: [...document.querySelectorAll('#moreMenu strong')].map(item => item.textContent),
    }
  })
}

// Yatay telefonda (839×343, panel yanda) araç grupları işlem düğmelerinin üstüne biniyordu.
for (const [width, height, touch] of [[1600, 900, false], [1100, 700, false], [839, 343, true], [392, 823, true], [360, 740, true]] as const) {
  test(`${width}×${height}: araç çubuğunda üst üste binen ya da taşan düğme yok`, async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: touch, isMobile: touch })
    await page.goto('/')
    await expect(page.locator('#mainToolbar')).toBeVisible()
    const state = await barState(page)
    expect(state.overlaps, state.ids.join(' ')).toBe(0)
    expect(state.outside).toEqual([])
    for (const id of ['fileMenuButton', 'undo', 'redo', 'btnCalc']) expect(state.ids, id).toContain(id)
    // "⋯" yalnız bir şey sığmadığında görünür.
    expect(state.more).toBe(state.menu.length > 0)
    if (width >= 1100) expect(state.more).toBe(false)
    await page.close()
  })
}

test('"⋯" menüsünden araç seçilir, işlem çalışır; Esc ve dışarı dokunuş kapatır', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 839, height: 343 }, hasTouch: true, isMobile: true })
  await page.goto('/')
  const state = await barState(page)
  expect(state.more).toBe(true)
  // İşlemler önce, sonra sondaki araç grupları menüye geçer; ilk grup (Taşı) çubukta kalır.
  expect(state.menu.slice(0, 3)).toEqual(['Yardım', 'Standart Görünüm', 'Temizle'])
  expect(state.ids).toContain('toolgroup-move')

  const button = page.locator('#moreMenuButton')
  const menu = page.locator('#moreMenu')
  await button.tap()
  await expect(menu).toBeVisible()
  await expect(button).toHaveAttribute('aria-expanded', 'true')
  await menu.getByRole('menuitemradio', { name: 'Döndür' }).tap()
  await expect(menu).toBeHidden()
  expect(await page.evaluate(() => window.drAW2DToolbar!.getActiveTool().action)).toBe('rotate')
  // Etkin araç menüdeyse "⋯" vurgulanır ve menüde işaretlidir.
  await expect(button).toHaveClass(/is-active/)
  await button.tap()
  await expect(menu.getByRole('menuitemradio', { name: 'Döndür' })).toHaveAttribute('aria-checked', 'true')
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()

  await page.locator('#toolgroup-move').tap()
  await expect(button).not.toHaveClass(/is-active/)
  // Taşı aracındayken tuvale dokunmak yalnız menüyü kapatır.
  await button.tap()
  await page.locator('#canvas').tap({ position: { x: 100, y: 300 } })
  await expect(menu).toBeHidden()

  // Menüdeki işlem, gizlenen düğmenin kendisini çalıştırır.
  await button.tap()
  await menu.getByRole('menuitem', { name: 'Yardım' }).tap()
  await expect(page.locator('#help-popup')).toBeVisible()
  await page.close()
})

test('pencere genişleyince menüye geçenler çubuğa döner', async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 839, height: 343 } })
  await page.goto('/')
  expect((await barState(page)).more).toBe(true)
  await page.setViewportSize({ width: 1600, height: 900 })
  await expect.poll(async () => (await barState(page)).more).toBe(false)
  const state = await barState(page)
  for (const id of ['helpMenuButton', 'btnStandartWiew', 'clear', 'toolgroup-function']) expect(state.ids, id).toContain(id)
  expect(state.overlaps).toBe(0)
  await page.close()
})
