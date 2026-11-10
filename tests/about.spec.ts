import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string }

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('#giris')).toBeAttached()
})

test('Dosya menüsünün sonunda Yardım ve Hakkında; Hakkında küçük pencerede açılır, her yoldan kapanır', async ({ page }) => {
  await page.locator('#fileMenuButton').click()
  const items = page.locator('#fileMenu .menu-item')
  await expect(items.nth(-2)).toHaveId('fileHelp')
  await expect(items.nth(-1)).toHaveId('fileAbout')
  await page.locator('#fileAbout').click()
  const about = page.locator('#about-popup')
  await expect(about).toBeVisible()
  await expect(page.locator('#fileMenu')).toBeHidden()
  await expect(page.locator('#about-version')).toHaveText(`sürüm ${version}`)
  await expect(about.getByRole('link', { name: /madematik\.com/ })).toHaveAttribute('href', 'https://madematik.com')
  const download = about.getByRole('link', { name: /Linux/ })
  await expect(download).toHaveAttribute('href', 'https://madematik.com/projelerim/draw2d#indirmeler')
  await expect(download).toHaveAttribute('target', '_blank')
  await expect(about).toContainText('MIT')
  await expect(about).toContainText('ademvarol@madematik.com')

  await page.locator('#about-close').click()
  await expect(about).toBeHidden()
  await page.locator('#fileMenuButton').click()
  await page.locator('#fileAbout').click()
  await page.keyboard.press('Escape')
  await expect(about).toBeHidden()
  await page.locator('#fileMenuButton').click()
  await page.locator('#fileAbout').click()
  await about.click({ position: { x: 5, y: 5 } })
  await expect(about).toBeHidden()
})

test('Yardım hem çubukta hem Dosya menüsünde; F1 açar, Esc kapatır', async ({ page }) => {
  const help = page.locator('#help-popup')
  await page.locator('#fileMenuButton').click()
  await page.locator('#fileHelp').click()
  await expect(help).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(help).toBeHidden()
  await page.locator('#canvas').click({ position: { x: 300, y: 300 } })
  await page.keyboard.press('F1')
  await expect(help).toBeVisible()
  await page.locator('#help-popup .help-close').click()
  await expect(help).toBeHidden()
  await expect(page.locator('#helpMenuButton')).toBeVisible()
})
