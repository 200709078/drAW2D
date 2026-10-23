import { expect, test } from '@playwright/test'

test('stiller betikten önce yüklenir; betik çalışmadan da panel simgeleri küçük kalır', async ({ page }) => {
  // Without any script the page shows its first, unscripted paint.
  await page.route(/\.(?:js|ts)(?:\?.*)?$/, route => route.abort())
  await page.goto('/')
  for (const id of ['btnimgCalc', 'btnimgAcordeon']) {
    const box = await page.locator(`#${id}`).boundingBox()
    expect(box, id).not.toBeNull()
    expect(box!.width, id).toBeLessThanOrEqual(34)
    expect(box!.height, id).toBeLessThanOrEqual(34)
  }
})

test('tarayıcıda özel başlık çubuğu eklenmez ve sayfa başlığı değişmez', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#giris')).toBeVisible()
  await expect(page.locator('#titlebar')).toHaveCount(0)
  await expect(page).toHaveTitle('drAW2D | mADEMatik')
  expect(await page.locator('#canvas').boundingBox()).toMatchObject({ x: 0, y: 0 })
})
