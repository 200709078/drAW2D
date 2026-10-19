import { expect, test } from '@playwright/test'
import { parseCommand } from '../src/commands/parser'
import { prepareCommand } from '../src/commands/prepare'
import { GeometryDocument } from '../src/document/geometry-document'
import { equalModelGraphs } from '../src/document/graph-equality'
import { createGeometryModels } from '../src/geometry/models'
import type { GeometryPoint } from '../src/geometry/types'

function appendCommand(document: GeometryDocument, source: string): number {
  const parsed = parseCommand(source)
  if (!parsed.ok) throw new Error(parsed.error)
  const prepared = prepareCommand(parsed.command, document.objects, {
    nextId: document.nextId,
    randomColor: () => '#123456',
  })
  if (!prepared.ok) throw new Error(prepared.error)
  document.append(...prepared.objects)
  return prepared.activeId
}

function point(document: GeometryDocument, id: number): GeometryPoint {
  const object = document.objects.find(item => item.id === id)
  if (!object || object.type !== 'point') throw new Error(`Nokta bulunamadı: ${id}`)
  return object
}

function assertSharedConstruction(document: GeometryDocument): void {
  const [a, b, line, circle] = document.objects
  if (!a || a.type !== 'point' || !b || b.type !== 'point'
    || !line || line.type !== 'lineWithPoints' || !circle || circle.type !== 'circle2') {
    throw new Error('İki nokta, doğru ve çember bekleniyordu.')
  }
  expect(line.A).toBe(a)
  expect(line.B).toBe(b)
  expect(circle.A).toBe(a)
  expect(circle.B).toBe(b)
}

test('geçmiş kopyaları canlı modellerden ayrılır ve ortak nokta başvurularını korur', () => {
  const document = new GeometryDocument()
  const aId = appendCommand(document, '(1,2)')
  appendCommand(document, '(3,4)')
  appendCommand(document, 'Doğru(A,B)')
  appendCommand(document, 'Çember(A,B)')
  expect(document.commit()).toBe(true)
  assertSharedConstruction(document)

  const originalA = point(document, aId)
  originalA.a = 8
  expect(document.commit()).toBe(true)
  originalA.a = 999
  expect(document.undo()).toBe(true)
  assertSharedConstruction(document)
  expect(point(document, aId)).not.toBe(originalA)
  expect(point(document, aId).a).toBe(1)

  point(document, aId).a = -999
  expect(document.redo()).toBe(true)
  assertSharedConstruction(document)
  expect(point(document, aId).a).toBe(8)
  expect(document.undo()).toBe(true)
  expect(point(document, aId).a).toBe(1)
})

test('aynı alan değerleriyle ayrılmış başvurular ortak model grafiğiyle eşit sayılmaz', () => {
  const document = new GeometryDocument()
  const aId = appendCommand(document, '(1,2)')
  appendCommand(document, '(3,4)')
  appendCommand(document, 'Doğru(A,B)')
  document.commit()
  const line = document.objects[2]
  if (!line || line.type !== 'lineWithPoints') throw new Error('Doğru bekleniyordu.')
  const sharedGraph = structuredClone(document.objects)
  line.A = structuredClone(point(document, aId))
  expect(equalModelGraphs(document.objects, sharedGraph)).toBe(false)
  expect(equalModelGraphs(sharedGraph, document.objects)).toBe(false)
  expect(document.commit()).toBe(true)
  document.undo()
  const restoredLine = document.objects[2]
  if (!restoredLine || restoredLine.type !== 'lineWithPoints') throw new Error('Doğru bekleniyordu.')
  expect(restoredLine.A).toBe(document.objects[0])
})

