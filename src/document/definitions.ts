import { definitionNames } from '../commands/definition'
import { evaluateNumericExpression } from '../commands/expressions'
import type { PreparedCommand } from '../commands/prepare'
import type { Command, NumberArgument } from '../commands/types'
import { vectorCombination } from '../commands/vector-expressions'
import type { GeometryDocumentObject, Parameter } from '../geometry/function-types'

export type PrepareCommand = (command: Command) => PreparedCommand

/** Identity, style and the definition itself survive a recomputation. */
const PRESERVED_FIELDS = new Set([
  'id', 'name', 'color', 'visibility', 'size', 'temp', 'lineStyle', 'labelHidden', 'guidesHidden', 'trace', 'definition',
  // A unit circle's chosen values and angle unit are settings, like the line style.
  'show', 'angleUnit',
])

/** Definitions ordered so that every object comes after the names it uses. */
function dependencyOrder(objects: readonly GeometryDocumentObject[]): GeometryDocumentObject[] {
  const byName = new Map<string, GeometryDocumentObject>()
  for (const object of objects) if (object.name !== null) byName.set(object.name, object)
  const ordered: GeometryDocumentObject[] = []
  const visited = new Set<GeometryDocumentObject>()
  const visit = (object: GeometryDocumentObject) => {
    if (visited.has(object)) return
    visited.add(object)
    if (object.definition) {
      for (const name of definitionNames(object.definition, objects)) {
        const dependency = byName.get(name)
        if (dependency) visit(dependency)
      }
      ordered.push(object)
    }
  }
  for (const object of objects) visit(object)
  return ordered
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

/**
 * Embedded helper models (a tangent's line, a secant's points) get random colors when
 * recomputed. Carry the previous colors over, so an unchanged value is an unchanged
 * document and creates no history step.
 */
function carryColors(previous: unknown, next: unknown, seen = new Set<unknown>()): void {
  if (!isRecord(previous) || !isRecord(next) || seen.has(next)) return
  seen.add(next)
  if (typeof previous.color === 'string' && typeof next.color === 'string') next.color = previous.color
  for (const [key, value] of Object.entries(next)) carryColors(previous[key], value, seen)
}

/** Copy freshly prepared values onto the existing model, keeping what others refer to. */
export function adopt(target: GeometryDocumentObject, fresh: GeometryDocumentObject): void {
  const record = target as unknown as Record<string, unknown>
  const previous = { ...record }
  for (const key of Object.keys(record)) if (!PRESERVED_FIELDS.has(key)) delete record[key]
  for (const [key, value] of Object.entries(fresh)) {
    if (PRESERVED_FIELDS.has(key)) continue
    // Shared document objects (a circle's centre point) are referenced, not recreated.
    if (!(isRecord(value) && value === previous[key])) carryColors(previous[key], value)
    record[key] = value
  }
  // Embedded helper models carry the parent's identity.
  if (target.type === 'derivative') {
    for (const curve of [target.func, target.derFunc]) {
      curve.id = target.id
      curve.color = target.color
    }
    target.func.name = target.name
    target.derFunc.name = target.name === null ? null : `${target.name}'`
  } else if (target.type === 'sectionalFunctions') {
    for (const section of target.secFuncs) {
      section.id = target.id
      section.name = target.name
      section.color = target.color
    }
  }
}

const evaluate = (argument: NumberArgument, objects: readonly GeometryDocumentObject[]) =>
  typeof argument === 'number' ? argument : evaluateNumericExpression(argument.expression, { references: objects }).value

/**
 * Definitions whose objects own hidden or named helper points are updated in place:
 * re-preparing them would create new helpers. True when handled here.
 */
function updateInPlace(object: GeometryDocumentObject, definition: Command, objects: readonly GeometryDocumentObject[]): boolean {
  const range = (start: NumberArgument | undefined, end: NumberArgument | undefined, fallback: { start: number; end: number }) => {
    const value = { start: start === undefined ? fallback.start : evaluate(start, objects), end: end === undefined ? fallback.end : evaluate(end, objects) }
    if (!(value.end > value.start)) throw new RangeError('Arama aralığının başlangıcı bitişinden küçük olmalı.')
    return value
  }
  if (object.type === 'point' && (definition.kind === 'root' || definition.kind === 'extremum' || definition.kind === 'inflection'
    || definition.kind === 'intersect')) {
    const constraint = object.onOther.find(item => item.type === 'analysisPoint')
    if (!constraint || constraint.type !== 'analysisPoint') return false
    Object.assign(constraint, range(definition.start, definition.end, constraint))
    return true
  }
  if (object.type === 'asymptote' && definition.kind === 'asymptote') {
    Object.assign(object, range(definition.start, definition.end, object))
    return true
  }
  if (object.type === 'unitCircle' && definition.kind === 'unitCircle') {
    object.angle = evaluate(definition.angle ?? 0, objects)
    return true
  }
  if (definition.kind === 'vectorExpression') {
    // Parameters changed the coefficients; the point or the helper at the tip keeps its place in the document.
    const combination = vectorCombination(definition.expression, objects)
    if (!combination) throw new Error('İfadede vektör bulunamadı.')
    for (const point of objects) {
      if (point.type !== 'point') continue
      for (const constraint of point.onOther) {
        if (constraint.type === 'vectorSum' && (point === object || constraint.ownerId === object.id)) constraint.terms = combination.terms
      }
    }
    return true
  }
  if (object.imageOf?.kind === 'rotate' && definition.kind === 'rotate') {
    const angle = evaluate(definition.angle, objects)
    object.imageOf.angle = angle
    for (const helper of objects) {
      if (helper.type !== 'point') continue
      for (const constraint of helper.onOther) {
        if (constraint.type === 'rotate' && constraint.ownerId === object.id) constraint.angle = angle
      }
    }
    return true
  }
  return false
}

function recompute(object: GeometryDocumentObject, objects: readonly GeometryDocumentObject[], prepare: PrepareCommand): void {
  const definition = object.definition!
  try {
    if (object.type === 'parameter') {
      if (definition.kind !== 'parameter' || typeof definition.value === 'number') return
      object.value = evaluateNumericExpression(definition.value.expression, { references: objects }).value
    } else if (!updateInPlace(object, definition, objects)) {
      const prepared = prepare(definition)
      const fresh = prepared.ok ? prepared.objects.find(candidate => candidate.id === prepared.activeId) : undefined
      if (!fresh) throw new Error(prepared.ok ? 'Tanım nesne üretmedi.' : prepared.error)
      adopt(object, fresh)
    }
    delete object.invalid
  } catch {
    // Keep the last values; the object reappears when its definition is valid again.
    object.invalid = true
  }
}

/**
 * Recompute every object whose definition uses one of the changed names, directly or
 * through other recomputed objects. Without names, every definition is recomputed.
 */
export function recomputeDefinitions(objects: readonly GeometryDocumentObject[], prepare: PrepareCommand,
  changed?: Iterable<string>): void {
  const pending = changed === undefined ? null : new Set(changed)
  for (const object of dependencyOrder(objects)) {
    if (pending && ![...definitionNames(object.definition!, objects)].some(name => pending.has(name))) continue
    recompute(object, objects, prepare)
    if (pending && object.name !== null) pending.add(object.name)
  }
}

/** Does the object named `from` use `target`, directly or through other definitions? */
export function dependsOn(objects: readonly GeometryDocumentObject[], from: string, target: string): boolean {
  const byName = new Map<string, GeometryDocumentObject>()
  for (const object of objects) if (object.name !== null) byName.set(object.name, object)
  const seen = new Set<string>()
  const stack = [from]
  while (stack.length) {
    const name = stack.pop()!
    if (name === target) return true
    if (seen.has(name)) continue
    seen.add(name)
    const definition = byName.get(name)?.definition
    if (definition) stack.push(...definitionNames(definition, objects))
  }
  return false
}

export type ParameterResult = { ok: true } | { ok: false; error: string }

/** `a=3` for an existing parameter: a new value, or a new formula over other parameters. */
export function redefineParameter(objects: readonly GeometryDocumentObject[], parameter: Parameter,
  value: NumberArgument): ParameterResult {
  if (typeof value === 'number') {
    parameter.value = value
    parameter.min = Math.min(parameter.min, value)
    parameter.max = Math.max(parameter.max, value)
    delete parameter.definition
    delete parameter.invalid
    return { ok: true }
  }
  const definition: Command = { kind: 'parameter', name: parameter.name!, value }
  for (const name of definitionNames(definition, objects)) {
    if (dependsOn(objects, name, parameter.name!)) return { ok: false, error: 'Döngüsel parametre tanımı kullanılamaz.' }
  }
  try {
    parameter.value = evaluateNumericExpression(value.expression, { references: objects }).value
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Parametre değeri hesaplanamadı.' }
  }
  parameter.definition = definition
  delete parameter.invalid
  return { ok: true }
}

/** Slider bounds; the value is kept inside them. */
export function setParameterRange(parameter: Parameter, min: number, max: number, step: number): ParameterResult {
  if (![min, max, step].every(Number.isFinite) || min >= max || step <= 0 || step > max - min) {
    return { ok: false, error: 'En küçük değer en büyükten küçük, adım pozitif ve aralıktan küçük olmalı.' }
  }
  parameter.min = min
  parameter.max = max
  parameter.step = step
  parameter.value = Math.min(max, Math.max(min, parameter.value))
  return { ok: true }
}
