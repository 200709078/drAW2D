import { expect, test } from '@playwright/test'
import { describeCard } from '../src/app/object-cards'
import { TraceRecorder } from '../src/app/traces'
import { parseCommand } from '../src/commands/parser'
import { prepareCommand } from '../src/commands/prepare'
import { recomputeDefinitions } from '../src/document/definitions'
import { resolveConstraints } from '../src/document/dependencies'
import { parseDocument, serializeDocument } from '../src/document/file-format'
import { GeometryDocument } from '../src/document/geometry-document'
import { equalModelGraphs } from '../src/document/graph-equality'
import type { GeometryDocumentObject, Parameter } from '../src/geometry/function-types'
import type { GeometryPoint } from '../src/geometry/types'
import { createCoordinateTransform } from '../src/rendering/coordinate-transform'
import { createFunctionEvaluator } from '../src/rendering/function-evaluator'
import type { DrawingContext } from '../src/rendering/painter-types'
import { paintDocumentScene } from '../src/rendering/scene-painter'
import { SvgContext } from '../src/rendering/svg-context'

function documentWith(...sources: string[]) {
  const objects: GeometryDocumentObject[] = []
  const prepare = (command: Parameters<typeof prepareCommand>[0]) =>
    prepareCommand(command, objects, { nextId: objects.length ? Math.max(...objects.map(object => object.id ?? 0)) + 1 : 0,
      randomColor: () => '#123456', range: { start: -10, end: 10 } })
  for (const source of sources) {
    const parsed = parseCommand(source)
    if (!parsed.ok) throw new Error(parsed.error)
    const prepared = prepare(parsed.command)
    if (!prepared.ok) throw new Error(`${source}: ${prepared.error}`)
    objects.push(...prepared.objects)
  }
  resolveConstraints(objects)
  return { objects, prepare }
}

const view = { scaleX: 100, scaleY: 100, minX: -5, minY: -5, tickX: 3, tickY: 3 }

test('.drw2 belgesi paylaşılan nesneleri bir kez yazar ve açınca paylaşımı geri kurar', () => {
  const doc = documentWith('a=2', '(1,1)', 'Çember(A,a)', 'Doğru(A,(3,2))', 'Kesiştir(b,f)', 'Teğet(x^2,1)', 'Çokgen(A,B,(0,3))',
    'x^2+y^2=4', 'y<x', 'Eğri(t,t^2,t,0,1)', 'Kök(x^2-1)')
  const text = serializeDocument({ objects: doc.objects, view })
  const data = JSON.parse(text)
  expect(data).toMatchObject({ app: 'drAW2D', format: 1, view })
  const circle = data.objects.find((object: { type: string }) => object.type === 'circleR')
  expect(circle.A).toEqual({ $ref: doc.objects.find(object => object.name === 'A')!.id })
  const parsed = parseDocument(text)
  expect(parsed.ok).toBe(true)
  if (!parsed.ok) return
  expect(parsed.view).toEqual(view)
  expect(equalModelGraphs(parsed.objects, doc.objects)).toBe(true)
  const A = parsed.objects.find(object => object.name === 'A') as GeometryPoint
  const opened = parsed.objects.find(object => object.type === 'circleR')!
  expect(opened.type === 'circleR' && opened.A).toBe(A)
  // The opened document is live: its parameter still moves the circle and the intersection.
  ;(parsed.objects.find(object => object.name === 'a') as Parameter).value = 3
  recomputeDefinitions(parsed.objects, command => prepareCommand(command, parsed.objects, { nextId: 100, randomColor: () => '#123456' }), ['a'])
  resolveConstraints(parsed.objects)
  expect(opened.type === 'circleR' && opened.r).toBe(3)
  const cards = parsed.objects.map(object => describeCard(object, { objects: parsed.objects }).input)
  expect(cards).toContain('b: Çember(A,a)')
})

