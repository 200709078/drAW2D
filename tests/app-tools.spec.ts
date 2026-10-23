import { expect, test } from '@playwright/test'
import { createObjectName } from '../src/commands/names'
import { parseCommand } from '../src/commands/parser'
import { prepareCommand } from '../src/commands/prepare'
import { ToolController, type ToolInput } from '../src/app/tools'
import { hitTest } from '../src/app/hit-test'
import { collectDependents, resolveConstraints } from '../src/document/dependencies'
import { GeometryDocument } from '../src/document/geometry-document'
import { createGeometryModels } from '../src/geometry/models'
import { createCoordinateTransform } from '../src/rendering/coordinate-transform'
import { createFunctionEvaluator } from '../src/rendering/function-evaluator'

const view = { width: 1000, height: 1000, minX: -5, minY: -5, scaleX: 100, scaleY: 100, unitX: 1, unitY: 1 }
const transform = createCoordinateTransform(view)
const evaluator = createFunctionEvaluator()

function setup() {
  const document = new GeometryDocument()
  const randomColor = () => '#123456'
  const models = createGeometryModels({
    createName: group => createObjectName(group, document.objects.map(object => object.name)),
    nextId: () => document.allocateId(),
    randomColor,
  })
  const tools = new ToolController({
    document,
    models,
    prepare: command => prepareCommand(command, document.objects, { nextId: document.nextId, randomColor }),
    visibleRange: () => ({ start: -5, end: 5 }),
  })
  const run = (source: string) => {
    const parsed = parseCommand(source)
    if (!parsed.ok) throw new Error(parsed.error)
    const prepared = prepareCommand(parsed.command, document.objects, { nextId: document.nextId, randomColor })
    if (!prepared.ok) throw new Error(prepared.error)
    document.append(...prepared.objects)
  }
  const at = (a: number, b: number): ToolInput => ({
    position: { a, b },
    hit: hitTest(document.objects, { a, b }, { transform, evaluator }),
  })
  return { document, tools, run, at }
}

test('nokta araçları komut hazırlamasını kullanır ve aynı noktanın ikinci kez seçilmesini reddeder', () => {
  const { document, tools, at } = setup()
  tools.setAction('line')
  expect(tools.press(at(0, 0))).toMatchObject({ changed: true, completed: false })
  expect(document.hasDraft).toBe(true)
  const repeated = tools.press(at(0.02, 0))
  expect(repeated.completed).toBe(false)
  expect(repeated.message?.text).toBe('Farklı bir nokta seçiniz.')
  expect(tools.press(at(1, 1))).toMatchObject({ changed: true, completed: true })
  expect(document.hasDraft).toBe(false)
  expect(document.objects.map(object => [object.type, object.name])).toEqual([
    ['point', 'A'], ['point', 'B'], ['lineWithPoints', 'f'],
  ])
  expect(document.activeId).toBe(2)
  expect(tools.isConstructing).toBe(false)
})

test('doğrusal üç noktalı çember reddedilir, son nokta kaldırılır ve ilk iki seçim korunur', () => {
  const { document, tools, at } = setup()
  tools.setAction('circle3')
  tools.press(at(0, 0))
  tools.press(at(1, 0))
  const rejected = tools.press(at(2, 0))
  expect(rejected.completed).toBe(false)
  expect(rejected.message).toEqual({ title: 'Çember', text: 'Üç nokta aynı doğru üzerinde; çember tanımlanamadı.' })
  expect(document.objects.map(object => object.name)).toEqual(['A', 'B'])
  expect(tools.press(at(1, 1)).completed).toBe(true)
  expect(document.objects.map(object => object.type)).toEqual(['point', 'point', 'point', 'circle3'])
})

test('nesneye tıklanan noktalar o nesneye bağlanır', () => {
  const { document, tools, run, at } = setup()
  run('Çember((0,0),2)')
  run('x=3')
  tools.setAction('linesegment')
  tools.press(at(2.05, 0.1))
  tools.press(at(3.04, 1))
  const [, , , onCircle, onLine] = document.objects
  if (onCircle?.type !== 'point') throw new Error('Çembere bağlı nokta yok')
  expect(onCircle.onOther).toEqual([{ type: 'onCircle', circleId: 1 }])
  expect(Math.hypot(Number(onCircle.a), Number(onCircle.b))).toBeCloseTo(2, 12)
  expect(onLine).toMatchObject({ type: 'point', a: 3, b: 1, onOther: [{ type: 'onLine', lineId: 2 }] })
})

