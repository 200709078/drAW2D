import { expect, test } from '@playwright/test'
import { createFunctionModels } from '../src/geometry/function-models'
import { createGeometryModels } from '../src/geometry/models'
import { evaluateReal } from '../src/math/function-algebra'

function fixture() {
  const allocations = { names: [] as string[], ids: 0, colors: 0 }
  const allocationContext = {
    createName(group: string) {
      allocations.names.push(group)
      return `${group}-${allocations.names.length}`
    },
    nextId: () => allocations.ids++,
    randomColor: () => `#${(++allocations.colors).toString(16).padStart(6, '0')}`,
  }
  const basic = createGeometryModels(allocationContext)
  const models = createFunctionModels({
    ...allocationContext,
    createPoint: (a, b, temp) => new basic.mPoint(a, b, temp),
    createLineWithPoints: (A, B, temp) => new basic.mLineWithPoints(A, B, temp),
  })
  return { models, allocations }
}

test('geçici modeller ad ve kimlik tüketmez; bileşik belge grafiği geçmişe kopyalanabilir', () => {
  const { models, allocations } = fixture()
  const curve = new models.mFunction('x^2', true, 0, 2)
  const line = new models.mLineWithEquation(1, 2, true, 2, 4)
  const temporary = [
    curve, line,
    new models.mVerLine(1, true),
    new models.mSequence('n^2', 1, 3, true),
    new models.mLimit('1/x', 0, true),
    new models.mFunctionComposition(['x+1', 'x^2'], true),
    new models.mTangent('x^2', 1, true),
    new models.mTangentHX('x^2', 1, true, true),
    new models.mDerivative('x^2', true),
    new models.mSectionalFunctions('x^2,0,2', [], true),
  ]
  expect(temporary.every(model => model.id === null && model.name === null)).toBe(true)
  expect(allocations.ids).toBe(0)
  expect(allocations.names).toEqual([])

  const derivative = new models.mDerivative('x^3')
  const sections = [curve, line]
  const sectional = new models.mSectionalFunctions('x^2,0,2; x+2,2,4', sections)
  expect(allocations.ids).toBe(2)
  expect(allocations.names).toEqual(['derivative', 'function'])
  expect(derivative.func.id).toBe(derivative.id)
  expect(derivative.derFunc.id).toBe(derivative.id)
  expect(derivative.derFunc.name).toBe(`${derivative.name}'`)
  expect(derivative.func.func).toBe('x^3')
  expect(typeof derivative.func.func).toBe('string')
  expect(sectional.secFuncs).toBe(sections)
  expect(sections.every(section => section.id === sectional.id && section.color === sectional.color)).toBe(true)

  const copied = structuredClone({ derivative, sectional, sections })
  expect(copied.sectional.secFuncs).toBe(copied.sections)
  expect(copied.sections[0]).not.toBe(curve)
  expect(copied.derivative).toEqual(derivative)
  expect(Object.getPrototypeOf(copied.derivative)).toBe(Object.prototype)
  copied.sections[0]!.color = '#ffffff'
  expect(copied.sectional.secFuncs[0]!.color).toBe('#ffffff')
  expect(curve.color).toBe(sectional.color)
})

test('sayısal metinler normalize edilir ve küçük doğru katsayıları çizim hesabında yuvarlanmaz', () => {
  const { models } = fixture()
  const line = new models.mLineWithEquation('1e-7', '2e-7', false, '-2.5', '4')
  expect([line.m, line.n, line.startX, line.endX]).toEqual([1e-7, 2e-7, -2.5, 4])
  expect(evaluateReal(line.func, 10_000_000)).toBeCloseTo(1.0000002, 12)
  expect(new models.mVerLine('1e-7').x).toBe(1e-7)
  const sequence = new models.mSequence('n^2', '1', '4')
  expect([sequence.start, sequence.end]).toEqual([1, 4])
  const limit = new models.mLimit('x^2', '2.5')
  expect([limit.approachVal, limit.approachValRight, limit.approachValLeft]).toEqual([2.5, 2.9, 2.1])
})