test('NaN, sonsuzluklar ve işaretli sıfır JSON çakışması olmadan ayrı geçmiş değerleri olur', () => {
  const document = new GeometryDocument()
  const id = appendCommand(document, '(0,0)')
  document.commit()
  const values = [NaN, Infinity, -Infinity, -0, 0]
  for (const value of values) {
    point(document, id).a = value
    expect(document.commit()).toBe(true)
    expect(document.commit()).toBe(false)
  }
  expect(document.undoDepth).toBe(6)
  for (const value of [...values].reverse()) {
    expect(Object.is(point(document, id).a, value)).toBe(true)
    expect(document.undo()).toBe(true)
  }
  expect(Object.is(point(document, id).a, 0)).toBe(true)
  expect(document.redo()).toBe(true)
  expect(Number.isNaN(point(document, id).a)).toBe(true)
})

test('değişmeyen düzenleme ve seçili nesne değişikliği yineleme dalını korur', () => {
  const document = new GeometryDocument()
  const first = appendCommand(document, '(1,2)')
  document.commit()
  appendCommand(document, '(3,4)')
  document.commit()
  document.undo()

  document.activeId = first
  document.beginEdit()
  point(document, first).a = 9
  point(document, first).a = 1
  expect(document.commitEdit()).toBe(false)
  expect(document.isEditing).toBe(false)
  expect(document.commit()).toBe(false)
  expect(document.undoDepth).toBe(1)
  expect(document.redoDepth).toBe(1)
  expect(document.redo()).toBe(true)
  expect(document.objects).toHaveLength(2)
})

test('varsayılan ve özel geçmiş sınırı en eski tutulan durumu yeni taban yapar', () => {
  expect(new GeometryDocument().historyLimit).toBe(100)
  for (const historyLimit of [0, -1, 1.5, Infinity, NaN]) {
    expect(() => new GeometryDocument({ historyLimit })).toThrow(RangeError)
  }
  for (const historyLimit of [2, 100]) {
    const document = new GeometryDocument({ historyLimit })
    const id = appendCommand(document, '(0,0)')
    document.commit()
    for (let value = 1; value <= historyLimit + 1; value++) {
      point(document, id).a = value
      document.commit()
    }
    expect(document.undoDepth).toBe(historyLimit)
    for (let index = 0; index < historyLimit; index++) expect(document.undo()).toBe(true)
    expect(point(document, id).a).toBe(1)
    expect(document.undo()).toBe(false)
    expect(point(document, id).a).toBe(1)
    expect(document.redoDepth).toBe(historyLimit)
    for (let index = 0; index < historyLimit; index++) expect(document.redo()).toBe(true)
    expect(point(document, id).a).toBe(historyLimit + 1)
    expect(document.redo()).toBe(false)
  }
})

test('kimlikler geri alma dalı, temizleme ve iptal edilen taslak boyunca tekrarlanmaz', () => {
  const document = new GeometryDocument()
  expect(appendCommand(document, '(1,1)')).toBe(0)
  document.commit()
  expect(appendCommand(document, '(2,2)')).toBe(1)
  document.commit()
  document.undo()
  expect(document.nextId).toBe(2)
  expect(appendCommand(document, '(3,3)')).toBe(2)
  document.commit()
  expect(document.canRedo).toBe(false)
  expect(document.clear()).toBe(true)
  document.commit()
  expect(document.nextId).toBe(3)
  const cancelled = appendCommand(document, '(4,4)')
  document.trackDraft(cancelled)
  expect(document.cancelDraft()).toBe(true)
  expect(document.cancelDraft()).toBe(false)
  expect(document.objects).toHaveLength(0)
  expect(document.nextId).toBe(4)
  expect(document.commit()).toBe(false)
  document.undo()
  expect(document.objects.map(object => object.id)).toEqual([0, 2])
  expect(document.allocateId()).toBe(4)
  expect(document.nextId).toBe(5)
})

