import { expect, test } from '@playwright/test'
import { createCoordinateTransform } from '../src/rendering/coordinate-transform'
import { createFunctionEvaluator, type FunctionEvaluator } from '../src/rendering/function-evaluator'
import { drawFunctionPlot, type FunctionPlotOptions } from '../src/rendering/function-plotter'

interface Point { x: number; y: number }
interface Segment { start: Point; end: Point }
interface Style {
  strokeStyle: CanvasRenderingContext2D['strokeStyle']
  lineWidth: number
  dash: number[]
}

class RecordingContext {
  strokeStyle: CanvasRenderingContext2D['strokeStyle'] = '#222222'
  lineWidth = 7
  dash = [9, 3]
  segments: Segment[] = []
  moves: Point[] = []
  strokes: Style[] = []
  rectangles: number[][] = []
  clips = 0
  saves = 0
  restores = 0
  private pen: Point | null = null
  private states: Style[] = []

  save(): void {
    this.saves++
    this.states.push({ strokeStyle: this.strokeStyle, lineWidth: this.lineWidth, dash: [...this.dash] })
  }
  restore(): void {
    this.restores++
    const state = this.states.pop()
    if (state) {
      this.strokeStyle = state.strokeStyle
      this.lineWidth = state.lineWidth
      this.dash = state.dash
    }
  }
  beginPath(): void { this.pen = null }
  rect(...values: number[]): void { this.rectangles.push(values) }
  clip(): void { this.clips++ }
  moveTo(x: number, y: number): void {
    this.pen = { x, y }
    this.moves.push(this.pen)
  }
  lineTo(x: number, y: number): void {
    const end = { x, y }
    if (this.pen) this.segments.push({ start: this.pen, end })
    this.pen = end
  }
  stroke(): void {
    this.strokes.push({ strokeStyle: this.strokeStyle, lineWidth: this.lineWidth, dash: [...this.dash] })
  }
  setLineDash(dash: number[]): void { this.dash = [...dash] }
}

function plotOptions(overrides: Partial<FunctionPlotOptions> = {}): FunctionPlotOptions {
  const width = overrides.width ?? 10
  const height = overrides.height ?? 100
  return {
    expression: 'x', width, height, color: '#123456', lineWidth: 2,
    transform: createCoordinateTransform({
      width, height, minX: -5, minY: -50, scaleX: 1, scaleY: 1, unitX: 1, unitY: 1,
    }),
    ...overrides,
  }
}

function countingEvaluator(): { evaluator: FunctionEvaluator; samples: number[] } {
  const cached = createFunctionEvaluator()
  const samples: number[] = []
  return {
    samples,
    evaluator: {
      evaluate(expression, x) { samples.push(x); return cached.evaluate(expression, x) },
      clear: () => cached.clear(),
    },
  }
}

test('görünür matematik alanı örneklenir; uzak pan ve dar tanım aralıkları kesilmez', () => {
  const { evaluator, samples } = countingEvaluator()
  const transform = createCoordinateTransform({
    width: 10, height: 100, minX: 100_000_000, minY: -50,
    scaleX: 1, scaleY: 1, unitX: 1, unitY: 1,
  })
  const ctx = new RecordingContext()
  drawFunctionPlot(ctx, plotOptions({ expression: 'x-100000000', transform }), evaluator)
  expect(samples).toHaveLength(11)
  expect(Math.min(...samples)).toBe(100_000_000)
  expect(Math.max(...samples)).toBe(100_000_010)
  expect(ctx.segments.length).toBeGreaterThan(0)

  samples.length = 0
  drawFunctionPlot(new RecordingContext(), plotOptions({ startX: -2.2, endX: 1.4 }), evaluator)
  expect(samples.length).toBeLessThanOrEqual(7)
  expect(samples.every(x => x >= -2.2 && x <= 1.4)).toBe(true)
  expect(samples[0]).toBeCloseTo(-2.2)
  expect(samples.at(-1)).toBeCloseTo(1.4)

  samples.length = 0
  drawFunctionPlot(new RecordingContext(), plotOptions({ startX: -1.8, endX: -1.7 }), evaluator)
  expect(samples).toHaveLength(2)
  samples.length = 0
  drawFunctionPlot(new RecordingContext(), plotOptions({ startX: 2, endX: -2 }), evaluator)
  drawFunctionPlot(new RecordingContext(), plotOptions({ startX: 20, endX: 30 }), evaluator)
  expect(samples).toHaveLength(0)
})

