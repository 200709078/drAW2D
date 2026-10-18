import { math } from '../math'

interface FunctionScope {
  x: number
}

interface CompiledFunction {
  evaluate(scope: FunctionScope): unknown
}

export interface FunctionEvaluatorOptions {
  maxEntries?: number
  compile?: (expression: string) => CompiledFunction
}

export interface FunctionEvaluator {
  evaluate(expression: string, x: number): number | null
  clear(): void
}

interface CacheEntry {
  compiled: CompiledFunction
  scope: FunctionScope
}

function finiteRealNumber(value: unknown): number | null {
  let numeric: number
  if (typeof value === 'number') {
    numeric = value
  } else if (typeof value === 'bigint') {
    numeric = Number(value)
  } else if (math.isBigNumber(value)) {
    numeric = value.toNumber()
  } else if (math.isFraction(value)) {
    numeric = value.valueOf()
  } else if (math.isComplex(value) && value.im === 0) {
    numeric = value.re
  } else {
    return null
  }
  return Number.isFinite(numeric) ? numeric : null
}

/** Keep compiled expressions outside geometry objects so history remains cloneable. */
export function createFunctionEvaluator(options: FunctionEvaluatorOptions = {}): FunctionEvaluator {
  const maxEntries = options.maxEntries ?? 128
  if (!Number.isSafeInteger(maxEntries) || maxEntries < 1) {
    throw new RangeError('maxEntries must be a positive safe integer')
  }

  const compile = options.compile ?? ((expression: string) => math.compile(expression))
  // Invalid expressions share the same bounded cache instead of being retried per pixel.
  const cache = new Map<string, CacheEntry | null>()

  function findEntry(expression: string): CacheEntry | null {
    let entry = cache.get(expression)
    if (entry !== undefined) {
      cache.delete(expression)
      cache.set(expression, entry)
      return entry
    }

    try {
      entry = { compiled: compile(expression), scope: { x: 0 } }
    } catch {
      entry = null
    }
    cache.set(expression, entry)
    if (cache.size > maxEntries) {
      const oldestExpression = cache.keys().next().value
      if (oldestExpression !== undefined) cache.delete(oldestExpression)
    }
    return entry
  }

  return {
    evaluate(expression, x) {
      if (!Number.isFinite(x)) return null
      const entry = findEntry(expression)
      if (entry === null) return null
      entry.scope.x = x
      try {
        return finiteRealNumber(entry.compiled.evaluate(entry.scope))
      } catch {
        // A domain error at one sample must not suppress the rest of the curve.
        return null
      }
    },
    clear() {
      cache.clear()
    },
  }
}
