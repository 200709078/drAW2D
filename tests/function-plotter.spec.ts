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

test('açık tanım aralığı uçları değerlendirilmez ama eğri uca kadar çizilir; ekran kenarları açık uç sayılmaz', () => {
  const { evaluator, samples } = countingEvaluator()
  const openDomain = new RecordingContext()
  drawFunctionPlot(openDomain, plotOptions({
    startX: -2, endX: 2, startInclusive: false, endInclusive: false,
  }), evaluator)
  // The ends are approached from inside, within a billionth of a pixel, but never evaluated.
  expect(samples).not.toContain(-2)
  expect(samples).not.toContain(2)
  expect(samples.every(x => x > -2 && x < 2)).toBe(true)
  expect(samples).toEqual(expect.arrayContaining([-1, 0, 1]))
  expect(samples).toHaveLength(5)
  expect(openDomain.segments[0]?.start.x).toBeCloseTo(3, 6)
  expect(openDomain.segments.at(-1)?.end.x).toBeCloseTo(7, 6)

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

  // A domain boundary between pixel samples is found exactly: sqrt starts at the origin.
  const shifted = createCoordinateTransform({
    width: 10, height: 100, minX: -5.3, minY: -50, scaleX: 1, scaleY: 1, unitX: 1, unitY: 1,
  })
  const root = new RecordingContext()
  drawFunctionPlot(root, plotOptions({ expression: 'x^(1/2)', transform: shifted }), evaluator)
  expect(root.segments[0]?.start.x).toBeCloseTo(5.3, 9)
  expect(root.segments[0]?.start.y).toBeCloseTo(50, 6)

  // log(x) approaches its asymptote without converging: the branch reaches the bottom edge at x = 0.
  const logarithm = new RecordingContext()
  drawFunctionPlot(logarithm, plotOptions({ expression: 'log(x)', transform: shifted }), evaluator)
  const lowest = logarithm.segments.flatMap(segment => [segment.start, segment.end]).find(point => point.y === 100)
  expect(lowest?.x).toBeCloseTo(5.3, 3)

  const transform = createCoordinateTransform({
    width: 10, height: 100, minX: -5.5, minY: -50,
    scaleX: 1, scaleY: 1, unitX: 1, unitY: 1,
  })
  const discontinuous = new RecordingContext()
  const { evaluator: counted, samples } = countingEvaluator()
  drawFunctionPlot(discontinuous, plotOptions({ expression: '100/x', transform }), counted)
  expect(discontinuous.segments.length).toBeGreaterThan(0)
  expect(discontinuous.segments.some(segment => segment.start.x < 5.5 && segment.end.x > 5.5)).toBe(false)
  // Both branches leave through the screen edges: down on the left, up on the right.
  expect(discontinuous.segments.some(segment => segment.end.y === 100 && segment.end.x < 5.5)).toBe(true)
  expect(discontinuous.segments.some(segment => segment.start.y === 0 && segment.start.x > 5.5)).toBe(true)
  // Locating the pole to float precision is bounded work.
  expect(samples.length).toBeLessThanOrEqual(11 * 48)
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

test('asimptot, tanım sınırı ve kutuplu fonksiyonlar her yakınlaştırmada kesintisiz ve doğru çizilir', () => {
  const width = 600
  const height = 400
  const evaluator = createFunctionEvaluator()
  const expressions = [
    'log(e, 4 - x ^ 2)', 'log(5,2x-3)', 'x^(1/2)', 'sqrt(x)', '1/x', '1/x^2', 'tan(x)', 'cot(x)', 'log(x)',
    'floor(x)', 'abs(x)', 'sqrt(4-x^2)', 'exp(x)', '1/(x-1)', 'sqrt(x^2-1)', 'log(abs(x))', '(x^2-1)/(x-1)',
    'e^(1/x)', 'asin(x)', 'acos(x)', '1/sin(x)', 'nthRoot(x,3)', 'sign(x)', 'log(2, 8-x)', 'sqrt(sin(x))', 'log(x^2)',
  ]
  // Pixels per unit and the view centre: default, tiny pans, far out, and deep zooms at asymptotes.
  const views = [[100, 0, 0], [100, 0.003, 0.7], [10, 3, -2], [1000, 1.5, 0], [1000, 2, -1], [100000, 0, 0],
    [20, 0.37, 0.2], [5000, 1.5707, 0], [300, -1.999, -3]] as const
  const failures: string[] = []
  for (const [pixelsPerUnit, centerX, centerY] of views) {
    const transform = createCoordinateTransform({
      width, height, scaleX: 100, scaleY: 100, unitX: 100 / pixelsPerUnit, unitY: 100 / pixelsPerUnit,
      minX: centerX * pixelsPerUnit / 100 - width / 200, minY: -centerY * pixelsPerUnit / 100 - height / 200,
    })
    for (const expression of expressions) {
      const ctx = new RecordingContext()
      drawFunctionPlot(ctx, { ...plotOptions({ width, height }), expression, transform }, evaluator)
      const y = (pixel: number) => {
        const value = evaluator.evaluate(expression, transform.pixelToX(pixel))
        return value === null ? null : transform.yToPixel(value)
      }
      const label = `${expression} @ ${pixelsPerUnit} px/birim, merkez (${centerX}, ${centerY})`
      // Every visible column of a defined, non-vertical piece of the curve is drawn.
      for (let pixel = 0.5; pixel < width; pixel++) {
        const value = y(pixel)
        const left = y(pixel - 0.5)
        const right = y(pixel + 0.5)
        if (value === null || left === null || right === null || value < 1 || value > height - 1
          || Math.abs(right - left) > height) continue
        if (!ctx.segments.some(segment => Math.min(segment.start.x, segment.end.x) <= pixel + 0.5
          && Math.max(segment.start.x, segment.end.x) >= pixel - 0.5)) {
          failures.push(`${label}: x=${transform.pixelToX(pixel)} çizilmedi`)
          break
        }
      }
      // Drawn segments follow the curve and never bridge undefined parts or opposite branches.
      for (const segment of ctx.segments) {
        if (Math.abs(segment.end.x - segment.start.x) < 0.05) continue
        const pixel = (segment.start.x + segment.end.x) / 2
        const drawn = (segment.start.y + segment.end.y) / 2
        if (drawn <= 0.5 || drawn >= height - 0.5) continue
        const value = y(pixel)
        if (value === null || Math.abs(value - drawn) > 1.5) {
          failures.push(`${label}: x=${transform.pixelToX(pixel)} çizilen ${drawn}, gerçek ${value}`)
          break
        }
      }
    }
  }
  expect(failures).toEqual([])
})

test('piksel altında salınan eğriler sınırlı sayıda değerlendirmeyle çizilir', () => {
  const width = 600
  for (const [expression, unit] of [['sin(1/x)', 1], ['tan(1/x)', 1], ['tan(x)', 100], ['x*sin(1/x)', 0.001]] as const) {
    const { evaluator, samples } = countingEvaluator()
    const transform = createCoordinateTransform({
      width, height: 400, minX: -3, minY: -2, scaleX: 100, scaleY: 100, unitX: unit, unitY: unit,
    })
    drawFunctionPlot(new RecordingContext(), { ...plotOptions({ width, height: 400 }), expression, transform }, evaluator)
    // One sample per pixel, one guaranteed midpoint per pixel interval and the per-pixel budget.
    expect(samples.length, expression).toBeLessThanOrEqual((width + 2) * (2 + 8) + 16)
  }
})
