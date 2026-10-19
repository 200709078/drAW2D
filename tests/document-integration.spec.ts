import { expect, test, type Page } from '@playwright/test'
import type { RadialToolAction } from '../src/ui/toolbar-types'

interface ObjectRow { id: string; input: string; output: string }
interface CanvasPoint { x: number; y: number }

const runtimeFailures = new WeakMap<Page, string[]>()

test.beforeEach(async ({ page }) => {
  const failures: string[] = []
  runtimeFailures.set(page, failures)
  page.on('pageerror', error => failures.push(error.message))
  await page.goto('/')
  await expect(page.locator('#giris')).toBeVisible()
  await page.locator('#btnAcordeon').click()
})

test.afterEach(({ page }) => {
  expect(runtimeFailures.get(page), 'Belge ve geçmiş işlemleri JavaScript hatası üretmemeli').toEqual([])
})

async function enterCommand(page: Page, command: string): Promise<void> {
  await page.locator('#giris').fill(command)
  await page.locator('#giris').press('Enter')
  await expect(page.locator('#giris')).toHaveValue('')
}

async function objectRows(page: Page): Promise<ObjectRow[]> {
  return page.locator('#objectsContainer .expr-block').evaluateAll(rows => rows.map(row => {
    const input = row.querySelector('input[readonly]')
    const output = row.querySelector('output')
    if (!(input instanceof HTMLInputElement) || !(output instanceof HTMLOutputElement)) {
      throw new Error('Nesne kartı eksik')
    }
    return { id: input.id, input: input.value, output: output.value }
  }))
}

async function selectTool(page: Page, action: RadialToolAction): Promise<void> {
  await page.evaluate(action => {
    if (!window.drAW2DRadialToolbar) throw new Error('Araç çubuğu başlatılmadı')
    window.drAW2DRadialToolbar.selectToolByAction(action, { showToast: false })
  }, action)
}

async function dragThrough(page: Page, points: readonly CanvasPoint[]): Promise<void> {
  const start = points[0]
  if (!start) throw new Error('Sürükleme başlangıcı eksik')
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  for (const point of points.slice(1)) await page.mouse.move(point.x, point.y)
  await page.mouse.up()
}

test('geri alınmış komut yerine yeni dal açmak boşalan adı kullanır ve yeni kimlik ayırır', async ({ page }) => {
  await enterCommand(page, 'Çember((0,0),2)')
  const circleRows = await objectRows(page)
  await enterCommand(page, '(1,1)')
  await expect(page.locator('#objectsContainer .expr-block input[readonly]').first()).toHaveAttribute('id', '2-input')
  await page.locator('#undo').click()
  await expect.poll(() => objectRows(page)).toEqual(circleRows)

  await enterCommand(page, '(2,3)')
  const branchedRows = await objectRows(page)
  expect(branchedRows[0]).toEqual({ id: '3-input', input: 'B=(2,3)', output: '' })
  await expect(page.locator('#redo')).toBeDisabled()
  await page.locator('#undo').click()
  await expect.poll(() => objectRows(page)).toEqual(circleRows)
  await page.locator('#undo').click()
  await expect(page.locator('#objectsContainer .expr-block')).toHaveCount(0)
  await expect(page.locator('#undo')).toBeDisabled()
  await page.locator('#redo').click()
  await page.locator('#redo').click()
  await expect.poll(() => objectRows(page)).toEqual(branchedRows)
})

test('temizleme tek geçmiş adımıdır ve geri getirilen nesnelerin bağımlılıkları çalışır', async ({ page }) => {
  await enterCommand(page, 'Çember((0,0),2)')
  await enterCommand(page, 'TeğetC(a,(3,2))')
  const populated = await objectRows(page)
  expect(populated).toHaveLength(6)
  await page.locator('#clear').click()
  await expect(page.locator('#objectsContainer .expr-block')).toHaveCount(0)
  await expect(page.locator('#clear')).toBeDisabled()
  await page.locator('#undo').click()
  await expect.poll(() => objectRows(page)).toEqual(populated)
  await expect(page.locator('#clear')).toBeEnabled()
  await page.locator('#redo').click()
  await expect(page.locator('#objectsContainer .expr-block')).toHaveCount(0)
  await expect(page.locator('#redo')).toBeDisabled()
  await page.locator('#undo').click()
  await expect.poll(() => objectRows(page)).toEqual(populated)
  await selectTool(page, 'select')
  await dragThrough(page, [{ x: 500, y: 500 }, { x: 600, y: 500 }])
  await expect.poll(async () => (await objectRows(page)).map(row => row.output).filter(Boolean).sort())
    .toEqual(['C=(1,2)', 'D=(3,0)'])
  await page.locator('#undo').click()
  await expect.poll(() => objectRows(page)).toEqual(populated)
})

test('çok sayıda fare hareketi içeren nokta sürükleme tek geri alma adımı oluşturur', async ({ page }) => {
  await enterCommand(page, '(1,1)')
  const original = await objectRows(page)
  await selectTool(page, 'select')
  await dragThrough(page, [
    { x: 600, y: 400 }, { x: 610, y: 385 }, { x: 635, y: 360 }, { x: 675, y: 325 },
  ])
  await expect(page.locator('#objectsContainer .expr-block input[readonly]')).toHaveValue('A=(1.75,1.75)')
  const moved = await objectRows(page)
  await page.locator('#undo').click()
  await expect.poll(() => objectRows(page)).toEqual(original)
  await page.locator('#redo').click()
  await expect.poll(() => objectRows(page)).toEqual(moved)
  await page.locator('#undo').click()
  await page.locator('#undo').click()
  await expect(page.locator('#objectsContainer .expr-block')).toHaveCount(0)
  await expect(page.locator('#undo')).toBeDisabled()
})

