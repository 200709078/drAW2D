import { expect, test } from '@playwright/test'
import {
  classifyAffineExpression,
  parseFunctionExpression,
  parseNumericExpression,
  resolveComposition,
} from '../src/commands/expressions'
import type { FunctionCurve, Derivative, Sequence } from '../src/geometry/function-types'
import { math } from '../src/math'

function curve(name: string, func: string): FunctionCurve {
  return { type: 'function', name, func, startX: null, endX: null,
    id: 1, color: '#123456', visibility: true, size: 2, temp: false }
}

function value(expression: string, x: number): unknown {
  return math.evaluate(expression, { x })
}

test('sabit matematik ifadeleri log(taban,değer) ve gerçek sayısal türleri destekler', () => {
  expect(parseNumericExpression('  pi / 2  ')).toBe(Math.PI / 2)
  expect(parseNumericExpression('log(2, 8)')).toBe(3)
  expect(parseNumericExpression('ln(E)+PI-pi')).toBe(1)
  expect(parseNumericExpression('tau / 2')).toBe(Math.PI)
  expect(parseNumericExpression('fraction(1, 3)')).toBe(1 / 3)
  expect(parseNumericExpression('bignumber(1.25)')).toBe(1.25)
  expect(parseNumericExpression('max(2,3)+5!')).toBe(123)
  expect(parseNumericExpression('1 < 2 ? 3 : 4')).toBe(3)
})

test('sayısal girişler sonlu gerçek sonuç gerektirir ve değişkenleri reddeder', () => {
  for (const expression of ['', ' ', 'x+1', 'n', 'unknown', 'g', 'f', 'Infinity',
    'NaN', '1/0', 'sqrt(-1)', 'true', '1 < 2', 'false or true']) {
    expect(() => parseNumericExpression(expression), expression).toThrow()
  }
})

test('fonksiyon yapısı örnek bir x noktasının tanım alanına bağlı değildir', () => {
  for (const expression of ['sqrt(x-1000)', 'log(-x-10)', '1/(x-1)', 'tan(x)',
    'log(2,x)', 'cot(x)', 'min(x, 2*x)', 'abs(x)', 'fraction(1,2)*x', '2 x']) {
    expect(parseFunctionExpression(expression)).toBe(expression)
  }
  expect(value(parseFunctionExpression('ln(x)'), Math.E)).toBe(1)
  expect(value(parseFunctionExpression('E*x+PI'), 2)).toBe(2 * Math.E + Math.PI)
})

test('fonksiyonlarda sayısal koşul dalları ve mantıksal sınırlar skaler kalır', () => {
  const absolute = parseFunctionExpression('x < 0 ? -x : x')
  expect(value(absolute, -3)).toBe(3)
  expect(value(absolute, 2)).toBe(2)
  const bounded = parseFunctionExpression('(-1 < x < 1) and (x != 0) ? x^2 : 0')
  expect(value(bounded, 0.5)).toBe(0.25)
  expect(value(bounded, 2)).toBe(0)
  for (const expression of ['x<0', 'x and 1', 'x ? true : 1', 'sin(x<0)']) {
    expect(() => parseFunctionExpression(expression), expression).toThrow()
  }
})

test('atama, veri yapısı, özellik erişimi, birim ve dolaylı değerlendirme girişleri reddedilir', () => {
  for (const expression of ['x=2', 'f(x)=x+1', '1;2', '[1,2]', '{a:1}',
    'x[1]', 'x.a', '2 cm', 'evaluate("x")', 'parse("x")', 'import(1)',
    '"1"', 'sqrt()', 'sin(x, 2)', 'ln(2,8)', 'unknown(x)', 'constructor(x)',
    'toString(x)', 'sum(x)', 'map(x, sin)']) {
    expect(() => parseFunctionExpression(expression), expression).toThrow()
    expect(() => parseNumericExpression(expression), expression).toThrow()
  }
})

test('boşluklar belirteç sınırlarını korur, farklı simgeler sessizce birleştirilmez', () => {
  expect(parseFunctionExpression('  2 x + 1  ')).toBe('2 x + 1')
  expect(() => parseFunctionExpression('s in(x)')).toThrow()
  expect(() => parseFunctionExpression('p i')).toThrow()
  expect(value(parseFunctionExpression('x mod 3'), 5)).toBe(2)
})

