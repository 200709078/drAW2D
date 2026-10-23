import type { EvalFunction, MathNode } from 'mathjs'
import { math } from '../math'

const cacheLimit = 128
const derivatives = new Map<string, string>()
const compiledExpressions = new Map<string, EvalFunction>()

function remember<Value>(cache: Map<string, Value>, key: string, value: Value): Value {
  cache.delete(key)
  cache.set(key, value)
  if (cache.size > cacheLimit) {
    const oldestKey = cache.keys().next().value
    if (oldestKey !== undefined) cache.delete(oldestKey)
  }
  return value
}

function expressionText(expression: string): string {
  if (typeof expression !== 'string' || expression.trim() === '') {
    throw new TypeError('Fonksiyon ifadesi boş olamaz.')
  }
  return expression.trim()
}

// Explicit multiplication makes removing optional whitespace safe (2 x -> 2*x).
// Keep whitespace separating word operators, and all whitespace inside strings.
function expressionString(node: MathNode): string {
  const source = node.toString({ parenthesis: 'auto', implicit: 'show' })
  let result = ''
  let quote: string | null = null
  let escaped = false
  for (let index = 0; index < source.length; index++) {
    const character = source[index]!
    if (quote !== null) {
      result += character
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === quote) quote = null
    } else if (character === '"' || character === "'") {
      quote = character
      result += character
    } else if (/\s/u.test(character)) {
      let nextIndex = index + 1
      while (nextIndex < source.length && /\s/u.test(source[nextIndex]!)) nextIndex++
      const previous = result.at(-1) ?? ''
      const next = source[nextIndex] ?? ''
      if (/[\p{L}\p{N}_$]/u.test(previous) && /[\p{L}\p{N}_$]/u.test(next)) result += ' '
      index = nextIndex - 1
    } else {
      result += character
    }
  }
  return result
}

/** Compose outer-to-inner expressions without replacing letters in exp/max. */
export function composeExpressions(expressions: readonly string[]): string {
  let composed: MathNode = new math.SymbolNode('x')
  for (let index = expressions.length - 1; index >= 0; index--) {
    const expression = math.parse(expressionText(expressions[index]!))
    const inner = composed
    composed = expression.transform((node, path, parent) => {
      if (math.isSymbolNode(node) && node.name === 'x'
        && !(parent && math.isFunctionNode(parent) && path === 'fn')) {
        return new math.ParenthesisNode(inner.cloneDeep())
      }
      return node
    })
  }
  return expressionString(composed)
}

// mathjs differentiates its built-in log(value, base), while this application
// evaluates log(base, value). Rewrite every nested call to natural logarithms.
function normalizeLogarithms(node: MathNode): MathNode {
  const rewritten = node.map(child => normalizeLogarithms(child))
  if (math.isFunctionNode(rewritten) && math.isSymbolNode(rewritten.fn)
    && rewritten.fn.name === 'log' && rewritten.args.length === 2) {
    const base = rewritten.args[0]!
    const value = rewritten.args[1]!
    return new math.OperatorNode('/', 'divide', [
      new math.FunctionNode(new math.SymbolNode('log'), [value]),
      new math.FunctionNode(new math.SymbolNode('log'), [base]),
    ])
  }
  return rewritten
}

/** Cached symbolic derivatives remain outside the cloneable document graph. */
export function differentiate(expression: string, variable = 'x'): string {
  const source = expressionText(expression)
  const symbol = math.parse(expressionText(variable))
  if (!math.isSymbolNode(symbol)) throw new TypeError('Türev değişkeni bir simge olmalıdır.')
  const key = JSON.stringify([symbol.name, source])
  const cached = derivatives.get(key)
  if (cached !== undefined) return remember(derivatives, key, cached)
  const derivative = math.derivative(normalizeLogarithms(math.parse(source)), symbol.name)
  return remember(derivatives, key, expressionString(derivative))
}

/** Store full numeric precision; display rounding belongs to the UI. */
export function linearExpression(m: number, n: number): string {
  const slope = normalizeReal(m)
  const intercept = normalizeReal(n)
  if (slope === 0) return String(intercept)
  const term = slope === 1 ? 'x' : slope === -1 ? '-x' : `(${slope})*x`
  if (intercept === 0) return term
  return term + (intercept > 0 ? '+' : '') + String(intercept)
}

export function normalizeReal(value: number | string): number {
  if (typeof value !== 'number' && typeof value !== 'string') {
    throw new TypeError('Sonlu bir gerçek sayı gereklidir.')
  }
  if (typeof value === 'string' && value.trim() === '') {
    throw new RangeError('Boş metin bir sayı değildir.')
  }
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) throw new RangeError('Sonlu bir gerçek sayı gereklidir.')
  return numeric
}

function realResult(value: unknown): number {
  let numeric: number
  if (typeof value === 'number') numeric = value
  else if (typeof value === 'bigint') numeric = Number(value)
  else if (math.isBigNumber(value)) numeric = value.toNumber()
  else if (math.isFraction(value)) numeric = value.valueOf()
  else if (math.isComplex(value) && value.im === 0) numeric = value.re
  else throw new RangeError('İfade gerçek bir sayı üretmedi.')
  if (!Number.isFinite(numeric)) throw new RangeError('İfade sonlu bir sayı üretmedi.')
  return numeric
}

/** A compiled f(x) that returns null where the expression is undefined or not finite. */
export function realEvaluator(expression: string): (x: number) => number | null {
  const source = expressionText(expression)
  let compiled = compiledExpressions.get(source)
  if (compiled === undefined) compiled = remember(compiledExpressions, source, math.compile(source))
  const scope = { x: 0 }
  return x => {
    if (!Number.isFinite(x)) return null
    scope.x = x
    try {
      return realResult(compiled.evaluate(scope))
    } catch {
      return null
    }
  }
}

export function evaluateReal(expression: string, x: number): number {
  const source = expressionText(expression)
  const value = normalizeReal(x)
  try {
    const cached = compiledExpressions.get(source)
    const compiled = cached === undefined
      ? remember(compiledExpressions, source, math.compile(source))
      : remember(compiledExpressions, source, cached)
    return realResult(compiled.evaluate({ x: value }))
  } catch (error) {
    if (error instanceof RangeError) throw error
    throw new RangeError('Fonksiyon verilen noktada değerlendirilemedi.', { cause: error })
  }
}