test('taslak açıkken kayıt engellenir; yalnız tamamlanan çizim geçmişe girer', () => {
  const document = new GeometryDocument()
  appendCommand(document, '(1,1)')
  document.commit()
  document.undo()
  const draftId = appendCommand(document, '(2,2)')
  document.trackDraft(draftId)
  document.activeId = draftId
  expect(document.hasDraft).toBe(true)
  expect(() => document.commit()).toThrow('Yarım çizim')
  expect(document.undoDepth).toBe(0)
  expect(document.redoDepth).toBe(1)

  document.finishDraft()
  expect(document.hasDraft).toBe(false)
  expect(document.commit()).toBe(true)
  expect(document.redoDepth).toBe(0)
  document.undo()
  expect(document.objects).toHaveLength(0)
  document.redo()
  expect(document.objects.map(object => object.id)).toEqual([draftId])
  expect(() => document.trackDraft(999)).toThrow('belgede bulunamadı')
})

test('geçersiz ekleme grubu belgeyi, seçimi, kimlik sayacını ve yinelemeyi değiştirmez', () => {
  const document = new GeometryDocument()
  const existingId = appendCommand(document, '(1,2)')
  document.commit()
  appendCommand(document, '(3,4)')
  document.commit()
  document.undo()
  document.activeId = existingId
  const factory = createGeometryModels({
    createName: group => group,
    nextId: () => 80,
    randomColor: () => '#123456',
  })
  const valid = new factory.mPoint(5, 6)
  const invalidObjects = [
    { ...valid, id: existingId },
    { ...valid, id: null },
    { ...valid, id: -1 },
    { ...valid, id: 1.5 },
    { ...valid, id: Infinity },
    { ...valid, id: Number.MAX_SAFE_INTEGER },
    new factory.mPoint(7, 8, true),
    { ...valid, id: 81, temp: true },
    { ...valid },
  ]
  const before = structuredClone(document.objects)
  for (const invalid of invalidObjects) {
    expect(() => document.append(valid, invalid)).toThrow('kimliği geçersiz veya yinelenmiş')
    expect(document.objects).toEqual(before)
    expect(document.nextId).toBe(2)
    expect(document.activeId).toBe(existingId)
    expect(document.undoDepth).toBe(1)
    expect(document.redoDepth).toBe(1)
  }
})

test('düzenleme iptali kayıtlı grafiği geri getirir; bir dizi güncelleme tek adımda kaydedilir', () => {
  const document = new GeometryDocument()
  const id = appendCommand(document, '(1,2)')
  document.commit()
  expect(document.commitEdit()).toBe(false)
  expect(document.cancelEdit()).toBe(false)
  document.beginEdit()
  point(document, id).a = 3
  point(document, id).a = 4
  expect(document.cancelEdit()).toBe(true)
  expect(point(document, id).a).toBe(1)
  expect(document.undoDepth).toBe(1)
  expect(document.isEditing).toBe(false)

  document.beginEdit()
  for (const value of [3, 4, 5]) point(document, id).a = value
  expect(document.commitEdit()).toBe(true)
  expect(document.undoDepth).toBe(2)
  expect(document.isEditing).toBe(false)
  document.undo()
  expect(point(document, id).a).toBe(1)
  document.redo()
  expect(point(document, id).a).toBe(5)
})

test('geçmiş sınırında gezinme taslak, düzenleme ve seçimi temizleyip kayıtlı tabanı korur', () => {
  const document = new GeometryDocument()
  const draftId = appendCommand(document, '(1,2)')
  document.trackDraft(draftId)
  document.activeId = draftId
  document.beginEdit()
  expect(document.undo()).toBe(false)
  expect(document.objects).toHaveLength(0)
  expect(document.activeId).toBeNull()
  expect(document.hasDraft).toBe(false)
  expect(document.isEditing).toBe(false)

  const id = appendCommand(document, '(3,4)')
  document.commit()
  document.activeId = 999
  expect(document.activeId).toBeNull()
  document.activeId = id
  document.beginEdit()
  point(document, id).a = 99
  expect(document.redo()).toBe(false)
  expect(point(document, id).a).toBe(3)
  expect(document.activeId).toBeNull()
  expect(document.isEditing).toBe(false)
  document.activeId = id
  expect(document.remove(999)).toBe(false)
  expect(document.activeId).toBe(id)
  expect(document.remove(id)).toBe(true)
  expect(document.activeId).toBeNull()
})
