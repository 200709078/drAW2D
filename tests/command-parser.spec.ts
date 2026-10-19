import { expect, test } from '@playwright/test'
import { parseCommand, splitTopLevel } from '../src/commands/parser'
import type { Command } from '../src/commands/types'

function command(source: string): Command {
  const result = parseCommand(source)
  if (!result.ok) throw new Error(result.error)
  return result.command
}

test('iç içe matematik çağrıları tek parametre kalır, sayısal ifadeler bir kez normalleştirilir', () => {
  expect(command('Limit(log(2, 1 + x^2), pi / 2)')).toEqual({
    kind: 'limit', expression: 'log(2, 1 + x^2)', at: Math.PI / 2,
  })
  expect(command('(log(2, 8), sqrt(4) / 2)')).toEqual({ kind: 'point', point: { a: 3, b: 1 } })
  expect(command('Dizi(log(2, n), 1+1, 2^3)')).toEqual({
    kind: 'sequence', expression: 'log(2, n)', start: 2, end: 8,
  })
  expect(command('Bileşke(log(2, x), sin(x + 1))')).toEqual({
    kind: 'composition', expressions: ['log(2, x)', 'sin(x + 1)'],
  })
})

test('Türkçe büyük harfler ve ASCII adlar aynı veri komutunu üretir', () => {
  expect(command('DOĞRUPARÇASI(A, B′)')).toEqual({
    kind: 'segment', A: { kind: 'reference', name: 'A' }, B: { kind: 'reference', name: 'B′' },
  })
  expect(command("DistanceSegment(A', (1, 2))")).toEqual({
    kind: 'distance', A: { kind: 'reference', name: "A'" }, B: { kind: 'coordinates', a: 1, b: 2 },
  })
  expect(command('TEGETH(x^2, log(2,8))')).toEqual({ kind: 'tangentH', expression: 'x^2', at: 3 })
  expect(command('YAYÖLÇÜSÜ(A,B)')).toEqual({ kind: 'arc', A: 'A', B: 'B' })
  expect(command('Kesiştir(f,g)')).toEqual({ kind: 'intersect', first: 'f', second: 'g' })
  expect(command("Doğru(A'1,B)")).toMatchObject({ kind: 'line', A: { kind: 'reference', name: "A'1" } })
})

test('çember nokta başvurusu, koordinat ve sabit yarıçapı birbirinden ayırır', () => {
  expect(command('Çember(A,B)')).toEqual({
    kind: 'circle2', A: { kind: 'reference', name: 'A' }, B: { kind: 'reference', name: 'B' },
  })
  expect(command('Cember(A, (log(2,8)))')).toEqual({
    kind: 'circleRadius', center: { kind: 'reference', name: 'A' }, radius: 3,
  })
  expect(command('Çember((0,0), (1)+(2))')).toEqual({
    kind: 'circleRadius', center: { kind: 'coordinates', a: 0, b: 0 }, radius: 3,
  })
  expect(command('Çember(A,(1,2),C)')).toEqual({
    kind: 'circle3', A: { kind: 'reference', name: 'A' },
    B: { kind: 'coordinates', a: 1, b: 2 }, C: { kind: 'reference', name: 'C' },
  })
})

test('parçalı fonksiyonlar ters yönlü ve sabit ifadeli sınırların açıklığını korur', () => {
  const source = 'log(2, x), 3 > x >= 1; sin(x), x >= pi'
  expect(command(source)).toEqual({ kind: 'piecewise', source, sections: [
    { expression: 'log(2, x)', startX: 1, endX: 3, startInclusive: true, endInclusive: false },
    { expression: 'sin(x)', startX: Math.PI, endX: null, startInclusive: true, endInclusive: false },
  ] })
  expect(command('x^2, log(2,8) < x <= 2^3')).toMatchObject({ sections: [
    { startX: 3, endX: 8, startInclusive: false, endInclusive: true },
  ] })
  expect(command('7, x = log(2,8)')).toMatchObject({ sections: [
    { startX: 3, endX: 3, startInclusive: true, endInclusive: true },
  ] })
})

test('eksik, artan ve dengesiz parametreler bilinen komuttan fonksiyona düşmez', () => {
  for (const source of [
    'Doğru((0,0),(1,1)', 'Doğru((0,0),(1,1)))', 'Doğru((0,0),(1,1))+2',
    'Doğru((0,0),(1,1),)', 'Çember((0,0),)', 'Bileşke(x,,x^2)', 'Bileşke()',
    'Teğet(x^2)', 'Dizi(n,1,4,5)', 'Türev', 'x, x<0;',
  ]) {
    expect(parseCommand(source), source).toMatchObject({ ok: false, error: expect.any(String) })
  }
  expect(() => splitTopLevel('log(2,x), (1,2),')).toThrow()
  expect(() => splitTopLevel('([)]')).toThrow()
  expect(splitTopLevel('log(2,x), (1,2), A′')).toEqual(['log(2,x)', '(1,2)', 'A′'])
})

test('sayısal alanlar sonlu gerçek değer ve anlamlı indis/aralık gerektirir', () => {
  for (const source of [
    '(x,1)', '(sqrt(-1),0)', 'Çember(A,-1)', 'Çember(A,1/0)',
    'Dizi(n,0,2)', 'Dizi(n,1.5,3)', 'Dizi(n,4,2)', 'Limit(x,undefinedName)',
    'x, 3<x<1', 'x, 1<x<=1', 'x, 1<x>2', 'x, x==2', 'x, 1<y<2',
  ]) {
    expect(parseCommand(source), source).toMatchObject({ ok: false })
  }
})

test('çıplak ve y eşitlikli ifadeler sınıflandırma için değiştirilmeden bırakılır', () => {
  for (const expression of ['2x + 3', 'sin( x + 1 )', '(x + 1)+(x - 1)', '1 2', 'constructor(x)']) {
    expect(command(expression)).toEqual({ kind: 'function', expression })
  }
  expect(command(' y = x ')).toEqual({ kind: 'function', expression: 'x' })
  expect(command('x = y')).toEqual({ kind: 'function', expression: 'x' })
  expect(command('sin(x) = y')).toEqual({ kind: 'function', expression: 'sin(x)' })
  expect(command('y = x <= 0 ? -x : x')).toEqual({ kind: 'function', expression: 'x <= 0 ? -x : x' })
  expect(command('x < 0 ? -x : x')).toEqual({ kind: 'function', expression: 'x < 0 ? -x : x' })
  expect(command('pi / 2 = x')).toEqual({ kind: 'verticalLine', x: Math.PI / 2 })
})

test('ayrıştırılmış komutlar belge veya DOM gerektirmeyen kopyalanabilir düz veridir', () => {
  const source = 'YansıtNokta((1+2,log(2,8)), O)'
  const first = command(source)
  expect(first).toEqual({
    kind: 'reflect', point: { kind: 'coordinates', a: 3, b: 3 }, center: { kind: 'reference', name: 'O' },
  })
  expect(structuredClone(first)).toEqual(first)
  expect(command(source)).toEqual(first)
})
