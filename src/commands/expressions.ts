import type { MathNode } from 'mathjs'
import { math } from '../math'
import type { GeometryDocumentObject } from '../geometry/function-types'
import { composeExpressions } from '../math/function-algebra'

export interface ExpressionOptions {
  variable?: 'x' | 'n'
  references?: readonly GeometryDocumentObject[]
}

type ScalarType = 'number' | 'boolean'
interface ResolvedNode { node: MathNode; type: ScalarType }
interface ReferenceExpression { expression: string; variable: 'x' | 'n' }

const maxLength = 10_000
const maxNodes = 2_048
const maxDepth = 128
const constants = new Set(['e', 'pi'])
const arithmetic = new Set(['add', 'subtract', 'multiply', 'divide', 'pow', 'mod'])
const comparisons = new Set(['equal', 'unequal', 'smaller', 'larger', 'smallerEq', 'largerEq'])
const logical = new Set(['and', 'or', 'xor'])
const unaryNumeric = new Set(['unaryPlus', 'unaryMinus', 'factorial'])

// Every accepted call takes and returns scalars. Vector, unit, evaluator and
// mutation APIs deliberately have no place in a mathematical curve expression.
const functions: Readonly<Record<string, readonly [number, number]>> = {
  abs: [1, 1], acos: [1, 1], acosh: [1, 1], acot: [1, 1], acoth: [1, 1],
  acsc: [1, 1], acsch: [1, 1], asec: [1, 1], asech: [1, 1], asin: [1, 1],
  asinh: [1, 1], atan: [1, 1], atan2: [2, 2], atanh: [1, 1],
  cbrt: [1, 1], ceil: [1, 1], cos: [1, 1], cosh: [1, 1], cot: [1, 1],
  coth: [1, 1], csc: [1, 1], csch: [1, 1], exp: [1, 1], expm1: [1, 1],
  fix: [1, 1], floor: [1, 1], log: [1, 2], log10: [1, 1], log1p: [1, 1],
  log2: [1, 1], nthRoot: [1, 2], round: [1, 2], sec: [1, 1], sech: [1, 1],
  sign: [1, 1], sin: [1, 1], sinh: [1, 1], sqrt: [1, 1], tan: [1, 1],
  tanh: [1, 1], factorial: [1, 1], gamma: [1, 1], lgamma: [1, 1],
  erf: [1, 1],
  gcd: [2, maxNodes], lcm: [2, maxNodes], max: [1, maxNodes], min: [1, maxNodes],
  hypot: [1, maxNodes], pow: [2, 2], mod: [2, 2],
  number: [1, 1],
}

// Combinatorics and exact-number constructors need bounded implementations before
// use here: mathjs can loop indefinitely for large operands in these functions
// or perform costly fraction factorization. AST size alone does not bound that work.

function sourceText(source: string): string {
  if (typeof source !== 'string' || source.trim() === '') {
    throw new TypeError('Matematik ifadesi boş olamaz.')
  }
  const expression = source.trim()
  if (expression.length > maxLength) throw new RangeError('Matematik ifadesi çok uzun.')
  return expression
}

function parse(source: string): MathNode {
  try {
    return math.parse(sourceText(source))
  } catch (error) {
    if (error instanceof RangeError) throw error
    throw new SyntaxError('Matematik ifadesi okunamadı.', { cause: error })
  }
}

function finiteReal(value: unknown): number {
  let numeric: number
  if (typeof value === 'number') numeric = value
  else if (typeof value === 'bigint') numeric = Number(value)
  else if (math.isBigNumber(value)) numeric = value.toNumber()
  else if (math.isFraction(value)) numeric = value.valueOf()
  else if (math.isComplex(value) && value.im === 0) numeric = value.re
  else throw new RangeError('İfade gerçek bir sayı üretmelidir.')
  if (!Number.isFinite(numeric)) throw new RangeError('İfade sonlu bir sayı üretmelidir.')
  return numeric
}

function expressionString(node: MathNode): string {
  // Keep token boundaries (notably word operators) intact. Explicit products
  // remove ambiguity when a named curve has been substituted into the tree.
  return node.toString({ parenthesis: 'auto', implicit: 'show' })
}