test('adlandırılmış fonksiyonlar tam simge ve çağrı başvurularıyla çözülür', () => {
  const references = [curve('f', 'x^2+1'), curve('g', '2*x')]
  const bare = parseFunctionExpression('f+g+exp(x)+max(x,2)', { references })
  expect(value(bare, 3)).toBe(10 + 6 + Math.exp(3) + 3)
  const call = parseFunctionExpression('f(g(x-1))+f(2*x)', { references })
  expect(value(call, 3)).toBe(17 + 37)
  expect(() => parseFunctionExpression('ff+1', { references })).toThrow()
  expect(() => parseFunctionExpression('g+x')).toThrow()
  expect(() => parseFunctionExpression('f(x,2)', { references })).toThrow()
})

test('türev modelinin ana adı kaynak fonksiyonu gösterir', () => {
  const source = curve('f', 'x^3')
  const derivative: Derivative = {
    type: 'derivative', id: 2, name: 'f', color: '#123456', visibility: true,
    size: 2, temp: false, lineDash: [], func: source, derFunc: curve("f'", '3*x^2'),
  }
  expect(value(parseFunctionExpression('f', { references: [derivative] }), 2)).toBe(8)
  expect(value(parseFunctionExpression('f(x+1)', { references: [derivative] }), 2)).toBe(27)
})

test('dizi değişkeni n ve fonksiyon başvurularındaki x dönüşümü AST üzerinden yapılır', () => {
  const sequence: Sequence = {
    type: 'sequence', id: 2, name: 's', color: '#123456', visibility: true,
    size: 2, temp: false, func: 'n+3', start: 1, end: 5,
  }
  const expression = parseFunctionExpression('f+s+max(n,2)', {
    variable: 'n', references: [curve('f', 'exp(x)+x'), sequence],
  })
  expect(math.evaluate(expression, { n: 2 })).toBe(Math.exp(2) + 2 + 5 + 2)
  expect(() => parseFunctionExpression('x+1', { variable: 'n' })).toThrow()
  expect(() => parseFunctionExpression('n+1')).toThrow()
})

test('döngüsel adlandırılmış ifadeler ve aşırı karmaşık girişler reddedilir', () => {
  expect(() => parseFunctionExpression('f', { references: [curve('f', 'g+1'), curve('g', 'f+1')] })).toThrow()
  expect(() => parseFunctionExpression('x'.repeat(10_001))).toThrow()
  expect(() => parseFunctionExpression(Array.from({ length: 1_100 }, () => 'x').join('+'))).toThrow()
})

test('doğrusallık katsayıları AST cebriyle, tam sayısal hassasiyetle bulunur', () => {
  const cases: ReadonlyArray<readonly [string, number, number]> = [
    ['2*(x+1)', 2, 2], ['x/2', 0.5, 0], ['2*x', 2, 0], ['x+x', 2, 0],
    ['2+3x', 3, 2], ['1e-9*x+2e-11', 1e-9, 2e-11], ['-x+pi', -1, Math.PI],
    ['(x-x+2)*x', 2, 0], ['x/(x-x+2)', 0.5, 0], ['x^1+3', 1, 3],
    ['x^0', 0, 1], ['sin(pi/2)*x', 1, 0], ['2+3', 0, 5],
  ]
  for (const [expression, m, n] of cases) {
    expect(classifyAffineExpression(expression), expression).toEqual({ m, n })
  }
})

test('doğrusallık tahmini doğrusal olmayan veya tanımsız cebri iptal etmez', () => {
  for (const expression of ['x^2', 'x/x', 'x^2-x^2', '0*(1/x)', 'sin(x)',
    '1/(x+1)', 'sqrt(x)', 'x^3', 'abs(x)', 'x<0 ? -x : x', 'x/0', 'x*1e308*1e308']) {
    expect(classifyAffineExpression(expression), expression).toBeNull()
  }
})

test('bileşke AST ile dıştan içe kurulur ve adlandırılmış kaynaklar saklanır', () => {
  const result = resolveComposition(['f', 'g', 'x-3'], {
    references: [curve('f', 'max(exp(x),x^2)'), curve('g', 'x+2')],
  })
  expect(result.expressions).toHaveLength(3)
  expect(value(result.expression, 5)).toBe(Math.max(Math.exp(4), 16))
  expect(result.expression).toContain('exp(')
  expect(result.expression).toContain('max(')
  expect(resolveComposition([])).toEqual({ expressions: [], expression: 'x' })
  expect(() => resolveComposition(Array.from({ length: 20 }, () => 'x*x'))).toThrow()
  const sequence = resolveComposition(['n^2', 'n+1'], { variable: 'n' })
  expect(math.evaluate(sequence.expression, { n: 2 })).toBe(9)
})