test('çemberin içindeki teğet adayı nokta, ad veya kimlik ayırmaz', () => {
  const { document, tools, run, at } = setup()
  run('Çember((0,0),2)')
  tools.setAction('circletangent')
  tools.press(at(2, 0))
  const nextId = document.nextId
  const rejected = tools.press(at(1, 0))
  expect(rejected.message?.text).toBe('Seçilen nokta çemberin içinde olduğu için teğet çizilemez.')
  expect(document.nextId).toBe(nextId)
  expect(tools.press(at(3, 2)).completed).toBe(true)
  expect(document.objects.find(object => object.type === 'point' && object.name === 'B')?.id).toBe(nextId)
})

test('yay ölçüsü aracı seçilen çemberi kullanır ve başka çemberdeki noktayı reddeder', () => {
  const { document, tools, run, at } = setup()
  run('Çember((0,0),2)')
  run('Çember((4,0),2)')
  tools.setAction('arcmeasure')
  tools.press(at(-2, 0))
  expect(tools.press(at(6, 0)).message?.text).toBe('Aynı çember üzerinde bir nokta seçin.')
  expect(tools.press(at(0, 2)).completed).toBe(true)
  const arc = document.objects.at(-1)
  expect(arc?.type === 'arcMeasure' && arc.circle.name).toBe('a')
})

test('silme bağımlı yapıları zincir halinde toplar', () => {
  const { document, run } = setup()
  run('Çember((0,0),2)')
  run('TeğetC(a,(3,2))')
  run('(5,5)')
  const ids = collectDependents(document.objects, [0])
  expect([...ids].sort()).toEqual([0, 1, 3, 4, 5])
  expect(collectDependents(document.objects, [2])).toEqual(new Set([2, 3, 4, 5]))
})

test('kesişim ve yansıma noktaları kaynakları değişince yeniden hesaplanır', () => {
  const { document, run } = setup()
  run('2x')
  run('x=1')
  run('Kesiştir(f,denk1)')
  run('YansıtNokta((1,1),(0,0))')
  const points = document.objects.filter(object => object.type === 'point')
  const intersection = points.find(point => point.intersectionOwner)!
  const reflected = points.find(point => point.onOther.some(constraint => constraint.type === 'reflectPoint'))!
  const constraint = reflected.onOther[0]!
  const source = points.find(point => constraint.type === 'reflectPoint' && point.id === constraint.sourceId)!
  const line = document.objects.find(object => object.type === 'verLine')!
  if (line.type !== 'verLine') throw new Error('Dik doğru bulunamadı')
  expect(intersection).toMatchObject({ a: 1, b: 2 })
  line.x = 2
  source.a = 3
  resolveConstraints(document.objects)
  expect(intersection).toMatchObject({ a: 2, b: 4 })
  expect(reflected).toMatchObject({ a: -3, b: -1 })
})

test('isabet eşiği yakınlaştırmadan bağımsız olarak CSS pikseli cinsindendir', () => {
  const { document, run } = setup()
  run('(0,0)')
  run('(0.3,0)')
  const zoomedOut = createCoordinateTransform({ ...view, scaleX: 10, scaleY: 10 })
  // 0.25 units is 2.5 px when zoomed out: both points are within 10 px, the nearest wins.
  expect(hitTest(document.objects, { a: 0.25, b: 0 }, { transform: zoomedOut, evaluator })?.object.name).toBe('B')
  // At the default zoom 0.25 units is 25 px from A and 5 px from B.
  expect(hitTest(document.objects, { a: 0.12, b: 0 }, { transform, evaluator })).toBeNull()
  expect(hitTest(document.objects, { a: 0.25, b: 0 }, { transform, evaluator })?.object.name).toBe('B')
})
