import { expect, test, type Page } from '@playwright/test'
import { COMMAND_NAMES, HELP_TOPICS, LANGUAGE, PLACEHOLDER, commandKind, matchingTemplates } from '../src/commands/language'
import { parseCommand } from '../src/commands/parser'

test('dil tablosu: her komut adı ayrıştırılır, her örnek çözümlenir, her şablon bir komuttur', () => {
  for (const [kind, names] of Object.entries(COMMAND_NAMES)) {
    for (const name of names) expect(commandKind(name), name).toBe(kind)
  }
  expect(commandKind('teget')).toBe('tangent')
  expect(commandKind('PARÇALIFONKSİYON')).toBe('piecewise')
  for (const entry of LANGUAGE) {
    expect(HELP_TOPICS.some(topic => topic.title === entry.topic), entry.topic).toBe(true)
    for (const example of entry.examples) expect(parseCommand(example).ok, example).toBe(true)
    if (entry.command) {
      // A template names its command and has a placeholder for each argument.
      expect(commandKind(entry.syntax.slice(0, entry.syntax.indexOf('('))), entry.syntax).toBe(entry.command)
      expect(entry.syntax.match(PLACEHOLDER)?.length, entry.syntax).toBeGreaterThan(0)
    }
  }
  expect(matchingTemplates('diz').map(entry => entry.syntax)).toEqual(['Dizi(<Fonksiyon (n)>, <Başlangıç>, <Bitiş>)'])
  expect(matchingTemplates('teg').map(entry => entry.command)).toEqual(['tangent', 'tangentH', 'tangentX', 'circleTangent'])
  expect(matchingTemplates('çem')).toHaveLength(3)
  expect(matchingTemplates('seq').map(entry => entry.command)).toEqual(['sequence'])
})

test.describe('giriş alanı', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#giris')).toBeVisible()
  })

  const input = (page: Page) => page.locator('#giris')
  const selection = (page: Page) => input(page).evaluate((element: HTMLInputElement) =>
    element.value.slice(element.selectionStart!, element.selectionEnd!))

  test('komut adı yazılınca şablon önerilir; kabul edilen şablon yer tutucularla doldurulur', async ({ page }) => {
    await input(page).pressSequentially('Diz')
    const suggestions = page.locator('#commandSuggestions')
    await expect(suggestions).toBeVisible()
    await expect(suggestions.locator('.command-suggestion')).toHaveCount(1)
    await input(page).press('Enter')
    await expect(suggestions).toBeHidden()
    await expect(input(page)).toHaveValue('Dizi(<Fonksiyon (n)>, <Başlangıç>, <Bitiş>)')
    expect(await selection(page)).toBe('<Fonksiyon (n)>')
    await input(page).pressSequentially('1/n')
    await input(page).press('Tab')
    expect(await selection(page)).toBe('<Başlangıç>')
    await input(page).pressSequentially('1')
    // Submitting with a placeholder left selects it and explains what is missing.
    await input(page).press('Enter')
    await expect(page.locator('#snackContent')).toHaveText('Şablondaki <Bitiş> alanını doldurun.')
    expect(await selection(page)).toBe('<Bitiş>')
    await input(page).pressSequentially('7')
    await input(page).press('Enter')
    await expect(input(page)).toHaveValue('')
    await expect(page.locator('#objectsContainer .expr-block input[readonly]')).toHaveValue('aₙ = Dizi(1/n,1,7)')
  })

  test('oklarla seçilir, Esc kapatır; aksansız yazım ve parantez yer tutucuyu değiştirir', async ({ page }) => {
    await input(page).pressSequentially('teg')
    const options = page.locator('#commandSuggestions .command-suggestion')
    await expect(options).toHaveCount(4)
    await expect(options.first()).toHaveAttribute('aria-selected', 'true')
    await input(page).press('ArrowDown')
    await expect(options.nth(1)).toHaveAttribute('aria-selected', 'true')
    await input(page).press('Tab')
    await expect(input(page)).toHaveValue('TeğetH(<Fonksiyon>, <Apsis>)')
    // Typing '(' into a selected placeholder replaces it instead of wrapping it.
    await input(page).press('(')
    await expect(input(page)).toHaveValue('TeğetH((), <Apsis>)')

    await input(page).fill('')
    await input(page).pressSequentially('Çe')
    await expect(page.locator('#commandSuggestions')).toBeVisible()
    await input(page).press('Escape')
    await expect(page.locator('#commandSuggestions')).toBeHidden()
    // A single letter, an expression and a typed call do not suggest anything.
    for (const text of ['D', 'sin(x)+', 'Dizi(']) {
      await input(page).fill('')
      await input(page).pressSequentially(text)
      await expect(page.locator('#commandSuggestions'), text).toBeHidden()
    }
  })

  test('elle yazılan kapanış parantezi kendiliğinden eklenenin üzerinden geçer', async ({ page }) => {
    await input(page).click()
    await page.keyboard.type('sin(x)')
    await expect(input(page)).toHaveValue('sin(x)')
    await input(page).fill('')
    await page.keyboard.type('Çember((0,0),2)')
    await expect(input(page)).toHaveValue('Çember((0,0),2)')
    // A closing bracket with nothing to step over is still typed.
    await input(page).fill('x')
    await page.keyboard.press(')')
    await expect(input(page)).toHaveValue('x)')
    // The math keyboard's keys behave the same.
    await input(page).fill('')
    await page.locator('#keyboardToggle').click()
    for (const label of ['(', 'x', ')', '+', '1']) {
      await page.locator('#mathKeyboard .math-keyboard-page:not([hidden]) .math-key').filter({
        has: page.locator(`xpath=self::*[normalize-space(.)="${label}"]`),
      }).click()
    }
    await expect(input(page)).toHaveValue('(x)+1')
  })

  test('tıklanan öneri şablonu girişe yerleştirir', async ({ page }) => {
    await input(page).pressSequentially('2*Tü')
    await page.locator('#commandSuggestions .command-suggestion').first().click()
    await expect(input(page)).toHaveValue('2*Türev(<Fonksiyon>)')
    expect(await selection(page)).toBe('<Fonksiyon>')
  })
})