function nodeSize(node: MathNode): number {
  let size = 0
  node.traverse(() => {
    if (++size > maxNodes) throw new RangeError('Matematik ifadesi çok karmaşık.')
  })
  return size
}

function replaceVariable(node: MathNode, variable: string, replacement: MathNode): MathNode {
  let occurrences = 0
  node.traverse((child, path, parent) => {
    if (math.isSymbolNode(child) && child.name === variable
      && !(parent && math.isFunctionNode(parent) && path === 'fn')) occurrences++
  })
  const resultSize = nodeSize(node) + occurrences * nodeSize(replacement)
  if (resultSize > maxNodes) throw new RangeError('Bileşke ifadesi çok karmaşık.')
  return node.transform((child, path, parent) => {
    if (math.isSymbolNode(child) && child.name === variable
      && !(parent && math.isFunctionNode(parent) && path === 'fn')) {
      return new math.ParenthesisNode(replacement.cloneDeep())
    }
    return child
  })
}

function referenceExpressions(objects: readonly GeometryDocumentObject[]): Map<string, ReferenceExpression> {
  const result = new Map<string, ReferenceExpression>()
  for (const object of objects) {
    if (object.name === null) continue
    switch (object.type) {
      case 'function': case 'lineWithEquation': case 'functioncomposition':
      case 'limit': case 'tangent': case 'tangentHX':
        result.set(object.name, { expression: object.func, variable: 'x' })
        break
      case 'sequence':
        result.set(object.name, { expression: object.func, variable: 'n' })
        break
      case 'derivative':
        result.set(object.name, { expression: object.func.func, variable: 'x' })
        // A prime name can be used if the expression parser recognizes it as a
        // symbol; the source function always remains the parent's source.
        if (object.derFunc.name !== null) {
          result.set(object.derFunc.name, { expression: object.derFunc.func, variable: 'x' })
        }
        break
    }
  }
  return result
}

