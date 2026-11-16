// Google Play mağaza görsellerini üretir (docs/play/): npm run play:gorseller (önce derler).
// Derlenmiş uygulama (dist/) Vite önizleme sunucusunda açılır, çizimler giriş satırına yazılan komutlarla kurulur.
// Nesne renkleri uygulamada rastgeledir; görseller her seferinde aynı ve okunaklı olsun diye sayfanın Math.random'u
// aşağıdaki renkleri sırayla verecek biçimde değiştirilir (her renk üç çağrı: kırmızı, yeşil, mavi).
import { chromium } from '@playwright/test'
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { preview } from 'vite'

const root = path.resolve(import.meta.dirname, '../..')
const out = path.join(root, 'docs/play')
const shots = path.join(out, 'ekran')
mkdirSync(shots, { recursive: true })

// Uygulama kanal başına 0–191 arası değer üretir (255 × 0,75).
const COLORS = [[26, 86, 191], [191, 38, 38], [24, 128, 56], [128, 48, 160], [191, 104, 0], [0, 120, 140]]

const DEVICES = {
  telefon: { viewport: { width: 360, height: 720 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  tablet7: { viewport: { width: 600, height: 960 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  tablet10: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, isMobile: false, hasTouch: true },
}

// Sahneler giriş satırına yazılan komutlardır. Telefonda "kartlar" sahnesi alt paneli açık gösterir.
const SCENES = {
  fonksiyon: Object.assign(['x^2-2x-3', '2sin(x)', 'Kesiştir(f,g)', 'Kök(f)', 'Ekstremum(f)'], { zoomOut: 1 }),
  geometri: Object.assign(['A=(-3,-1)', 'B=(3,-1)', 'C=(1,3)', 'Çokgen(A,B,C)', 'Çember(A,B,C)', 'OrtaDikme(A,B)', 'OrtaDikme(B,C)'], { zoomOut: 1 }),
  vektor: Object.assign(['u=(2,1)', 'v=(1,2)', 'w=u+v'], { zoomOut: { telefon: 1 } }),
  kartlar: Object.assign(['x^2-2x-3', '2sin(x)', 'Kesiştir(f,g)', 'Kök(f)', 'Ekstremum(f)'], { panel: true, phoneOnly: true }),
}

const PORT = 4180
const url = `http://127.0.0.1:${PORT}/`
const server = await preview({ root, preview: { host: '127.0.0.1', port: PORT, strictPort: true } })
const browser = await chromium.launch(existsSync('/usr/bin/chromium') ? { executablePath: '/usr/bin/chromium' } : {})

async function scene(device, name) {
  const context = await browser.newContext({ ...DEVICES[device], locale: 'tr-TR' })
  await context.addInitScript((colors) => {
    let call = 0
    Math.random = () => {
      const color = colors[Math.floor(call / 3) % colors.length]
      const value = color[call % 3] / 191.25
      call += 1
      return Math.min(value, 0.999)
    }
  }, COLORS)
  const page = await context.newPage()
  await page.goto(url)
  await page.waitForSelector('#giris', { state: 'attached' })
  await page.waitForTimeout(800)
  const narrow = DEVICES[device].viewport.width < 700
  // Kartlarda matematik yazımı kapalı: açıkken adın ilk harfi kırpılıyor (yol haritasında, 2026-11-16).
  if ((await page.getAttribute('#cardMath', 'aria-pressed')) === 'true') await page.evaluate(() => document.getElementById('cardMath')?.click())
  // Dar ekranda giriş satırı alt paneldedir: önce paneli aç.
  if (narrow) await page.click('#panelHandle')
  for (const command of SCENES[name]) {
    await page.fill('#giris', command)
    await page.press('#giris', 'Enter')
    await page.waitForTimeout(250)
  }
  // Matematik klavyesi giriş satırına dokununca açılır; görüntüde kapalı olsun.
  const keyboard = page.locator('button[title="Matematik klavyesini kapat"]')
  if (await keyboard.isVisible()) await keyboard.click()
  await page.evaluate(() => (document.activeElement)?.blur())
  // Telefonda alt panel kapanır (çizim görünsün); "kartlar" sahnesinde açık kalır.
  if (narrow && !SCENES[name].panel) await page.click('#panelHandle')
  // Telefonda bir adım uzaklaşılır: çizim ekrana sığar.
  const zoomOut = SCENES[name].zoomOut
  const steps = typeof zoomOut === 'object' ? zoomOut[device] ?? 0 : zoomOut ?? 0
  if (narrow && steps) {
    const box = await page.locator('canvas').first().boundingBox()
    await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.4)
    for (let step = 0; step < steps; step++) { await page.mouse.wheel(0, 120); await page.waitForTimeout(150) }
  }
  await page.waitForTimeout(1500)
  return { context, page }
}

const save = (page, name) => page.screenshot({ path: path.join(shots, `${name}.png`) })

try {
  for (const device of Object.keys(DEVICES)) {
    const names = Object.keys(SCENES).filter(name => device === 'telefon' || !SCENES[name].phoneOnly)
    for (const [index, name] of names.entries()) {
      const { context, page } = await scene(device, name)
      await save(page, `${device}-${index + 1}-${name}`)
      await context.close()
    }
    console.log(`${device}: tamam`)
  }

  // Öne çıkan görsel (1024×500)
  const page = await browser.newPage({ viewport: { width: 1024, height: 500 } })
  const icon = readFileSync(path.join(root, 'public/img/app-icon.png')).toString('base64')
  await page.setContent(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><style>
      body { margin: 0; width: 1024px; height: 500px; display: flex; align-items: center; gap: 48px; padding: 0 64px; box-sizing: border-box;
          background: linear-gradient(135deg, #ffffff 0%, #e8f0fe 100%); font-family: "Noto Sans", Arial, sans-serif; color: #202124; }
      img { width: 220px; height: 220px; flex: none; }
      h1 { margin: 0; font-size: 84px; letter-spacing: -1px; }
      h1 span { color: #1a56db; }
      p { margin: 8px 0 0; font-size: 30px; color: #3c4043; }
      ul { display: flex; gap: 12px; margin: 28px 0 0; padding: 0; list-style: none; }
      li { padding: 8px 16px; border-radius: 999px; background: #ffffff; border: 2px solid #c6dafc; font-size: 20px; font-weight: 600; color: #1a56db; }
  </style></head><body>
      <img src="data:image/png;base64,${icon}" alt="">
      <div><h1>dr<span>AW</span>2D</h1><p>Geometri ve fonksiyon çizimi</p>
      <ul><li>Grafik</li><li>Geometri</li><li>Vektör</li><li>Türkçe komut</li></ul></div>
  </body></html>`)
  await page.waitForTimeout(500)
  await page.screenshot({ path: path.join(out, 'one-cikan-1024x500.png') })
  copyFileSync(path.join(root, 'public/img/app-icon.png'), path.join(out, 'simge-512.png'))
  console.log('öne çıkan görsel ve simge: tamam')
} finally {
  await browser.close()
  await new Promise((resolve) => server.httpServer.close(resolve))
}
