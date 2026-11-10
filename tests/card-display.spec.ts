import { expect, test, type Page } from '@playwright/test'
import { definitionText } from '../src/ui/card-definition'

test('Tanım görünümü komutu sözle anlatır; ad ek almaz, anlatımı olmayan komut olduğu gibi kalır', () => {
  expect(definitionText('C = OrtaNokta(A,B)')).toBe('C: A ve B noktalarının orta noktası')
  expect(definitionText('c: Çember(A,2)')).toBe('c: merkezi A noktası, yarıçapı 2 olan çember')
  expect(definitionText('b: Çember(A,B)')).toBe('b: merkezi A noktası olan, B noktasından geçen çember')
  expect(definitionText('e: Çember(A,B,C)')).toBe('e: A, B ve C noktalarından geçen çember')
  expect(definitionText('g: Doğru(A,B)')).toBe('g: A ve B noktalarından geçen doğru')
  expect(definitionText('h: DikDoğru(P,g)')).toBe('h: P noktasından geçen, g doğrusuna dik doğru')
  expect(definitionText('u_r: Bileşenler(u,r,s)')).toBe('u_r: u vektörünün r ve s doğrultularındaki bileşeni')
  expect(definitionText("A' = Döndür(A,90,O)")).toBe("A': A nesnesinin O noktası etrafında 90° döndürülmüş hâli")
  // Formüller, noktalar ve anlatımı olmayan komutlar değişmez.
  expect(definitionText('f: y = a*x+1')).toBe('f: y = a*x+1')
  expect(definitionText('A = (0,0)')).toBe('A = (0,0)')
  expect(definitionText('a: Dizi(n^2,1,5)')).toBe('a: Dizi(n^2,1,5)')
})

async function enter(page: Page, command: string): Promise<void> {
  await page.locator('#giris').fill(command)
  await page.locator('#giris').press('Enter')
  await expect(page.locator('#giris')).toHaveValue('')
}

/** The card whose text row (input) starts with the name. */
async function cardOf(page: Page, name: string) {
  const cards = page.locator('#objectsContainer > div')
  await expect.poll(() => cards.evaluateAll((items, prefix) =>
    items.some(card => (card.querySelector('input[id$="-input"]')?.value ?? '').startsWith(prefix)), name)).toBe(true)
  const index = await cards.evaluateAll((items, prefix) =>
    items.findIndex(card => (card.querySelector('input[id$="-input"]')?.value ?? '').startsWith(prefix)), name)
  return cards.nth(index)
}

test.describe('kart görünümü', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#giris')).toBeVisible()
    await enter(page, 'a=2')
    await enter(page, 'a*x+1')
    await enter(page, 'A=(0,0)')
    await enter(page, 'B=(4,2)')
    await enter(page, 'OrtaNokta(A,B)')
    await enter(page, 'x^2/4+sqrt(x-1)')
  })

  test('matematik yazımı formülleri kitaptaki gibi dizer; noktalar düz kalır; düğmeyle kapanır', async ({ page }) => {
    const g = await cardOf(page, 'g:')
    await expect(g.locator('.card-math math mfrac')).toHaveCount(1)
    await expect(g.locator('.card-math math msqrt')).toHaveCount(1)
    await expect(g.locator('.card-math math msup')).toHaveCount(1)
    await expect(g.locator('input[id$="-input"]')).toBeHidden()
    // Nokta formül değil: kendi satırı görünür.
    const A = await cardOf(page, 'A')
    await expect(A.locator('.card-math')).toBeHidden()
    await expect(A.locator('input[id$="-input"]')).toBeVisible()
    // Değeri önde olan kartta değer dizilir: f: y = 2x+1.
    const f = await cardOf(page, 'f:')
    await expect(f.locator('.card-math math')).toContainText('2')
    await expect(f.locator('output[id$="-output"]')).toBeHidden()

    await page.locator('#cardMath').click()
    await expect(page.locator('#cardMath')).toHaveAttribute('aria-pressed', 'false')
    await expect(g.locator('.card-math')).toBeHidden()
    await expect(g.locator('input[id$="-input"]')).toBeVisible()
    await expect(g.locator('input[id$="-input"]')).toHaveValue('g: y = x^2/4+sqrt(x-1)')
  })

  test('çift tıklayınca dizilmiş satır düz yazıyla düzenlenir', async ({ page }) => {
    const g = await cardOf(page, 'g:')
    await g.locator('.card-math').dblclick()
    const input = g.locator('input[id$="-input"]')
    await expect(input).toBeVisible()
    await expect(input).toBeFocused()
    await input.fill('g: x^3')
    await input.press('Enter')
    await expect(g.locator('.card-math math msup')).toHaveCount(1)
    await expect(g.locator('.card-math math mfrac')).toHaveCount(0)
  })

  test('Değer / Tanım / Komut: tanım ve komut değerleri gizler; seçim cihazda saklanır', async ({ page }) => {
    const C = await cardOf(page, 'C')
    const f = await cardOf(page, 'f:')
    await expect(C.locator('input[id$="-input"]')).toHaveValue('C=OrtaNokta(A,B)')
    await expect(C.locator('output[id$="-output"]')).toHaveText('C=(2,1)')

    await page.locator('#cardViewDefinition').click()
    await expect(page.locator('#cardViewDefinition')).toHaveAttribute('aria-pressed', 'true')
    await expect(C.locator('.card-math')).toHaveText('C: A ve B noktalarının orta noktası')
    await expect(C.locator('output[id$="-output"]')).toBeHidden()
    // f'nin tanımı a'ya bağlı yazılır, değeri (2x+1) görünmez.
    await expect(f.locator('input[id$="-input"]')).toHaveValue('f: y = a*x+1')
    await expect(f.locator('output[id$="-output"]')).toBeHidden()

    await page.locator('#cardViewCommand').click()
    await expect(C.locator('input[id$="-input"]')).toBeVisible()
    await expect(C.locator('input[id$="-input"]')).toHaveValue('C = OrtaNokta(A,B)')
    await expect(C.locator('output[id$="-output"]')).toBeHidden()

    await page.reload()
    await expect(page.locator('#cardViewCommand')).toHaveAttribute('aria-pressed', 'true')
    await expect((await cardOf(page, 'C')).locator('input[id$="-input"]')).toHaveValue('C = OrtaNokta(A,B)')
    await page.locator('#cardViewValue').click()
    await expect((await cardOf(page, 'C')).locator('output[id$="-output"]')).toHaveText('C=(2,1)')
  })
})
