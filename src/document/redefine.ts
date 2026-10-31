import { definitionNames } from '../commands/definition'
import { isReservedName } from '../commands/expressions'
import { parseCommand } from '../commands/parser'
import type { Command } from '../commands/types'
import type { GeometryDocumentObject } from '../geometry/function-types'
import type { ObjectId, PointConstraint } from '../geometry/types'
import { adopt, redefineParameter, type PrepareCommand } from './definitions'
import { collectDependents, directReferences } from './dependencies'

const OBJECT_NAME = /^[\p{L}_][\p{L}\p{N}_']*$/u
/** `f: y = x^2`, `A = (1,2)`, `f(x) = ...`; `x = 2` and `y = ...` are definitions, not names. */
const LEADING_NAME = /^\s*([\p{L}_][\p{L}\p{N}_']*)\s*(?:\(\s*x\s*\))?\s*[:=]\s*([\s\S]+)$/u

/** Types that can replace each other while other objects depend on the object. */
const FAMILIES: readonly (readonly string[])[] = [
  ['lineWithEquation', 'verLine', 'lineWithPoints', 'lineSegment', 'distanceSegment', 'ray'],
  ['circleR', 'circle2', 'circle3'],
  ['function', 'lineWithEquation', 'functioncomposition', 'derivative', 'limit', 'tangent', 'tangentHX'],
]
const ATTACHMENTS = new Set<PointConstraint['type']>(['onLine', 'onCircle', 'onCircleTangent', 'onAngle'])
const IMAGE_HELPERS = new Set<PointConstraint['type']>(['reflectPoint', 'reflectLine', 'rotate', 'translate', 'anchor'])

export type RedefineResult =
  | { ok: true; append: GeometryDocumentObject[]; remove: ObjectId[]; changedNames: string[] }
  | { ok: false; error: string }

type ConstructionResult =
  | { ok: true; append: GeometryDocumentObject[]; remove: ObjectId[] }
  | { ok: false; error: string }

export function splitEditText(text: string): { name: string | null; definition: string } {
  const match = text.match(LEADING_NAME)
  if (!match || match[1] === 'x' || match[1] === 'y') return { name: null, definition: text.trim() }
  return { name: match[1]!, definition: match[2]!.trim() }
}

function compatible(from: string, to: string): boolean {
  return from === to || FAMILIES.some(family => family.includes(from) && family.includes(to))
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const nameToken = (name: string) => new RegExp(`(?<![\\p{L}\\p{N}_'])${escapeRegExp(name)}(?![\\p{L}\\p{N}_'])`, 'gu')

/** A copy of the command with every use of the name `from` replaced by `to`. */
export function renameInCommand(command: Command, from: string, to: string): Command {
  const token = nameToken(from)
  const walk = (value: unknown, key: string): unknown => {
    if (Array.isArray(value)) return value.map(item => walk(item, key))
    if (typeof value === 'string') {
      if (key === 'expression' || key === 'expressions' || key === 'source') return value.replace(token, to)
      if (['name', 'first', 'second', 'A', 'B', 'circle'].includes(key)) return value === from ? to : value
      return value
    }
    if (typeof value === 'object' && value !== null) {
      return Object.fromEntries(Object.entries(value).map(([field, item]) => [field, walk(item, field)]))
    }
    return value
  }
  return walk(command, '') as Command
}

/** Give the object a new name; definitions that use the old one follow it. */
function rename(objects: readonly GeometryDocumentObject[], target: GeometryDocumentObject, name: string): void {
  const previous = target.name!
  target.name = name
  const token = nameToken(previous)
  for (const object of objects) {
    if (object.definition) object.definition = renameInCommand(object.definition, previous, name)
    if (object.vectorExpression) object.vectorExpression = object.vectorExpression.replace(token, name)
  }
  if (target.type === 'derivative') {
    target.func.name = name
    target.derFunc.name = `${name}'`
  } else if (target.type === 'sectionalFunctions') {
    for (const section of target.secFuncs) section.name = name
  }
}

/** Points that exist only as parts of a construction: tangent touch points, the second intersection. */
type BoundConstraint = Extract<PointConstraint, {
  type: 'circleTangentTouchPoint' | 'intersectLines' | 'analysisPoint' | 'midpoint' | 'lineHelper' | 'regularVertex'
    | 'reflectPoint' | 'reflectLine' | 'rotate' | 'translate' | 'anchor' | 'vectorSum'
}>

/** Constraints of points that belong to another object through `ownerId`. */
const OWNED = new Set<PointConstraint['type']>([
  'intersectLines', 'analysisPoint', 'midpoint', 'lineHelper', 'regularVertex', 'reflectPoint', 'reflectLine', 'rotate',
  'translate', 'anchor', 'vectorSum',
])

function boundTo(object: GeometryDocumentObject, ownerId: ObjectId | null): BoundConstraint | null {
  if (object.type !== 'point') return null
  for (const constraint of object.onOther) {
    if ((constraint.type === 'circleTangentTouchPoint' && constraint.tangentId === ownerId)
      || (OWNED.has(constraint.type) && 'ownerId' in constraint && constraint.ownerId !== undefined && constraint.ownerId === ownerId)) {
      return constraint as BoundConstraint
    }
  }
  return null
}

function remapIds(object: GeometryDocumentObject, from: ObjectId, to: ObjectId): void {
  if (object.type !== 'point') return
  const swap = (id: ObjectId | null | undefined) => id === from ? to : id
  object.onOther = object.onOther.map(constraint => {
    const copy = { ...constraint } as Record<string, unknown>
    for (const [key, value] of Object.entries(copy)) if (typeof value === 'number' && key.endsWith('Id')) copy[key] = swap(value)
    return copy as unknown as PointConstraint
  })
  if (object.intersectionPointIds) object.intersectionPointIds = object.intersectionPointIds.map(id => swap(id) ?? null)
}

function redefineConstruction(objects: readonly GeometryDocumentObject[], target: GeometryDocumentObject, source: string,
  prepare: PrepareCommand): ConstructionResult {
  const parsed = parseCommand(source)
  if (!parsed.ok) return parsed
  let command = parsed.command
  // An edited Limit or TeğetH/X keeps the δ or h slider its definition already uses.
  const previous = target.definition
  if (command.kind === 'limit' && previous?.kind === 'limit' && command.delta === undefined) command = { ...command, delta: previous.delta }
  if ((command.kind === 'tangentH' || command.kind === 'tangentX') && previous?.kind === command.kind && command.h === undefined) {
    command = { ...command, h: previous.h }
  }
  // Typed coordinates move a point bound to an object along that object.
  if (target.type === 'point' && command.kind === 'point' && typeof command.point.a === 'number'
    && typeof command.point.b === 'number' && target.onOther.some(constraint => ATTACHMENTS.has(constraint.type))) {
    target.a = command.point.a
    target.b = command.point.b
    return { ok: true, append: [], remove: [] }
  }

  const prepared = prepare(command)
  if (!prepared.ok) return prepared
  const fresh = prepared.objects.find(object => object.id === prepared.activeId)!
  const helpers = prepared.objects.filter(object => object !== fresh)
  const targetId = target.id!
  const dependents = collectDependents(objects, [targetId])

  // The new definition may not use the object itself or anything built on it.
  const ids = new Map(objects.flatMap(object => object.name !== null && object.id !== null ? [[object.name, object.id] as const] : []))
  for (const object of prepared.objects) {
    const used = [...directReferences(object),
      ...(object.definition ? [...definitionNames(object.definition, objects)].flatMap(name => ids.get(name) ?? []) : [])]
    if (used.some(id => dependents.has(id))) return { ok: false, error: 'Nesne kendisine veya ona bağlı bir nesneye başvuramaz.' }
  }
  if (dependents.size > 1 && !compatible(target.type, fresh.type)) {
    return { ok: false, error: 'Bu nesneye bağlı yapılar var; tanım aynı türde bir nesne üretmelidir.' }
  }

  // Touch points and second intersections are matched by index, so whatever uses them keeps working.
  const existing = objects.filter(object => boundTo(object, targetId))
  const pairs: [GeometryDocumentObject, GeometryDocumentObject][] = []
  const added: GeometryDocumentObject[] = []
  for (const helper of helpers) {
    const constraint = boundTo(helper, fresh.id)
    const match = constraint && existing.find(object => {
      const other = boundTo(object, targetId)!
      const index = (bound: BoundConstraint) => 'pointIndex' in bound ? bound.pointIndex ?? 0 : 'index' in bound ? bound.index : 0
      // The helpers of an image are matched by position whatever transformation made them.
      const kind = (bound: BoundConstraint) => IMAGE_HELPERS.has(bound.type) ? 'image' : bound.type
      return kind(other) === kind(constraint) && index(other) === index(constraint)
    })
    if (match) pairs.push([match, helper])
    else added.push(helper)
  }
  const unmatched = existing.filter(object => !pairs.some(([match]) => match === object))
  for (const object of unmatched) {
    if (collectDependents(objects, [object.id!]).size > 1) {
      return { ok: false, error: 'Bu tanıma bağlı noktalar başka nesnelerde kullanılıyor.' }
    }
  }

  adopt(target, fresh)
  if (fresh.definition) target.definition = fresh.definition
  else delete target.definition
  remapIds(target, fresh.id!, targetId)
  for (const [match, helper] of pairs) {
    remapIds(helper, fresh.id!, targetId)
    adopt(match, helper)
  }
  for (const helper of added) remapIds(helper, fresh.id!, targetId)
  // Matched helpers keep their identity: references to the fresh ones, by ID or as the
  // object's own points, go to them.
  const kept = [target, ...pairs.map(([match]) => match), ...added]
  for (const [match, helper] of pairs) for (const object of kept) remapIds(object, helper.id!, match.id!)
  const swap = new Map<unknown, GeometryDocumentObject>(pairs.map(([match, helper]) => [helper, match]))
  const record = target as unknown as Record<string, unknown>
  for (const key of ['A', 'B', 'C', 'M']) if (swap.has(record[key])) record[key] = swap.get(record[key])
  if (target.type === 'polygon') target.points = target.points.map(point => (swap.get(point) as typeof point | undefined) ?? point)
  return { ok: true, append: added, remove: unmatched.map(object => object.id!) }
}

/**
 * Apply a card's edited text: `name: definition`. A changed name renames the object
 * everywhere; a changed definition replaces its values in place, keeping its identity,
 * color and every reference to it. Nothing changes when an error is returned.
 */
export function redefineObject(objects: readonly GeometryDocumentObject[], target: GeometryDocumentObject,
  text: string, currentText: string, prepare: PrepareCommand): RedefineResult {
  if (target.name === null || target.id === null) return { ok: false, error: 'Bu nesne düzenlenemez.' }
  const edit = splitEditText(text)
  const current = splitEditText(currentText)
  if (!edit.definition) return { ok: false, error: 'Bir tanım girin.' }
  const previousName = target.name
  const name = edit.name ?? previousName
  if (name !== previousName) {
    if (!OBJECT_NAME.test(name) || isReservedName(name)) return { ok: false, error: `Ad olarak kullanılamaz: ${name}` }
    if (objects.some(object => object !== target && object.name === name)) {
      return { ok: false, error: `Bu ad başka bir nesnede kullanılıyor: ${name}` }
    }
  }

  let result: ConstructionResult = { ok: true, append: [], remove: [] }
  if (edit.definition !== current.definition) {
    if (target.type === 'parameter') {
      const parsed = parseCommand(`${previousName}=${edit.definition}`)
      if (!parsed.ok || parsed.command.kind !== 'parameter') {
        return { ok: false, error: 'Parametre bir sayı veya parametrelerden oluşan bir ifade olmalı.' }
      }
      const outcome = redefineParameter(objects, target, parsed.command.value)
      if (!outcome.ok) return outcome
    } else {
      result = redefineConstruction(objects, target, edit.definition, prepare)
      if (!result.ok) return result
    }
  }
  if (name !== previousName) rename([...objects, ...result.append], target, name)
  return { ...result, changedNames: name === previousName ? [name] : [previousName, name] }
}

