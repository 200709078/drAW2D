import { expect, test } from '@playwright/test'
import {
  composeExpressions,
  differentiate,
  evaluateReal,
  linearExpression,
  normalizeReal,
} from '../src/math/function-algebra'
import { math } from '../src/math'

test('bileşke yalnız x değişkenini değiştirir ve exp/max adlarını korur', () => {
  const expression = composeExpressions(['max(exp(x),x^2)', 'x-2'])
  expect(expression).toContain('max(')
  expect(expression).toContain('exp(')
  for (const x of [-1, 2, 4]) {
    expect(evaluateReal(expression, x)).toBeCloseTo(Math.max(Math.exp(x - 2), (x - 2) ** 2), 12)
  }
  expect(evaluateReal(composeExpressions([]), 7)).toBe(7)
})

test('iç içe bileşkeler işlem önceliğini ve log(taban,değer) sözleşmesini korur', () => {
  const expression = composeExpressions(['log(5,x)+1', 'x^2', 'x-3'])
  expect(evaluateReal(expression, 8)).toBeCloseTo(3, 12)
  expect(evaluateReal(composeExpressions(['x^2', '-x-1']), 2)).toBe(9)
  expect(() => composeExpressions(['x+1', ''])).toThrow()
})

test('iki parametreli ve iç içe logaritmaların türevleri taban sırasına uyar', () => {
  const derivative = differentiate('log(5,x)')
  for (const x of [0.5, 1, 5, 12]) {
    expect(evaluateReal(derivative, x)).toBeCloseTo(1 / (x * Math.log(5)), 12)
  }
  const variableBase = differentiate('log(x,5)')
  for (const x of [2, 3, 10]) {
    expect(evaluateReal(variableBase, x)).toBeCloseTo(-Math.log(5) / (x * Math.log(x) ** 2), 12)
  }
  const nested = differentiate('sin(log(5,log(2,x)))')
  for (const x of [3, 8, 15]) {
    const inner = Math.log(x) / Math.log(2)
    const expected = Math.cos(Math.log(inner) / Math.log(5))
      / (inner * Math.log(5) * x * Math.log(2))
    expect(evaluateReal(nested, x)).toBeCloseTo(expected, 12)
  }
})

test('türev önbelleği ifade ve değişkeni ayrı tutar, dolduktan sonra sonuçlar doğrudur', () => {
  const byX = differentiate('x*y+x^2', 'x')
  const byY = differentiate('x*y+x^2', 'y')
  expect(math.evaluate(byX, { x: 3, y: 7 })).toBe(13)
  expect(math.evaluate(byY, { x: 3, y: 7 })).toBe(3)
  expect(differentiate('x*y+x^2', 'x')).toBe(byX)
  for (let index = 1; index <= 130; index++) {
    expect(evaluateReal(differentiate(`x+${index}`), 2)).toBe(1)
  }
  expect(differentiate('x*y+x^2', 'x')).toBe(byX)
  expect(() => differentiate('unsupported(x)')).toThrow()
  expect(() => differentiate('x^2', 'x+1')).toThrow()
})

test('doğru ifadesi küçük katsayıları ve bilimsel gösterimi yuvarlamaz', () => {
  const coefficients: ReadonlyArray<readonly [number, number]> = [
    [0.00001, -0.00003], [-1e-7, 2e-9], [1e21, -1e20],
  ]
  for (const [m, n] of coefficients) {
    const expression = linearExpression(m, n)
    for (const x of [-2, 0, 3]) {
      expect(evaluateReal(expression, x)).toBe(m * x + n)
    }
  }
  expect(linearExpression(0, 0.00001)).toBe('0.00001')
  expect(linearExpression(-1, 0)).toBe('-x')
  expect(() => linearExpression(Infinity, 0)).toThrow(RangeError)
})

test('sayısal sınırlar boş, geçersiz, tanımsız ve gerçek olmayan değerleri reddeder', () => {
  expect(normalizeReal(' -1.25e-3 ')).toBe(-0.00125)
  for (const value of ['', ' ', 'Infinity', '1+2', NaN, Infinity]) {
    expect(() => normalizeReal(value)).toThrow(RangeError)
  }
  for (const expression of ['sqrt(-1)', '1/0', 'unknown+x', '[1,2]', 'x+']) {
    expect(() => evaluateReal(expression, 2)).toThrow(RangeError)
  }
  expect(() => evaluateReal('x', Infinity)).toThrow(RangeError)
  expect(evaluateReal('log(5,x)', 25)).toBeCloseTo(2, 12)
  expect(evaluateReal('log(x)', Math.E)).toBeCloseTo(1, 12)
  expect(evaluateReal('fraction(1,2)', 0)).toBe(0.5)
})
