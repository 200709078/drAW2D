import { expect, test } from '@playwright/test'
import { describeCard, editText, setUnitCirclePart, setUnitCircleUnit, unitCircleParameter } from '../src/app/object-cards'
import { beginObjectDrag, moveObjectDrag } from '../src/app/object-drag'
import { parseCommand } from '../src/commands/parser'
import { prepareCommand } from '../src/commands/prepare'
import { recomputeDefinitions } from '../src/document/definitions'
import { collectDependents, resolveConstraints } from '../src/document/dependencies'
import { parseDocument, serializeDocument } from '../src/document/file-format'
import { redefineObject } from '../src/document/redefine'
import type { GeometryDocumentObject, Parameter, UnitCircle } from '../src/geometry/function-types'
import { angleText, angleTowards, exactTrig, snapAngle, trigValue, unitPoint } from '../src/geometry/unit-circle'
import { formatDisplayNumber } from '../src/math/format-display'

function documentWith(...sources: string[]) {
  const objects: GeometryDocumentObject[] = []
  const prepare = (command: Parameters<typeof prepareCommand>[0]) =>
    prepareCommand(command, objects, { nextId: objects.length ? Math.max(...objects.map(object => object.id ?? 0)) + 1 : 0,
      randomColor: () => '#123456' })
  for (const source of sources) {
    const parsed = parseCommand(source)
    if (!parsed.ok) throw new Error(parsed.error)
    const prepared = prepare(parsed.command)
    if (!prepared.ok) throw new Error(`${source}: ${prepared.error}`)
    objects.push(...prepared.objects)
  }
  resolveConstraints(objects)
  const named = (name: string) => objects.find(item => item.name === name)!
  const circle = (name = 'a') => named(name) as UnitCircle
  const card = (name = 'a') => describeCard(named(name), { objects })
  const set = (name: string, value: number) => {
    (named(name) as Parameter).value = value
    recomputeDefinitions(objects, prepare, [name])
  }
  return { objects, named, circle, card, set, prepare }
}

test('değerler çeyrek turlarda tam, özel açılarda kesin yazılır; işaretler bölgeye göredir', () => {
  expect(unitPoint(90)).toEqual({ a: 0, b: 1 })
  expect(unitPoint(540)).toEqual({ a: -1, b: 0 })
  expect(trigValue('tan', 90)).toBeNull()
  expect(trigValue('cot', 360)).toBeNull()
  expect(trigValue('sec', 270)).toBeNull()
  expect(trigValue('csc', 180)).toBeNull()
  expect(trigValue('tan', 40)).toBeCloseTo(Math.tan(40 * Math.PI / 180), 12)
  const exact = (angle: number) => (['sin', 'cos', 'tan', 'cot', 'sec', 'csc'] as const).map(fn => exactTrig(fn, angle))
  expect(exact(30)).toEqual(['1/2', '√3/2', '√3/3', '√3', '2√3/3', '2'])
  expect(exact(135)).toEqual(['√2/2', '-√2/2', '-1', '-1', '-√2', '√2'])
  expect(exact(240)).toEqual(['-√3/2', '-1/2', '√3', '√3/3', '-2', '-2√3/3'])
  expect(exact(90)).toEqual(['1', '0', 'tanımsız', '0', 'tanımsız', '1'])
  expect(exact(720)).toEqual(['0', '1', '0', 'tanımsız', '1', 'tanımsız'])
  expect(exactTrig('sin', 40)).toBeNull()
})

test('sürüklenen A özel açılara yapışır ve tam turlarla 0°–720° içinde süreklidir', () => {
  expect(snapAngle(44.2)).toBe(45)
  expect(snapAngle(31.5)).toBe(30)
  expect(snapAngle(37)).toBe(37)
  const at = (degrees: number) => ({ a: Math.cos(degrees * Math.PI / 180), b: Math.sin(degrees * Math.PI / 180) })
  expect(angleTowards(at(10), 350, 0, 720)).toBeCloseTo(370, 9)
  expect(angleTowards(at(350), 10, 0, 720)).toBeCloseTo(350, 9)
  expect(angleTowards(at(80), 700, 0, 720)).toBeCloseTo(440, 9)
  expect(angleTowards(at(59), 400, 0, 720)).toBe(420)
  expect(angleText(30, undefined, formatDisplayNumber)).toBe('30°')
  expect(angleText(30, 'radian', formatDisplayNumber)).toBe('π/6')
  expect(angleText(270, 'radian', formatDisplayNumber)).toBe('3π/2')
  expect(angleText(720, 'radian', formatDisplayNumber)).toBe('4π')
  expect(angleText(40, 'radian', formatDisplayNumber)).toBe('0.70')
})

test('BirimÇember O merkezli çember ve 0°–720° θ kaydırıcısı oluşturur; başta yalnız çember görünür', () => {
  expect(parseCommand('BirimÇember()')).toEqual({ ok: true, command: { kind: 'unitCircle' } })
  expect(parseCommand('UnitCircle(45)')).toEqual({ ok: true, command: { kind: 'unitCircle', angle: 45 } })
  const doc = documentWith('BirimÇember()', 'BirimÇember(60)')
  expect(doc.named('θ')).toMatchObject({ type: 'parameter', value: 30, min: 0, max: 720, step: 1 })
  expect(doc.named('θ2')).toMatchObject({ type: 'parameter', value: 60 })
  expect(doc.circle()).toMatchObject({ type: 'unitCircle', angle: 30 })
  expect(doc.circle()).not.toHaveProperty('show')
  // The angle's slider is on θ's card only.
  expect(doc.card()).toMatchObject({ input: 'a: x² + y² = 1', output: [], valueFirst: false, sliders: [] })
  expect(doc.card().unitCircle!.toggles.every(toggle => !toggle.checked && !toggle.disabled)).toBe(true)
  expect(editText(doc.circle(), { objects: doc.objects })).toBe('a: BirimÇember(θ)')
  expect(unitCircleParameter(doc.circle('b'), doc.objects)?.name).toBe('θ2')
})

