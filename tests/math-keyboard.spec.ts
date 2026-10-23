import { expect, test, type Page } from '@playwright/test'

const input = (page: Page) => page.locator('#giris')
const keyboard = (page: Page) => page.locator('#mathKeyboard')
/** A visible key of the open tab, by its label. */
const key = (page: Page, label: string) => keyboard(page).locator('.math-keyboard-page:not([hidden]) .math-key', { hasText: label }).filter({
  has: page.locator(`xpath=self::*[normalize-space(.)="${label}"]`),
})
const press = async (page: Page, ...labels: string[]) => {
  for (const label of labels) await key(page, label).click()
}
const selection = (page: Page) => input(page).evaluate((element: HTMLInputElement) =>
  element.value.slice(element.selectionStart!, element.selectionEnd!))

test.describe('masaüstü', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(input(page)).toBeVisible()
  })

  test('klavye düğmesi açar; fonksiyon tuşu parantezin içine yazar ve ⏎ gönderir', async ({ page }) => {
    await expect(keyboard(page)).toBeHidden()
    await page.locator('#keyboardToggle').click()
    await expect(keyboard(page)).toBeVisible()
    await expect(input(page)).toHaveAttribute('inputmode', 'none')
    await expect(input(page)).toBeFocused()
    await page.locator('#keyboardtab-functions').click()
    await press(page, 'sin')
    await expect(input(page)).toHaveValue('sin()')
    await page.locator('#keyboardtab-numbers').click()
    await press(page, '2', 'x')
    await expect(input(page)).toHaveValue('sin(2x)')
    await press(page, '⏎')
    await expect(input(page)).toHaveValue('')
    await expect(page.locator('#objectsContainer .expr-block input[readonly]')).toHaveValue('f: y = sin(2x)')
    await page.locator('#keyboardToggle').click()
    await expect(keyboard(page)).toBeHidden()
    expect(await input(page).getAttribute('inputmode')).toBeNull()
  })

  test('komut tuşu şablonu yerleştirir; yer tutucular klavyeyle doldurulur', async ({ page }) => {
    await page.locator('#keyboardToggle').click()
    await page.locator('#keyboardtab-commands').click()
    await press(page, 'Dizi(Fonksiyon (n), Başlangıç, Bitiş)')
    await expect(input(page)).toHaveValue('Dizi(<Fonksiyon (n)>, <Başlangıç>, <Bitiş>)')
    expect(await selection(page)).toBe('<Fonksiyon (n)>')
    await page.locator('#keyboardtab-numbers').click()
    await press(page, '1', '÷', 'n', '⇥', '1', '⏎')
    await expect(page.locator('#snackContent')).toHaveText('Şablondaki <Bitiş> alanını doldurun.')
    expect(await selection(page)).toBe('<Bitiş>')
    await press(page, '5', '⏎')
    await expect(page.locator('#objectsContainer .expr-block input[readonly]')).toHaveValue('aₙ = Dizi(1/n,1,5)')
  })

  test('⌫ ve ok tuşları imleçte düzenler', async ({ page }) => {
    await page.locator('#keyboardToggle').click()
    await press(page, '1', '2', '←', '3')
    await expect(input(page)).toHaveValue('132')
    await press(page, '⌫')
    await expect(input(page)).toHaveValue('12')
    await press(page, '→', '(')
    // The input pairs brackets; ⌫ removes an empty pair.
    await expect(input(page)).toHaveValue('12()')
    await press(page, '⌫')
    await expect(input(page)).toHaveValue('12')
    await page.locator('#keyboardtab-letters').click()
    await press(page, 'ş', 'i')
    await expect(input(page)).toHaveValue('12şi')
  })
})

test.describe('dokunmatik ekran', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('giriş alanına ilk dokunuş klavyeyi açar ve sistem klavyesini bastırır', async ({ page }) => {
    await page.goto('/')
    await page.locator('#btnCalc').tap()
    await input(page).tap()
    await expect(keyboard(page)).toBeVisible()
    await expect(input(page)).toHaveAttribute('inputmode', 'none')
    await key(page, '7').tap()
    await expect(input(page)).toHaveValue('7')
  })
})