function resolve(source: string, options: ExpressionOptions, numeric: boolean): { node: MathNode; changed: boolean } {
  const variable = options.variable ?? 'x'
  const references = referenceExpressions(options.references ?? [])
  let visits = 0
  let changed = false

  function resolveReference(name: string, argument: MathNode, stack: ReadonlySet<string>, depth: number): MathNode {
    const reference = references.get(name)
    if (!reference) throw new ReferenceError(`Bilinmeyen fonksiyon: ${name}`)
    if (stack.has(name)) throw new RangeError('Döngüsel fonksiyon başvurusu kullanılamaz.')
    const nextStack = new Set(stack)
    nextStack.add(name)
    const resolved = visit(parse(reference.expression), reference.variable, nextStack, depth + 1)
    if (resolved.type !== 'number') throw new TypeError('Fonksiyon sayısal bir ifade olmalıdır.')
    changed = true
    return replaceVariable(resolved.node, reference.variable, argument)
  }

  function visit(node: MathNode, activeVariable: 'x' | 'n', stack: ReadonlySet<string>, depth: number): ResolvedNode {
    if (++visits > maxNodes || depth > maxDepth) throw new RangeError('Matematik ifadesi çok karmaşık.')
    if (math.isConstantNode(node)) {
      if (typeof node.value === 'boolean') return { node, type: 'boolean' }
      if (typeof node.value === 'number' || typeof node.value === 'bigint'
        || math.isBigNumber(node.value) || math.isFraction(node.value)) {
        finiteReal(node.value)
        return { node, type: 'number' }
      }
      throw new TypeError('Yalnız sayısal sabitler kullanılabilir.')
    }
    if (math.isSymbolNode(node)) {
      if (!numeric && node.name === activeVariable) return { node, type: 'number' }
      if (constants.has(node.name)) return { node, type: 'number' }
      if (node.name === 'E' || node.name === 'PI') {
        changed = true
        return { node: new math.SymbolNode(node.name === 'E' ? 'e' : 'pi'), type: 'number' }
      }
      if (node.name === 'tau') {
        changed = true
        return { node: new math.OperatorNode('*', 'multiply', [new math.ConstantNode(2), new math.SymbolNode('pi')]), type: 'number' }
      }
      if (!numeric && references.has(node.name)) {
        return { node: resolveReference(node.name, new math.SymbolNode(activeVariable), stack, depth), type: 'number' }
      }
      throw new ReferenceError(`Bilinmeyen simge: ${node.name}`)
    }
    if (math.isParenthesisNode(node)) {
      const child = visit(node.content, activeVariable, stack, depth + 1)
      return { node: new math.ParenthesisNode(child.node), type: child.type }
    }
    if (math.isOperatorNode(node)) {
      const args = node.args.map(child => visit(child, activeVariable, stack, depth + 1))
      const count = args.length
      const numbers = args.every(child => child.type === 'number')
      let type: ScalarType
      if ((arithmetic.has(node.fn) && count === 2 && numbers)
        || (unaryNumeric.has(node.fn) && count === 1 && numbers)) type = 'number'
      else if (comparisons.has(node.fn) && count === 2 && numbers) type = 'boolean'
      else if ((logical.has(node.fn) && count === 2) || (node.fn === 'not' && count === 1)) type = 'boolean'
      else throw new TypeError(`Desteklenmeyen sayısal işlem: ${node.op}`)
      return { node: new math.OperatorNode(node.op, node.fn, args.map(child => child.node), node.implicit), type }
    }
    if (math.isRelationalNode(node)) {
      const args = node.params.map(child => visit(child, activeVariable, stack, depth + 1))
      if (!node.conditionals.every(operator => comparisons.has(operator))
        || !args.every(child => child.type === 'number')) throw new TypeError('Geçersiz karşılaştırma.')
      return { node: new math.RelationalNode(node.conditionals, args.map(child => child.node)), type: 'boolean' }
    }
    if (math.isConditionalNode(node)) {
      const condition = visit(node.condition, activeVariable, stack, depth + 1)
      const whenTrue = visit(node.trueExpr, activeVariable, stack, depth + 1)
      const whenFalse = visit(node.falseExpr, activeVariable, stack, depth + 1)
      if (whenTrue.type !== whenFalse.type) throw new TypeError('Koşul dalları aynı skaler türde olmalıdır.')
      return { node: new math.ConditionalNode(condition.node, whenTrue.node, whenFalse.node), type: whenTrue.type }
    }
    if (math.isFunctionNode(node)) {
      if (!math.isSymbolNode(node.fn)) throw new TypeError('Fonksiyon adı bir simge olmalıdır.')
      const args = node.args.map(child => visit(child, activeVariable, stack, depth + 1))
      if (!args.every(child => child.type === 'number')) throw new TypeError('Fonksiyon bağımsız değişkenleri sayısal olmalıdır.')
      if (!numeric && references.has(node.fn.name)) {
        if (args.length !== 1) throw new TypeError('Adlandırılmış fonksiyon bir bağımsız değişken alır.')
        return { node: resolveReference(node.fn.name, args[0]!.node, stack, depth), type: 'number' }
      }
      const name = node.fn.name === 'ln' ? 'log' : node.fn.name
      const arity = Object.hasOwn(functions, name) ? functions[name] : undefined
      if (!arity || args.length < arity[0] || args.length > arity[1]
        || (node.fn.name === 'ln' && args.length !== 1)) {
        throw new TypeError(`Bilinmeyen fonksiyon veya geçersiz bağımsız değişken sayısı: ${node.fn.name}`)
      }
      if (name !== node.fn.name) changed = true
      return { node: new math.FunctionNode(new math.SymbolNode(name), args.map(child => child.node)), type: 'number' }
    }
    throw new TypeError(`Bu matematik yapısı kullanılamaz: ${node.type}`)
  }

  const resolved = visit(parse(source), variable, new Set(), 0)
  if (resolved.type !== 'number') throw new TypeError('İfade sayısal bir sonuç üretmelidir.')
  nodeSize(resolved.node)
  return { node: resolved.node, changed }
}

