import { expect, test } from '@playwright/test'
import { bignumber, complex, fraction } from 'mathjs'
import { math } from '../src/math'
import { createFunctionEvaluator } from '../src/rendering/function-evaluator'

test('aynı ifade bir kez derlenir ve her örnek için aynı kapsamın x değeri güncellenir', () => {
  const compilations: string[] = []
  const scopes: { x: number }[] = []
  const evaluator = createFunctionEvaluator({
    compile(expression) {
      compilations.push(expression)
      const compiled = math.compile(expression)
      return {
        evaluate(scope) {
          scopes.push(scope)
          return compiled.evaluate(scope)
        },
      }
    },
  })

  expect(evaluator.evaluate('x^2', 2)).toBe(4)
  expect(evaluator.evaluate('x^2', -3)).toBe(9)
  expect(evaluator.evaluate('x+1', 2)).toBe(3)
  expect(evaluator.evaluate('x^2', 5)).toBe(25)
  expect(compilations).toEqual(['x^2', 'x+1'])
  expect(scopes[0]).toBe(scopes[1])
  expect(scopes[0]).toBe(scopes[3])
  expect(scopes[2]).not.toBe(scopes[0])
  expect(scopes[0].x).toBe(5)
})

test('sınırlı önbellek en son kullanılan ifadeyi tutar ve temizleme yeniden derletir', () => {
  const compilations: string[] = []
  const evaluator = createFunctionEvaluator({
    maxEntries: 2,
    compile(expression) {
      compilations.push(expression)
      return math.compile(expression)
    },
  })

  evaluator.evaluate('x', 1)
  evaluator.evaluate('x+1', 1)
  evaluator.evaluate('x', 2)
  evaluator.evaluate('x+2', 1)
  evaluator.evaluate('x', 3)
  expect(compilations).toEqual(['x', 'x+1', 'x+2'])
  evaluator.evaluate('x+1', 2)
  expect(compilations).toEqual(['x', 'x+1', 'x+2', 'x+1'])
  evaluator.clear()
  expect(evaluator.evaluate('x+1', 4)).toBe(5)
  expect(compilations).toEqual(['x', 'x+1', 'x+2', 'x+1', 'x+1'])
})

test('derleme hataları da sınırlı önbelleğe alınır ve düzeltilmiş ifade değerlendirilebilir', () => {
  const compilations: string[] = []
  const evaluator = createFunctionEvaluator({
    maxEntries: 2,
    compile(expression) {
      compilations.push(expression)
      return math.compile(expression)
    },
  })

  expect(evaluator.evaluate('sin(', 0)).toBeNull()
  expect(evaluator.evaluate('sin(', 1)).toBeNull()
  expect(compilations).toEqual(['sin('])
  expect(evaluator.evaluate('sin(x)', 0)).toBe(0)
  expect(evaluator.evaluate('x+1', 0)).toBe(1)
  expect(evaluator.evaluate('sin(', 2)).toBeNull()
  expect(compilations).toEqual(['sin(', 'sin(x)', 'x+1', 'sin('])
})

test('gerçek sonlu matematik değerleri sayıya dönüşür; geçersiz örnekler çizilmez', () => {
  const values: Record<string, unknown> = {
    number: -2.5,
    big: bignumber('1.234567890123456789'),
    fraction: fraction(1, 3),
    realComplex: complex(3, 0),
    bigint: 12n,
    imaginary: complex(0, 1),
    nearReal: complex(2, 1e-15),
    nan: NaN,
    infinity: Infinity,
    negativeInfinity: -Infinity,
    largeBig: bignumber('1e1000'),
    complexInfinity: complex(Infinity, 0),
    text: '3',
    boolean: true,
    array: [3],
    null: null,
    object: {},
    coercible: { valueOf: () => 7 },
  }
  const evaluator = createFunctionEvaluator({
    compile: expression => ({ evaluate: () => values[expression] }),
  })

  expect(evaluator.evaluate('number', 0)).toBe(-2.5)
  expect(evaluator.evaluate('big', 0)).toBeCloseTo(1.2345678901234567)
  expect(evaluator.evaluate('fraction', 0)).toBeCloseTo(1 / 3)
  expect(evaluator.evaluate('realComplex', 0)).toBe(3)
  expect(evaluator.evaluate('bigint', 0)).toBe(12)
  for (const name of [
    'imaginary', 'nearReal', 'nan', 'infinity', 'negativeInfinity', 'largeBig',
    'complexInfinity', 'text', 'boolean', 'array', 'null', 'object', 'coercible',
  ]) {
    expect(evaluator.evaluate(name, 0), name).toBeNull()
  }
})

test('tanım alanı ve değerlendirme hataları sonraki geçerli örneği engellemez', () => {
  const evaluator = createFunctionEvaluator()
  expect(evaluator.evaluate('sqrt(x)', -1)).toBeNull()
  expect(evaluator.evaluate('sqrt(x)', 4)).toBe(2)
  expect(evaluator.evaluate('1/x', 0)).toBeNull()
  expect(evaluator.evaluate('1/x', 2)).toBe(0.5)
  expect(evaluator.evaluate('log(x)', -1)).toBeNull()
  expect(evaluator.evaluate('log(x)', 1)).toBe(0)

  let compilations = 0
  const throwing = createFunctionEvaluator({
    compile() {
      compilations++
      return {
        evaluate(scope) {
          if (scope.x < 0) throw new Error('Tanım alanı dışında')
          return scope.x
        },
      }
    },
  })
  expect(throwing.evaluate('domain(x)', -1)).toBeNull()
  expect(throwing.evaluate('domain(x)', 3)).toBe(3)
  expect(compilations).toBe(1)
})

test('sonlu olmayan x değerleri değerlendirilmez ve önbellek sınırı doğrulanır', () => {
  let compilations = 0
  const evaluator = createFunctionEvaluator({
    compile() {
      compilations++
      return { evaluate: scope => scope.x }
    },
  })
  for (const x of [NaN, Infinity, -Infinity]) {
    expect(evaluator.evaluate('x', x)).toBeNull()
  }
  expect(compilations).toBe(0)
  for (const maxEntries of [0, -1, 0.5, NaN, Infinity]) {
    expect(() => createFunctionEvaluator({ maxEntries })).toThrow(RangeError)
  }
})