test('log(taban,değer) türevi ve teğetinin sayısal eğimi uygulamanın matematik sözleşmesini izler', () => {
  const { models } = fixture()
  const derivative = new models.mDerivative('log(2,x)')
  const tangent = new models.mTangent('log(2,x)', '4')
  const slope = 1 / (4 * Math.log(2))
  expect(evaluateReal(derivative.func.func, 4)).toBeCloseTo(2, 12)
  expect(evaluateReal(derivative.derFunc.func, 4)).toBeCloseTo(slope, 12)
  expect(tangent.approachVal).toBe(4)
  expect(tangent.tngLine.m).toBeCloseTo(slope, 12)
  expect(tangent.tngLine.n).toBeCloseTo(2 - 4 * slope, 12)
  expect(evaluateReal(tangent.tngLine.func, 4)).toBeCloseTo(2, 12)
})

test('teğet sürgüleri çizgi/nokta başvurularını ve metaveriyi korur; aynı güncelleme belgeyi değiştirmez', () => {
  const { models, allocations } = fixture()
  const tangent = new models.mTangent('x^2', 1)
  const hx = new models.mTangentHX('x^2', 1, true)
  const independentX = new models.mTangentHX('x^2', 1, false)
  const { tngLine } = tangent
  const hxLine = hx.tngLine
  const secant = hx.aodLine
  const A = secant.A
  const B = secant.B
  const allocated = structuredClone(allocations)
  const metadata = JSON.stringify([tngLine, hxLine, secant, A, B].map(item => ({
    name: item.name, id: item.id, color: item.color, temp: item.temp,
  })))

  models.updateTangent(tangent, '3')
  models.updateTangentHX(hx, '3', '0')
  models.updateTangentHX(independentX, '3', '4')
  expect(tangent.tngLine).toBe(tngLine)
  expect(tngLine.m).toBe(6)
  expect(tngLine.n).toBe(-9)
  expect(hx.tngLine).toBe(hxLine)
  expect(hx.aodLine).toBe(secant)
  expect(secant.A).toBe(A)
  expect(secant.B).toBe(B)
  expect([A.a, A.b, B.a, B.b]).toEqual([3, 9, 3, 9])
  expect([independentX.aodLine.A.a, independentX.aodLine.B.a, independentX.aodLine.B.b]).toEqual([3, 4, 16])
  expect(allocations).toEqual(allocated)
  expect(JSON.stringify([tngLine, hxLine, secant, A, B].map(item => ({
    name: item.name, id: item.id, color: item.color, temp: item.temp,
  })))).toBe(metadata)

  const before = JSON.stringify({ tangent, hx, independentX })
  models.updateTangent(tangent, 3)
  models.updateTangentHX(hx, 3, 0)
  models.updateTangentHX(independentX, 3, 4)
  expect(JSON.stringify({ tangent, hx, independentX })).toBe(before)
  const restored = structuredClone(hx)
  models.updateTangentHX(restored, 4, 1)
  expect([restored.aodLine.A.a, restored.aodLine.A.b, restored.aodLine.B.a, restored.aodLine.B.b]).toEqual([4, 16, 5, 25])
  expect([A.a, A.b, B.a, B.b]).toEqual([3, 9, 3, 9])
})

test('geçersiz analiz ve aralıklar kimlik tüketmez; tanım dışına sürükleme modeli kısmen değiştirmez', () => {
  const { models, allocations } = fixture()
  const tangent = new models.mTangent('sqrt(x)', 1)
  const hx = new models.mTangentHX('sqrt(x)', 1, true)
  const before = JSON.stringify({ tangent, hx })
  const allocated = structuredClone(allocations)
  expect(() => models.updateTangent(tangent, -1)).toThrow(RangeError)
  expect(() => models.updateTangentHX(hx, 4, -5)).toThrow(RangeError)
  expect(JSON.stringify({ tangent, hx })).toBe(before)

  expect(() => new models.mTangent('sqrt(x)', -1)).toThrow(RangeError)
  expect(() => new models.mTangentHX('sqrt(x)', 1, false)).not.toThrow()
  // Exclude the successful model above before checking rejected constructors.
  const afterValid = structuredClone(allocations)
  expect(() => new models.mTangentHX('sqrt(x)', -1, true)).toThrow(RangeError)
  expect(() => new models.mFunction('x', false, 3, 2)).toThrow(RangeError)
  expect(() => new models.mLineWithEquation('Infinity', 2)).toThrow(RangeError)
  for (const [start, end] of [[0, 2], [1.5, 2], [3, 2], [1, Number.MAX_SAFE_INTEGER + 1]]) {
    expect(() => new models.mSequence('n', start!, end!)).toThrow(RangeError)
  }
  expect(allocations).toEqual(afterValid)
  expect(afterValid.ids).toBe(allocated.ids + 1)
  expect(afterValid.names.length).toBe(allocated.names.length + 1)
})