/** Parse constants without allocating a geometry object or evaluating variable domains. */
export function parseNumericExpression(source: string): number {
  const { node } = resolve(source, {}, true)
  try {
    return finiteReal(node.compile().evaluate())
  } catch (error) {
    if (error instanceof RangeError) throw error
    throw new RangeError('Sayısal ifade değerlendirilemedi.', { cause: error })
  }
}

/** Validate scalar AST structure; restricted domains remain valid curve expressions. */
export function parseFunctionExpression(source: string, options: ExpressionOptions = {}): string {
  const expression = sourceText(source)
  const resolved = resolve(expression, options, false)
  return resolved.changed ? expressionString(resolved.node) : expression
}

interface Affine { m: number; n: number }

/** Classify by algebra rather than sampling, which confuses x² with x at 0 and 1. */
export function classifyAffineExpression(expression: string): Affine | null {
  const node = parse(parseFunctionExpression(expression))
  function affine(current: MathNode): Affine | null {
    if (math.isParenthesisNode(current)) return affine(current.content)
    if (math.isSymbolNode(current) && current.name === 'x') return { m: 1, n: 0 }
    let containsVariable = false
    current.traverse((child, path, parent) => {
      if (math.isSymbolNode(child) && child.name === 'x'
        && !(parent && math.isFunctionNode(parent) && path === 'fn')) containsVariable = true
    })
    if (!containsVariable) {
      try { return { m: 0, n: finiteReal(current.compile().evaluate()) } } catch { return null }
    }
    if (!math.isOperatorNode(current)) return null
    const left = affine(current.args[0]!)
    if (!left) return null
    if (current.fn === 'unaryPlus') return left
    if (current.fn === 'unaryMinus') return { m: -left.m, n: -left.n }
    if (current.args.length !== 2) return null
    const right = affine(current.args[1]!)
    if (!right) return null
    switch (current.fn) {
      case 'add': return { m: left.m + right.m, n: left.n + right.n }
      case 'subtract': return { m: left.m - right.m, n: left.n - right.n }
      case 'multiply':
        if (left.m !== 0 && right.m !== 0) return null
        return { m: left.m * right.n + right.m * left.n, n: left.n * right.n }
      case 'divide':
        if (right.m !== 0 || right.n === 0) return null
        return { m: left.m / right.n, n: left.n / right.n }
      case 'pow':
        if (right.m !== 0) return null
        if (right.n === 0) return { m: 0, n: 1 }
        if (right.n === 1) return left
        return null
      default: return null
    }
  }
  const result = affine(node)
  return result && Number.isFinite(result.m) && Number.isFinite(result.n) ? result : null
}

/** Resolve each named source before constructing an outer-to-inner composition. */
export function resolveComposition(expressions: readonly string[], options: ExpressionOptions = {}): { expressions: string[]; expression: string } {
  if (expressions.length > maxNodes) throw new RangeError('Bileşke ifadesi çok karmaşık.')
  const resolved = expressions.map(expression => parseFunctionExpression(expression, options))
  const variable = options.variable ?? 'x'
  const sources = variable === 'x' ? resolved : resolved.map(expression => expressionString(
    replaceVariable(parse(expression), 'n', new math.SymbolNode('x')),
  ))
  // Bound expansion before composeExpressions clones a nested tree. Repeated
  // occurrences such as f=x*x otherwise grow exponentially in long chains.
  let expandedSize = 1
  for (let index = sources.length - 1; index >= 0; index--) {
    const source = parse(sources[index]!)
    let occurrences = 0
    source.traverse((child, path, parent) => {
      if (math.isSymbolNode(child) && child.name === 'x'
        && !(parent && math.isFunctionNode(parent) && path === 'fn')) occurrences++
    })
    expandedSize = nodeSize(source) + occurrences * expandedSize
    if (expandedSize > maxNodes) throw new RangeError('Bileşke ifadesi çok karmaşık.')
  }
  const composed = composeExpressions(sources)
  const expression = variable === 'x' ? composed : expressionString(
    replaceVariable(parse(composed), 'x', new math.SymbolNode('n')),
  )
  nodeSize(parse(expression))
  return { expressions: resolved, expression }
}