test('açık tanım aralığı uçları değerlendirilmez; ekran kenarları açık uç sayılmaz', () => {
  const { evaluator, samples } = countingEvaluator()
  const openDomain = new RecordingContext()
  drawFunctionPlot(openDomain, plotOptions({
    startX: -2, endX: 2, startInclusive: false, endInclusive: false,
  }), evaluator)
  expect(samples).toEqual([-1, 0, 1])
  expect(openDomain.segments.length).toBeGreaterThan(0)

  samples.length = 0
  drawFunctionPlot(new RecordingContext(), plotOptions({ startX: -2, endX: 2 }), evaluator)
  expect(samples).toEqual([-2, -1, 0, 1, 2])

  samples.length = 0
  const clippedDomain = new RecordingContext()
  drawFunctionPlot(clippedDomain, plotOptions({
    startX: -10, endX: 10, startInclusive: false, endInclusive: false,
  }), evaluator)
  expect(samples[0]).toBe(-5)
  expect(samples.at(-1)).toBe(5)
  expect(clippedDomain.segments[0]?.start.x).toBe(0)
  expect(clippedDomain.segments.at(-1)?.end.x).toBe(10)
})

test('domain boşlukları ve piksel arasındaki asimptot karşı dalları birleştirmez', () => {
  const evaluator = createFunctionEvaluator()
  const domain = new RecordingContext()
  drawFunctionPlot(domain, plotOptions({ expression: 'sqrt(x)' }), evaluator)
  expect(domain.segments.length).toBeGreaterThan(0)
  expect(domain.segments.every(segment => segment.start.x >= 5 && segment.end.x >= 5)).toBe(true)

  const transform = createCoordinateTransform({
    width: 10, height: 100, minX: -5.5, minY: -50,
    scaleX: 1, scaleY: 1, unitX: 1, unitY: 1,
  })
  const discontinuous = new RecordingContext()
  const { evaluator: counted, samples } = countingEvaluator()
  drawFunctionPlot(discontinuous, plotOptions({ expression: '100/x', transform }), counted)
  expect(discontinuous.segments.length).toBeGreaterThan(0)
  expect(discontinuous.segments.some(segment => segment.start.x < 5.5 && segment.end.x > 5.5)).toBe(false)
  expect(samples.length).toBeLessThanOrEqual(2 * 10 + 3)
})

test('dik sürekli eğri kırpılır ve çok büyük değerler Canvas koordinatlarını taşırmaz', () => {
  const evaluator = createFunctionEvaluator()
  const transform = createCoordinateTransform({
    width: 10, height: 100, minX: -5.5, minY: -50,
    scaleX: 1, scaleY: 1, unitX: 1, unitY: 1,
  })
  for (const expression of ['1000*x', '1e308*x']) {
    const ctx = new RecordingContext()
    drawFunctionPlot(ctx, plotOptions({ expression, transform }), evaluator)
    expect(ctx.segments.length, expression).toBeGreaterThan(0)
    expect(ctx.segments.some(segment => segment.start.y === 100 && segment.end.y === 0), expression).toBe(true)
    for (const point of ctx.segments.flatMap(segment => [segment.start, segment.end])) {
      expect(Number.isFinite(point.x) && Number.isFinite(point.y)).toBe(true)
      expect(point.x).toBeGreaterThanOrEqual(0)
      expect(point.x).toBeLessThanOrEqual(10)
      expect(point.y).toBeGreaterThanOrEqual(0)
      expect(point.y).toBeLessThanOrEqual(100)
    }
  }
})

test('çizgi stili ve clip kaydedilir; hata durumunda da Canvas durumu geri yüklenir', () => {
  const ctx = new RecordingContext()
  drawFunctionPlot(ctx, plotOptions({ dashed: true }), createFunctionEvaluator())
  expect(ctx.strokes).toEqual([{ strokeStyle: '#123456', lineWidth: 2, dash: [2, 5] }])
  expect(ctx.rectangles).toEqual([[0, 0, 10, 100]])
  expect(ctx.clips).toBe(1)
  expect(ctx.saves).toBe(1)
  expect(ctx.restores).toBe(1)
  expect([ctx.strokeStyle, ctx.lineWidth, ctx.dash]).toEqual(['#222222', 7, [9, 3]])

  const failure = new RecordingContext()
  const throwing: FunctionEvaluator = {
    evaluate() { throw new Error('Beklenmedik değerlendirme hatası') },
    clear() {},
  }
  expect(() => drawFunctionPlot(failure, plotOptions(), throwing)).toThrow('Beklenmedik değerlendirme hatası')
  expect(failure.saves).toBe(failure.restores)
  expect([failure.strokeStyle, failure.lineWidth, failure.dash]).toEqual(['#222222', 7, [9, 3]])
})
