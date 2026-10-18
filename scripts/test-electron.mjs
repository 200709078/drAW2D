import assert from 'node:assert/strict'
import path from 'node:path'
import { _electron as electron } from '@playwright/test'

const executablePath = process.env.DRAW2D_ELECTRON_EXECUTABLE
const launchEnvironment = { ...process.env, DRAW2D_DEV_SERVER_URL: '' }
delete launchEnvironment.ELECTRON_RUN_AS_NODE
const application = await electron.launch({
  ...(executablePath ? { executablePath, args: [] } : { args: ['.'] }),
  env: launchEnvironment,
  timeout: 30_000,
})

try {
  const page = await application.firstWindow()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('requestfailed', request => errors.push(`${request.url()}: ${request.failure()?.errorText}`))
  await page.waitForLoadState('load')
  assert.equal(await page.title(), 'drAW2D | mADEMatik')
  assert.ok(page.url().startsWith('file://'), 'Üretim çıktısı yerel dosyadan açılmalı')

  const preferences = await application.evaluate(({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows()[0]
    return window.webContents.getLastWebPreferences()
  })
  assert.equal(preferences.nodeIntegration, false)
  assert.equal(preferences.contextIsolation, true)
  assert.equal(preferences.sandbox, true)

  const input = page.locator('#giris')
  await input.fill('Türev(sin(x+1))')
  await input.press('Enter')
  await page.waitForFunction(() => document.querySelectorAll('#objectsContainer .expr-block').length === 1)
  assert.equal(await page.locator('#objectsContainer output').evaluate(output => output.value), "f': y = cos(x+1)")
  assert.equal(await page.evaluate(() => typeof window.require), 'undefined')
  assert.equal(await page.evaluate(() => typeof window.drAW2DRadialToolbar?.getActiveTool), 'function')

  const failedAssets = await page.evaluate(async () => {
    const results = await Promise.all([...document.images].map(async image => {
      try {
        await image.decode()
        return null
      } catch {
        return image.src
      }
    }))
    const audio = new Audio(new URL('sound/clear.mp3', location.href).href)
    results.push(await new Promise(resolve => {
      const timer = setTimeout(() => resolve(audio.src), 5_000)
      audio.onloadedmetadata = () => { clearTimeout(timer); resolve(null) }
      audio.onerror = () => { clearTimeout(timer); resolve(audio.src) }
      audio.load()
    }))
    return results.filter(Boolean)
  })
  assert.deepEqual(failedAssets, [], 'Simgeler ve ses paket içinde bulunmalı')
  assert.deepEqual(errors, [], 'Electron içinde JavaScript veya varlık yükleme hatası olmamalı')
  await page.screenshot({ path: path.join('test-results', 'electron.png') })
  console.log('Electron kontrolü geçti: file:// açılış, türev, araç çubuğu, varlıklar ve renderer yalıtımı.')
} finally {
  await application.close()
}