test('bozuk, yabancı ya da daha yeni belgeler reddedilir', () => {
  expect(parseDocument('{')).toEqual({ ok: false, error: 'Dosya okunamadı: geçerli bir drAW2D belgesi değil.' })
  expect(parseDocument('{"app":"drAW3D","format":1,"objects":[]}')).toEqual({ ok: false, error: 'Bu dosya bir drAW2D belgesi değil.' })
  expect(parseDocument('{"app":"drAW2D","format":9,"objects":[]}')).toEqual({ ok: false, error: 'Bu belge drAW2D’nin daha yeni bir sürümüyle kaydedilmiş.' })
  expect(parseDocument('{"app":"drAW2D","format":1,"objects":[{"type":"bomb","id":0,"name":"x","color":"#000"}]}'))
    .toEqual({ ok: false, error: 'Belgede tanınmayan ya da bozuk bir nesne var.' })
  const missing = '{"app":"drAW2D","format":1,"objects":[{"type":"circleR","id":1,"name":"a","color":"#000","A":{"$ref":7},"r":1}]}'
  expect(parseDocument(missing)).toEqual({ ok: false, error: 'Bir nesnenin dayandığı bir nesne belgede yok.' })
  const twice = '{"app":"drAW2D","format":1,"objects":[{"type":"point","id":1,"name":"A","color":"#000","a":0,"b":0,"onOther":[]},'
    + '{"type":"point","id":1,"name":"B","color":"#000","a":0,"b":0,"onOther":[]}]}'
  expect(parseDocument(twice).ok).toBe(false)
})

test('otomatik kayıttan dönülen belgenin geçmişi oradan başlar; kimlikler yinelenmez', () => {
  const doc = documentWith('(1,1)', '(2,2)')
  const geometry = new GeometryDocument()
  geometry.reset(doc.objects)
  expect(geometry.canUndo).toBe(false)
  expect(geometry.objects).toHaveLength(2)
  expect(geometry.nextId).toBe(2)
  geometry.undo()
  expect(geometry.objects).toHaveLength(2)
})

test('iz doğru, çember ve fonksiyon grafiğinin her değişen halini düzlem koordinatlarında saklar', () => {
  const doc = documentWith('k=1', 'k*x', 'Çember((0,0),k)', 'x^2-k')
  for (const object of doc.objects) if (object.type !== 'point') object.trace = true
  const recorder = new TraceRecorder()
  const transform = createCoordinateTransform({ width: 400, height: 300, minX: -2, minY: -1.5, scaleX: 100, scaleY: 100, unitX: 1, unitY: 1 })
  const viewOf = { transform, width: 400, height: 300, evaluator: createFunctionEvaluator() }
  recorder.record(doc.objects, viewOf)
  recorder.record(doc.objects, viewOf)
  const counts = () => recorder.frames(doc.objects).map(frame => 'shapes' in frame ? frame.shapes.length : -1)
  expect(counts()).toEqual([1, 1, 1])
  ;(doc.objects[0] as Parameter).value = 2
  recomputeDefinitions(doc.objects, doc.prepare, ['k'])
  recorder.record(doc.objects, viewOf)
  expect(counts()).toEqual([2, 2, 2])
  const [line, circle, graph] = recorder.frames(doc.objects)
  expect(line).toMatchObject({ shapes: [{ kind: 'line', line: { type: 'lineWithEquation', m: 1, n: 0 } }, { kind: 'line', line: { m: 2 } }] })
  expect(circle).toMatchObject({ shapes: [{ kind: 'circle', r: 1 }, { kind: 'circle', r: 2 }] })
  // A graph is kept as the polylines it was drawn with, in plane coordinates.
  const path = 'shapes' in graph! && graph.shapes[1]
  expect(path && path.kind === 'path' && path.lines[0]!.every(point => Math.abs(point.b - (point.a ** 2 - 2)) < 0.02)).toBe(true)
  doc.objects[1]!.trace = false
  recorder.record(doc.objects, viewOf)
  expect(recorder.frames(doc.objects)).toHaveLength(2)
})

test('SVG çıktısı çizimi vektör olarak kaydeder', () => {
  const doc = documentWith('(1,1)', 'Çember((0,0),1)', 'x^2', 'y<x', 'Vektör((0,0),(1,2))')
  const svg = new SvgContext(400, 300)
  paintDocumentScene({
    ctx: svg as unknown as DrawingContext,
    transform: createCoordinateTransform({ width: 400, height: 300, minX: -2, minY: -1.5, scaleX: 100, scaleY: 100, unitX: 1, unitY: 1 }),
    width: 400, height: 300, activeId: null, objects: doc.objects, evaluator: createFunctionEvaluator(),
  })
  const text = svg.toString()
  expect(text.startsWith('<?xml')).toBe(true)
  expect(text).toContain('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"')
  expect(text).toMatch(/<path d="M[^"]*A100 100 0 0 1 [^"]*" fill="none" stroke="#123456"/)
  expect(text).toContain('>A</text>')
  // Translucent region fills become an opacity.
  expect(text).toMatch(/fill="#123456" fill-opacity="0\.25"/)
  expect(text.match(/<path /g)!.length).toBeGreaterThan(5)
})
