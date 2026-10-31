import { expect, test, type Page } from '@playwright/test'
import { parseCommand } from '../src/commands/parser'
import { vectorMeasureValue } from '../src/geometry/constructions'
import type { GeometryDocumentObject, VectorMeasure } from '../src/geometry/function-types'

test('yazımlar nesne komutuna çevrilir; sayılar ve noktalar eskisi gibi kalır', () => {
  expect(parseCommand('u=(3,2)')).toEqual({ ok: true, command: { kind: 'namedCoordinates', name: 'u', a: 3, b: 2 } })
  expect(parseCommand('A=(1+1,2)')).toEqual({ ok: true, command: { kind: 'namedCoordinates', name: 'A', a: 2, b: 2 } })
  expect(parseCommand('w=u+v')).toEqual({ ok: true, command: { kind: 'parameter', name: 'w', value: { expression: 'u+v' } } })
  expect(parseCommand('2u')).toEqual({ ok: true, command: { kind: 'function', expression: '2u' } })
  expect(parseCommand('a=(1+2)')).toEqual({ ok: true, command: { kind: 'parameter', name: 'a', value: 3 } })
  expect(parseCommand('(1,2)')).toEqual({ ok: true, command: { kind: 'point', point: { a: 1, b: 2 } } })
})

test('ölçümler komut olarak okunur; üç noktalı Açı ve sayı atamaları eskisi gibi kalır', () => {
  const measure = (name: string | null, kind: string, ...vectors: string[]) =>
    ({ ok: true, command: { kind: 'vectorMeasure', measure: kind, name, vectors } })
  expect(parseCommand('Uzunluk(u)')).toEqual(measure(null, 'length', 'u'))
  expect(parseCommand('length(u+v)')).toEqual(measure(null, 'length', 'u+v'))
  expect(parseCommand('k=Uzunluk(u)')).toEqual(measure('k', 'length', 'u'))
  expect(parseCommand('İçÇarpım(u,v)')).toEqual(measure(null, 'dot', 'u', 'v'))
  expect(parseCommand('Dot(u,v)')).toEqual(measure(null, 'dot', 'u', 'v'))
  expect(parseCommand('c=iccarpim(u,v)')).toEqual(measure('c', 'dot', 'u', 'v'))
  expect(parseCommand('Açı(u,v)')).toEqual(measure(null, 'angle', 'u', 'v'))
  expect(parseCommand('Açı(A,B,C)').ok && (parseCommand('Açı(A,B,C)') as { command: { kind: string } }).command.kind).toBe('angle')
  expect(parseCommand('k=sin(1)')).toEqual({ ok: true, command: { kind: 'parameter', name: 'k', value: Math.sin(1) } })
  expect(parseCommand('Uzunluk(u,v)').ok).toBe(false)
  expect(parseCommand('İçÇarpım(u)').ok).toBe(false)
})

test('değerler: dik, zıt, aynı yön ve sıfır vektörü', () => {
  const vector = (id: number, a: number, b: number) => ({
    type: 'vector', id, A: { a: 0, b: 0, onOther: [] }, B: { a, b, onOther: [] },
  }) as unknown as GeometryDocumentObject
  const objects = [vector(1, 3, 4), vector(2, -4, 3), vector(3, -6, -8), vector(4, 6, 8), vector(5, 0, 0), vector(6, 1, 0), vector(7, 1, 1)]
  const value = (measure: VectorMeasure['measure'], ...sourceIds: number[]) => vectorMeasureValue(
    { measure, sourceIds } as VectorMeasure, id => objects.find(object => object.id === id))
  expect(value('length', 1)).toBe(5)
  expect(value('length', 5)).toBe(0)
  expect(value('dot', 1, 2)).toBe(0)
  expect(value('dot', 1, 4)).toBe(50)
  expect(value('angle', 1, 2)).toBe(90)
  expect(value('angle', 1, 3)).toBeCloseTo(180, 10)
  expect(value('angle', 1, 4)).toBe(0)
  expect(value('angle', 6, 7)).toBeCloseTo(45, 10)
  // Sıra değişse de açı aynıdır: 0 ile 180 arasında.
  expect(value('angle', 7, 6)).toBeCloseTo(45, 10)
  expect(value('angle', 1, 5)).toBeNull()
  expect(value('dot', 1, 5)).toBe(0)
  expect(value('length', 99)).toBeNull()
  expect(value('dot', 1, 99)).toBeNull()
})