test('noktayı aynı yerde bırakmak veya başlangıca geri sürüklemek yineleme dalını korur', async ({ page }) => {
  await enterCommand(page, '(1,1)')
  await enterCommand(page, '(2,2)')
  const complete = await objectRows(page)
  await page.locator('#undo').click()
  const undone = await objectRows(page)
  await selectTool(page, 'select')
  await page.locator('#canvas').click({ position: { x: 603, y: 403 } })
  await expect.poll(() => objectRows(page)).toEqual(undone)
  await expect(page.locator('#redo')).toBeEnabled()
  await dragThrough(page, [{ x: 600, y: 400 }, { x: 650, y: 350 }, { x: 600, y: 400 }])
  await expect.poll(() => objectRows(page)).toEqual(undone)
  await expect(page.locator('#redo')).toBeEnabled()
  await page.locator('#redo').click()
  await expect.poll(() => objectRows(page)).toEqual(complete)
})

test('araç değiştirme yarım çizimin noktasını iptal eder ve sonraki nokta yeni kimlik alır', async ({ page }) => {
  await enterCommand(page, '(0,0)')
  const original = await objectRows(page)
  await selectTool(page, 'line')
  await page.locator('#canvas').click({ position: { x: 650, y: 350 } })
  await expect(page.locator('#objectsContainer .expr-block')).toHaveCount(2)
  await selectTool(page, 'point')
  await expect.poll(() => objectRows(page)).toEqual(original)
  await enterCommand(page, '(2,2)')
  const committed = await objectRows(page)
  expect(committed[0]).toEqual({ id: '2-input', input: 'B=(2,2)', output: '' })
  await page.locator('#undo').click()
  await expect.poll(() => objectRows(page)).toEqual(original)
  await page.locator('#redo').click()
  await expect.poll(() => objectRows(page)).toEqual(committed)
})

test('komut ve geri alma yarım araç çizimini tamamlanmış belgeye sızdırmaz', async ({ page }) => {
  await enterCommand(page, '(0,0)')
  const original = await objectRows(page)
  await selectTool(page, 'line')
  await page.locator('#canvas').click({ position: { x: 650, y: 350 } })
  await expect(page.locator('#objectsContainer .expr-block')).toHaveCount(2)
  await enterCommand(page, '(2,2)')
  const committed = await objectRows(page)
  expect(committed).toEqual([{ id: '2-input', input: 'B=(2,2)', output: '' }, ...original])

  await selectTool(page, 'circle3')
  await page.locator('#canvas').click({ position: { x: 700, y: 350 } })
  await expect(page.locator('#objectsContainer .expr-block')).toHaveCount(3)
  await page.locator('#undo').click()
  await expect.poll(() => objectRows(page)).toEqual(original)
  await page.locator('#redo').click()
  await expect.poll(() => objectRows(page)).toEqual(committed)
})

test('reddedilen iç teğet noktası başarılı teğete veya geçmişine sızmaz', async ({ page }) => {
  await enterCommand(page, 'Çember((0,0),2)')
  const circleRows = await objectRows(page)
  await selectTool(page, 'circletangent')
  await page.locator('#canvas').click({ position: { x: 700, y: 500 } })
  await page.locator('#canvas').click({ position: { x: 600, y: 500 } })
  await expect.poll(() => objectRows(page)).toEqual(circleRows)
  await expect(page.locator('#redo')).toBeDisabled()

  await page.locator('#canvas').click({ position: { x: 800, y: 300 } })
  await expect(page.locator('#objectsContainer .expr-block')).toHaveCount(6)
  const tangentRows = await objectRows(page)
  expect(tangentRows.find(row => row.input === 'B=(3,2)')).toEqual({
    id: '2-input', input: 'B=(3,2)', output: '',
  })
  expect(tangentRows.map(row => row.input)).not.toContain('B=(1,0)')
  await page.locator('#undo').click()
  await expect.poll(() => objectRows(page)).toEqual(circleRows)
  await page.locator('#redo').click()
  await expect.poll(() => objectRows(page)).toEqual(tangentRows)
  await page.locator('#undo').click()
  await page.locator('#undo').click()
  await expect(page.locator('#objectsContainer .expr-block')).toHaveCount(0)
  await expect(page.locator('#undo')).toBeDisabled()
})

test('mevcut iki noktaya merkez dışından tıklayarak doğru oluşturmak noktaları taşımaz', async ({ page }) => {
  await enterCommand(page, '(1,1)')
  await enterCommand(page, '(2,1)')
  const points = await objectRows(page)
  await selectTool(page, 'line')
  await page.locator('#canvas').click({ position: { x: 603, y: 403 } })
  await page.locator('#canvas').click({ position: { x: 704, y: 396 } })
  await expect(page.locator('#objectsContainer .expr-block')).toHaveCount(3)
  const withLine = await objectRows(page)
  expect(withLine.filter(row => row.id === '0-input' || row.id === '1-input')).toEqual(points)
  await page.locator('#undo').click()
  await expect.poll(() => objectRows(page)).toEqual(points)
  await page.locator('#redo').click()
  await expect.poll(() => objectRows(page)).toEqual(withLine)
})