test('bir değer A\'yı da açar ve kilitler; değerler kalkınca A açık kalır ve kaldırılabilir', () => {
  const doc = documentWith('BirimÇember()')
  const circle = doc.circle()
  expect(setUnitCirclePart(circle, 'tan', true)).toBe(true)
  expect(circle.show).toEqual(['A', 'tan'])
  const locked = doc.card().unitCircle!.toggles.find(toggle => toggle.part === 'A')!
  expect(locked).toMatchObject({ checked: true, disabled: true })
  expect(setUnitCirclePart(circle, 'A', false)).toBe(false)
  expect(setUnitCirclePart(circle, 'sin', true)).toBe(true)
  expect(circle.show).toEqual(['A', 'sin', 'tan'])
  expect(doc.card().output).toEqual(['θ = 30°', 'sin θ = 1/2', 'tan θ = √3/3'])
  setUnitCirclePart(circle, 'sin', false)
  setUnitCirclePart(circle, 'tan', false)
  expect(circle.show).toEqual(['A'])
  expect(doc.card().unitCircle!.toggles.find(toggle => toggle.part === 'A')).toMatchObject({ checked: true, disabled: false })
  expect(setUnitCirclePart(circle, 'A', false)).toBe(true)
  // The default is an absent field, so turning everything off restores the model exactly.
  expect(circle).not.toHaveProperty('show')
})

test('açı parametreyle değişir; radyanda yazılır; ayarlar yeniden tanımlamada korunur', () => {
  const doc = documentWith('BirimÇember()')
  const circle = doc.circle()
  setUnitCirclePart(circle, 'cos', true)
  setUnitCirclePart(circle, 'cot', true)
  doc.set('θ', 135)
  expect(circle.angle).toBe(135)
  expect(doc.card().output).toEqual(['θ = 135°', 'cos θ = -√2/2', 'cot θ = -1'])
  doc.set('θ', 180)
  expect(doc.card().output).toEqual(['θ = 180°', 'cos θ = -1', 'cot θ = tanımsız'])
  expect(setUnitCircleUnit(circle, 'radian')).toBe(true)
  expect(doc.card().output).toEqual(['θ = π', 'cos θ = -1', 'cot θ = tanımsız'])
  const text = editText(circle, { objects: doc.objects })!
  const result = redefineObject(doc.objects, circle, 'a: BirimÇember(θ)', text, doc.prepare)
  expect(result.ok).toBe(true)
  expect(circle).toMatchObject({ show: ['A', 'cos', 'cot'], angleUnit: 'radian', angle: 180 })
  expect(setUnitCircleUnit(circle, 'degree')).toBe(true)
  expect(circle).not.toHaveProperty('angleUnit')
})

test('A sürüklenince açı parametresi döner; A gizliyken çember sürüklenmez', () => {
  const doc = documentWith('BirimÇember()')
  const circle = doc.circle()
  const theta = doc.named('θ') as Parameter
  const A = unitPoint(30)
  expect(beginObjectDrag(circle, doc.objects, A, 1e-6, 0.1)).toBeNull()
  setUnitCirclePart(circle, 'A', true)
  expect(beginObjectDrag(circle, doc.objects, { a: 0, b: 0 }, 1e-6, 0.1)).toBeNull()
  const drag = beginObjectDrag(circle, doc.objects, A, 1e-6, 0.1)!
  moveObjectDrag(drag, { a: Math.cos(1.05), b: Math.sin(1.05) })
  expect(theta.value).toBe(60)
  moveObjectDrag(drag, { a: -0.2, b: -1 })
  expect(theta.value).toBeCloseTo(258.69, 1)
  moveObjectDrag(drag, A)
  expect(theta.value).toBe(30)
})

test('birim çember .drw2 dosyasında ayarlarıyla saklanır; θ silinince çember de silinir', () => {
  const doc = documentWith('BirimÇember(45)')
  setUnitCirclePart(doc.circle(), 'sec', true)
  setUnitCircleUnit(doc.circle(), 'radian')
  const parsed = parseDocument(serializeDocument({ objects: doc.objects }))
  expect(parsed.ok && parsed.objects.find(object => object.type === 'unitCircle'))
    .toMatchObject({ angle: 45, show: ['A', 'sec'], angleUnit: 'radian' })
  expect(collectDependents(doc.objects, [doc.named('θ').id!]).has(doc.circle().id!)).toBe(true)
  // An angle given as an expression creates no slider.
  const prepared = prepareCommand({ kind: 'unitCircle', angle: { expression: 'θ' } }, doc.objects, { nextId: 50, randomColor: () => '#000' })
  expect(prepared.ok && prepared.objects.map(object => object.type)).toEqual(['unitCircle'])
})
