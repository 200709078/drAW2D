import type { MathNode } from 'mathjs'
import { math } from '../math'
import type { GeometryDocumentObject } from '../geometry/function-types'
import type { GeometryPoint, Vector, VectorTerm } from '../geometry/types'
import { evaluateNumericExpression, isReservedName, parseMathExpression } from './expressions'

/** `2u - a*v` as its terms; with a point, `A + u` as that point and the terms added to it. */
export interface VectorCombination {
  point: GeometryPoint | null
  /** The vector named first: a resulting vector starts where this one starts. */
  first: Vector
  terms: VectorTerm[]
}

type ValueKind = 'number' | 'vector' | 'point'

const POINT_ERROR = 'Noktaya yalnız vektör eklenip çıkarılabilir (ör. A+u).'

function sumKind(left: ValueKind, right: ValueKind, subtract: boolean): ValueKind {
  if (left === right && left !== 'point') return left
  if (left === 'point' && right === 'vector') return 'point'
  if (left === 'vector' && right === 'point' && !subtract) return 'point'
  throw new Error(left === 'point' || right === 'point' ? POINT_ERROR : 'Vektörle sayı toplanamaz.')
}

function productKind(left: ValueKind, right: ValueKind): ValueKind {
  if (left === 'point' || right === 'point') throw new Error(POINT_ERROR)
  if (left === 'vector' && right === 'vector') throw new Error('İki vektör çarpılamaz; bir vektör sayıyla çarpılır.')
  return left === 'vector' ? left : right
}

/** What the expression is; a fault in it is reported here, in the terms of vectors. */
function valueKind(node: MathNode, names: ReadonlyMap<string, ValueKind>): ValueKind {
  const kind = (child: MathNode) => valueKind(child, names)
  if (math.isParenthesisNode(node)) return kind(node.content)
  if (math.isSymbolNode(node)) return names.get(node.name) ?? 'number'
  if (math.isOperatorNode(node)) {
    const [left, right] = node.args.map(kind) as [ValueKind, ValueKind | undefined]
    if (right === undefined && (node.fn === 'unaryMinus' || node.fn === 'unaryPlus')) {
      if (left === 'point') throw new Error(POINT_ERROR)
      return left
    }
    if (right !== undefined && (node.fn === 'add' || node.fn === 'subtract')) return sumKind(left, right, node.fn === 'subtract')
    if (right !== undefined && node.fn === 'multiply') return productKind(left, right)
    if (right !== undefined && node.fn === 'divide') {
      if (right !== 'number') throw new Error('Bir sayı vektöre bölünemez.')
      return productKind(left, right)
    }
  }
  const parts: ValueKind[] = []
  node.forEach(child => parts.push(kind(child)))
  if (parts.some(part => part !== 'number')) throw new Error('Vektörlerle toplama, çıkarma ve sayıyla çarpma yapılır.')
  return 'number'
}

/**
 * The expression as a combination of the vectors it names, or null when it names none
 * (it is then an ordinary expression). Parameters take their current values, so the
 * terms are recomputed when one changes; the vectors themselves are read live.
 */
export function vectorCombination(source: string, objects: readonly GeometryDocumentObject[]): VectorCombination | null {
  const tokens = [...source.matchAll(/[\p{L}_][\p{L}\p{N}_]*/gu)].map(match => match[0])
  if (tokens.includes('x') || tokens.includes('y')) return null
  const named = (type: string) => tokens.flatMap(token => objects.filter(object => object.type === type
    && object.name === token && !isReservedName(token)))
  const vectors = [...new Set(named('vector'))] as Vector[]
  if (!vectors.length) return null
  const points = [...new Set(named('point'))] as GeometryPoint[]
  const names = new Map<string, ValueKind>([
    ...vectors.map(vector => [vector.name!, 'vector'] as const),
    ...points.map(point => [point.name!, 'point'] as const),
  ])

  const node = parseMathExpression(source)
  valueKind(node, names)
  const coefficient = (vector: Vector) => {
    // The expression is linear in its vectors, so one vector set to 1 leaves its coefficient.
    const unit = node.transform((child, path, parent) => math.isSymbolNode(child) && names.has(child.name)
      && !(parent && math.isFunctionNode(parent) && path === 'fn')
      ? new math.ConstantNode(child.name === vector.name ? 1 : 0) : child)
    return evaluateNumericExpression(unit.toString(), { references: objects }).value
  }
  return {
    point: points[0] ?? null,
    first: vectors[0]!,
    terms: vectors.map(vector => ({ vectorId: vector.id, coefficient: coefficient(vector) })),
  }
}