/** Every text of a card: its definition and value rows. */
const rows = (page: Page) => page.locator('#objectsContainer .expr-block').evaluateAll(blocks => blocks.map(block =>
  [...block.querySelectorAll<HTMLElement>('input, [id$="-output"]')].map(row =>
    (row instanceof HTMLInputElement ? row.value : row.textContent ?? '').trim())))

const values = async (page: Page) => (await rows(page)).flat()

async function enter(page: Page, command: string): Promise<void> {
  await page.locator('#giris').fill(command)
  await page.locator('#giris').press('Enter')
}

/** The value card of a name, whichever row it shows. */
async function card(page: Page, name: string): Promise<string[]> {
  return (await rows(page)).find(card => card.some(row => row.startsWith(`${name}:`) || row.startsWith(`${name}=`) || row.startsWith(`${name} =`))) ?? []
}

const expectCard = (page: Page, name: string, text: string) =>
  expect.poll(async () => (await card(page, name)).join(' | ')).toContain(text)

const dragTool = (page: Page) => page.evaluate(() => window.drAW2DToolbar!.selectToolByAction('select', { showToast: false }))

test.describe('arayüz', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#giris')).toBeVisible()
    await enter(page, 'u=(3,2)')
    await enter(page, 'v=(1,4)')
  })

  test('u=(x,y) orijinden vektör, büyük harfle nokta verir; ikinci vektör aynı başlangıcı kullanır', async ({ page }) => {
    await expectCard(page, 'u', 'u=(3,2)')
    await expectCard(page, 'v', 'v=(1,4)')
    await expect(page.locator('#objectsContainer .expr-block')).toHaveCount(5)
    await enter(page, 'P=(5,6)')
    await expectCard(page, 'P', 'P=(5,6)')
  })

  test('toplama, çıkarma, sayıyla çarpma ve birleşim vektör verir', async ({ page }) => {
    await enter(page, 'w=u+v')
    await expectCard(page, 'w', 'w=(4,6)')
    await enter(page, 'k=u-v')
    await expectCard(page, 'k', 'k=(2,-2)')
    await enter(page, 'm=2u')
    await expectCard(page, 'm', 'm=(6,4)')
    await enter(page, 'p=-u/2')
    await expectCard(page, 'p', 'p=(-1.50,-1)')
    await enter(page, 'q=2*(u-v)+w')
    await expectCard(page, 'q', 'q=(8,2)')
    await enter(page, 'u+v')
    await expect.poll(async () => (await values(page)).join(' ')).toContain('(4,6)')
  })

  test('sonuç canlıdır: u sürüklenince değişir, kendisi sürüklenmez', async ({ page }) => {
    await page.locator('#gridSnap').click()
    await enter(page, 'w=u+v')
    await dragTool(page)
    // B, (3,2): tuvalde (800,300).
    await page.mouse.move(800, 300)
    await page.mouse.down()
    await page.mouse.move(900, 200)
    await page.mouse.up()
    await expectCard(page, 'u', 'u=(4,3)')
    await expectCard(page, 'w', 'w=(5,7)')

    // w, (0,0)'dan (5,7)'ye gider: orta noktasından tutulup çekilince seçilir ama kaymaz.
    const before = await card(page, 'w')
    await page.mouse.move(750, 150)
    await page.mouse.down()
    await page.mouse.move(600, 300)
    await page.mouse.up()
    await expect(page.locator('#objectsContainer .is-active input').first()).toHaveValue('w: u+v')
    expect(await card(page, 'w')).toEqual(before)
  })

  test('sonuç ilk yazılan vektörün başlangıcından çıkar', async ({ page }) => {
    await enter(page, 'Vektör((1,1),(2,2))')
    await expectCard(page, 'w', 'w=(1,1)')
    await enter(page, 'k=w+u')
    await expectCard(page, 'k', 'k=(4,3)')
    await dragTool(page)
    // k, (1,1)'den (5,4)'e gider; orta noktası (3,2.5).
    await page.locator('#canvas').click({ position: { x: 800, y: 250 } })
    await expect(page.locator('#objectsContainer .is-active input').first()).toHaveValue('k: w+u')
  })

  test('kaydırıcı katsayıyı değiştirir', async ({ page }) => {
    await enter(page, 'a=2')
    await enter(page, 'w=a*u-v')
    await expectCard(page, 'w', 'w=(5,0)')
    await enter(page, 'a=3')
    await expectCard(page, 'w', 'w=(8,2)')
    await page.locator('#undo').click()
    await expectCard(page, 'w', 'w=(5,0)')
  })

  test('sonuç başka işlemde kullanılır, Ötele ile çalışır; sıfır vektörü hata vermez', async ({ page }) => {
    await enter(page, 'w=u+v')
    await enter(page, 't=w-u')
    await expectCard(page, 't', 't=(1,4)')
    await enter(page, 'z=u-u')
    await expectCard(page, 'z', 'z=(0,0)')
    await enter(page, 'Ötele((1,1),w)')
    await expect.poll(async () => (await values(page)).join(' ')).toContain('(5,7)')
  })

  test('noktaya vektör eklenir, nokta canlıdır', async ({ page }) => {
    await enter(page, 'P=(1,1)')
    await enter(page, 'R=P+2u')
    await expectCard(page, 'R', 'R=(7,5)')
    await expect.poll(async () => (await card(page, 'R')).join(' ')).toContain('R: P+2u')
    await enter(page, 'A+u-v')
    await expect.poll(async () => (await values(page)).join(' ')).toContain('(2,-2)')
  })

  test('anlamsız işlemler açık bir mesajla reddedilir, nesne oluşmaz', async ({ page }) => {
    const count = await page.locator('#objectsContainer .expr-block').count()
    for (const [command, message] of [
      ['u*v', 'İki vektör doğrudan çarpılamaz'],
      ['u+2', 'Vektörle sayı toplanamaz'],
      ['2/u', 'vektöre bölünemez'],
      ['sin(u)', 'Vektörlerle toplama'],
      ['2A+u', 'Noktaya yalnız vektör'],
      ['u-A', 'Noktaya yalnız vektör'],
    ] as const) {
      await enter(page, command)
      await expect(page.locator('#snackContent')).toContainText(message)
      await expect(page.locator('#objectsContainer .expr-block')).toHaveCount(count)
    }
  })

  test('ad çakışması ve sıfır vektörü bileşenleri reddedilir', async ({ page }) => {
    const count = await page.locator('#objectsContainer .expr-block').count()
    await enter(page, 'u=u+v')
    await enter(page, 'r=(0,0)')
    await expect(page.locator('#objectsContainer .expr-block')).toHaveCount(count)
  })

  test('v silinince ona bağlı w de silinir; geri alma ikisini getirir, u kalır', async ({ page }) => {
    await enter(page, 'w=u+v')
    await expectCard(page, 'w', 'w=(4,6)')
    const id = await page.locator('#objectsContainer .expr-block').evaluateAll(blocks => blocks.findIndex(block =>
      [...block.querySelectorAll('input')].some(input => input.value.startsWith('v'))))
    await page.locator('#objectsContainer .expr-block').nth(id).locator('[id$="-delete"], .sil, .delete').first().click()
    await expect.poll(async () => (await card(page, 'w')).length).toBe(0)
    await expectCard(page, 'u', 'u=(3,2)')
    await page.locator('#undo').click()
    await expectCard(page, 'w', 'w=(4,6)')
  })

  test('kart düzenlenince ifade değişir; v yeniden adlanınca ifade onu izler', async ({ page }) => {
    await enter(page, 'w=u+v')
    await expectCard(page, 'w', 'w=(4,6)')
    const edit = async (name: string, text: string) => {
      const index = await page.locator('#objectsContainer .expr-block').evaluateAll((blocks, name) => blocks.findIndex(block =>
        [...block.querySelectorAll('input')].some(input => input.value.startsWith(`${name}:`) || input.value.startsWith(`${name}=`))), name)
      const block = page.locator('#objectsContainer .expr-block').nth(index)
      await block.click()
      await block.locator('[id$="-edit"]').click()
      const input = block.locator('input[id$="-input"]')
      await input.fill(text)
      await input.press('Enter')
    }
    await edit('w', 'w: 3u')
    await expectCard(page, 'w', 'w=(9,6)')
    await edit('w', 'w: u+v')
    await edit('v', 'r: Vektör(A,C)')
    await expect.poll(async () => (await card(page, 'w')).join(' ')).toContain('u+r')
    await expectCard(page, 'w', 'w=(4,6)')
  })

  test('uzunluk, iç çarpım ve açı kartta değer verir; ad verilebilir', async ({ page }) => {
    await enter(page, 'k=Uzunluk(v)')
    await expectCard(page, 'k', 'k = 4.12')
    await expectCard(page, 'k', 'k = Uzunluk(v)')
    await enter(page, 'c=İçÇarpım(u,v)')
    await expectCard(page, 'c', 'c = 11')
    await enter(page, 'Açı(u,v)')
    await expectCard(page, 'α', 'α = 42.27°')
    await expectCard(page, 'α', 'α = Açı(u,v)')
    // Adsız ölçüm sıradaki adı alır.
    await enter(page, 'Uzunluk(u)')
    await expectCard(page, 'a', 'a = 3.61')
  })

  test('değerler canlıdır: uç sürüklenince ve kaydırıcıyla değişir', async ({ page }) => {
    await page.locator('#gridSnap').click()
    await enter(page, 'k=Uzunluk(u)')
    await enter(page, 'c=İçÇarpım(u,v)')
    await enter(page, 'd=Açı(u,v)')
    await enter(page, 'a=2')
    await enter(page, 'w=a*u')
    await enter(page, 'm=Uzunluk(w)')
    await expectCard(page, 'm', 'm = 7.21')
    await dragTool(page)
    // u'nun ucu (3,2), tuvalde (800,300): (4,0)'a çekilir, u ile v arasındaki açı değişir.
    await page.mouse.move(800, 300)
    await page.mouse.down()
    await page.mouse.move(900, 500)
    await page.mouse.up()
    await expectCard(page, 'k', 'k = 4')
    await expectCard(page, 'c', 'c = 4')
    await expectCard(page, 'd', 'd = 75.96°')
    await expectCard(page, 'm', 'm = 8')
    await enter(page, 'a=3')
    await expectCard(page, 'm', 'm = 12')
  })

  test('işlem sonucu vektör ölçülür; ifade önce vektör olarak çizilir ve kaydırıcıyı izler', async ({ page }) => {
    await enter(page, 'w=u+v')
    await enter(page, 'k=Uzunluk(w)')
    await expectCard(page, 'k', 'k = 7.21')
    await enter(page, 'a=2')
    await enter(page, 'm=Uzunluk(a*u)')
    await expectCard(page, 'm', 'm = 7.21')
    await expect.poll(async () => (await values(page)).join(' ')).toContain('(6,4)')
    await enter(page, 'a=1')
    await expectCard(page, 'm', 'm = 3.61')
    await enter(page, 'c=İçÇarpım(u+v,u-v)')
    await expectCard(page, 'c', 'c = -4')
    await enter(page, 'Döndür(u,90,A)')
    await enter(page, "h=Uzunluk(u')")
    await expectCard(page, 'h', 'h = 3.61')
  })

  test('sıfır vektöründe açı tanımsızdır, uzunluk 0; yanlış girdiler reddedilir', async ({ page }) => {
    await enter(page, 'z=u-u')
    await enter(page, 'k=Uzunluk(z)')
    await expectCard(page, 'k', 'k = 0')
    await enter(page, 'd=Açı(u,z)')
    await expectCard(page, 'd', 'd = Açı(u,z)')
    await expect.poll(async () => (await card(page, 'd')).join(' ')).not.toContain('°')

    await enter(page, 'P=(5,6)')
    const count = await page.locator('#objectsContainer .expr-block').count()
    for (const [command, message] of [
      ['Uzunluk(P)', 'Bir vektör girin: P'],
      ['Uzunluk(3)', 'Bir vektör girin: 3'],
      ['İçÇarpım(u,P)', 'Bir vektör girin: P'],
      ['Açı(P,u)', 'Bir vektör girin: P'],
      ['Uzunluk(s)', 'Bir vektör girin: s'],
      ['u*v', 'İçÇarpım(u,v)'],
    ] as const) {
      await enter(page, command)
      await expect(page.locator('#snackContent')).toContainText(message)
      await expect(page.locator('#objectsContainer .expr-block')).toHaveCount(count)
    }
    await enter(page, 'u=Uzunluk(v)')
    await expect(page.locator('#objectsContainer .expr-block')).toHaveCount(count)
  })

  test('v silinince ölçümü de silinir; ad değişince kart izler; kart düzenlenir', async ({ page }) => {
    await enter(page, 'c=İçÇarpım(u,v)')
    await enter(page, 'k=Uzunluk(u)')
    await expectCard(page, 'c', 'c = 11')
    const block = (name: string) => page.locator('#objectsContainer .expr-block').evaluateAll((blocks, name) => blocks.findIndex(block =>
      [...block.querySelectorAll('input, [id$="-output"]')].some(row => ((row as HTMLInputElement).value ?? row.textContent ?? '').startsWith(`${name}`))), name)
    const edit = async (name: string, text: string) => {
      const item = page.locator('#objectsContainer .expr-block').nth(await block(name))
      await item.click()
      await item.locator('[id$="-edit"]').click()
      const input = item.locator('input[id$="-input"]')
      await input.fill(text)
      await input.press('Enter')
    }
    await edit('k =', 'k = Uzunluk(v)')
    await expectCard(page, 'k', 'k = 4.12')
    await edit('v:', 'r: Vektör(A,C)')
    await expect.poll(async () => (await card(page, 'c')).join(' ')).toContain('İçÇarpım(u,r)')
    await expect.poll(async () => (await card(page, 'k')).join(' ')).toContain('Uzunluk(r)')
    await page.locator('#objectsContainer .expr-block').nth(await block('r:')).locator('[id$="-delete"], .sil, .delete').first().click()
    await expect.poll(async () => (await card(page, 'c')).length).toBe(0)
    await expectCard(page, 'u', 'u=(3,2)')
    await page.locator('#undo').click()
    await expectCard(page, 'c', 'c = 11')
  })

  /** The plane alone, with nothing selected: an undone step leaves no selection. */
  async function planeShot(page: Page): Promise<() => Promise<Buffer>> {
    await enter(page, 'r=5')
    await page.locator('#undo').click()
    return async () => {
      await page.waitForTimeout(100)
      return page.screenshot({ clip: { x: 0, y: 60, width: 1100, height: 800 } })
    }
  }

  test('uzunluk ve açı düzlemde görünür, iç çarpım yalnız karttadır', async ({ page }) => {
    const shot = await planeShot(page)
    const plain = await shot()
    await enter(page, 'k=Uzunluk(u)')
    expect((await shot()).equals(plain)).toBe(false)
    await page.locator('#undo').click()
    expect((await shot()).equals(plain)).toBe(true)
    await enter(page, 'd=Açı(u,v)')
    expect((await shot()).equals(plain)).toBe(false)
    await page.locator('#undo').click()
    expect((await shot()).equals(plain)).toBe(true)
    await enter(page, 'c=İçÇarpım(u,v)')
    await expectCard(page, 'c', 'c = 11')
    expect((await shot()).equals(plain)).toBe(true)
    await expect(page.locator('#objectsContainer .is-active [id$="-style"]')).toBeHidden()
  })

  test('başlangıçları ayrı vektörlerde açı kartta kalır, yay çizilmez', async ({ page }) => {
    await enter(page, 'Vektör((1,1),(2,2))')
    const shot = await planeShot(page)
    const plain = await shot()
    await enter(page, 'd=Açı(u,w)')
    await expectCard(page, 'd', 'd = 11.31°')
    expect((await shot()).equals(plain)).toBe(true)
  })

  test('otomatik kayıttan ölçümler de canlı geri gelir', async ({ page }) => {
    await enter(page, 'c=İçÇarpım(u,v)')
    await enter(page, 'd=Açı(u,v)')
    await enter(page, 'k=Uzunluk(u)')
    await expectCard(page, 'k', 'k = 3.61')
    await page.waitForTimeout(1200)
    await page.reload()
    await expectCard(page, 'c', 'c = 11')
    await expectCard(page, 'd', 'd = 42.27°')
    await expectCard(page, 'k', 'k = 3.61')
    await enter(page, 'w=2u')
    await enter(page, 'm=Uzunluk(w)')
    await expectCard(page, 'm', 'm = 7.21')
  })

  test('otomatik kayıttan (.drw2 biçimi) aynı canlı yapıyla geri gelir', async ({ page }) => {
    await enter(page, 'a=2')
    await enter(page, 'w=a*u+v')
    await expectCard(page, 'w', 'w=(7,8)')
    await page.waitForTimeout(1200)
    await page.reload()
    await expectCard(page, 'w', 'w=(7,8)')
    await enter(page, 'a=3')
    await expectCard(page, 'w', 'w=(10,10)')
  })
})
