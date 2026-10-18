import { createCoordinateTransform } from './coordinate-transform';
import type { CoordinateTransform, Viewport } from './coordinate-transform';

/** Keep the grid API aligned with the viewport used by drawing and input tools. */
export type GridViewport = Viewport;

export interface GridLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface GridLabel {
  axis: 'x' | 'y';
  x: number;
  y: number;
  text: string;
}

export interface GridPlan {
  minorLines: GridLine[];
  majorLines: GridLine[];
  axisLines: GridLine[];
  labels: GridLabel[];
  majorStepX: number;
  majorStepY: number;
}

const MIN_MAJOR_SPACING = 80;
const MAX_MAJOR_TICKS = 100;
const SUBDIVISIONS = 5;
const MAX_LINES_PER_AXIS = MAX_MAJOR_TICKS * SUBDIVISIONS + 2;
const MAX_CACHE_DIMENSION = 16_384;
const MAX_CACHE_PIXELS = 16_777_216;
const LABEL_FONT_SIZE = 13;
const LABEL_PADDING = 3;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function validViewport(view: GridViewport): boolean {
  return Object.values(view).every(Number.isFinite)
    && view.width > 0 && view.height > 0
    && view.scaleX > 0 && view.scaleY > 0
    && view.unitX > 0 && view.unitY > 0;
}

/** Round upwards to a readable 1, 2, 5 × 10^n interval. */
function niceStep(minimum: number): number {
  if (!Number.isFinite(minimum) || minimum <= 0) return 0;
  const magnitude = 10 ** Math.floor(Math.log10(minimum));
  if (magnitude === 0) return minimum;
  const fraction = minimum / magnitude;
  const multiplier = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  const step = multiplier * magnitude;
  return Number.isFinite(step) ? step : 0;
}

function formatNumber(value: number, increment: number): string {
  if (value === 0) return '0';
  // Keep enough digits to distinguish adjacent ticks, including a viewport far from zero.
  const precision = Number.isFinite(increment) && increment > 0
    ? clamp(Math.floor(Math.log10(Math.abs(value))) - Math.floor(Math.log10(increment)) + 1, 1, 16)
    : 6;
  return Number(value.toPrecision(precision)).toString();
}

function formatXLabel(value: number, unit: number, increment: number): string | null {
  const symbol = Math.abs(unit - Math.PI) < 1e-8 ? 'π'
    : Math.abs(unit - Math.E) < 1e-8 ? 'e' : null;
  if (symbol) {
    if (value === 0) return '0';
    const coefficient = formatNumber(value, increment);
    if (coefficient === '1') return symbol;
    if (coefficient === '-1') return `-${symbol}`;
    return coefficient.includes('e') ? `(${coefficient})${symbol}` : `${coefficient}${symbol}`;
  }
  const worldValue = value * unit;
  return Number.isFinite(worldValue) ? formatNumber(worldValue, increment * unit) : null;
}

interface Tick {
  position: number;
  coordinate: number;
  major: boolean;
}

function planTicks(
  minimum: number,
  scale: number,
  extent: number,
  toPixel: (coordinate: number) => number,
): { step: number; ticks: Tick[] } {
  const span = extent / scale;
  const maximum = minimum + span;
  if (!Number.isFinite(span) || !Number.isFinite(maximum) || maximum <= minimum) {
    return { step: 0, ticks: [] };
  }

  // The precision floor keeps integer tick indices representable even after extreme panning.
  const precisionFloor = Math.abs(minimum) * Number.EPSILON * 8;
  const step = niceStep(Math.max(MIN_MAJOR_SPACING / scale, span / MAX_MAJOR_TICKS, precisionFloor));
  const minorStep = step / SUBDIVISIONS;
  if (!Number.isFinite(minorStep) || minorStep <= 0) return { step: 0, ticks: [] };

  const first = Math.ceil(minimum / minorStep);
  const last = Math.floor(maximum / minorStep);
  if (!Number.isSafeInteger(first) || !Number.isSafeInteger(last)) return { step, ticks: [] };
  const count = Math.min(MAX_LINES_PER_AXIS, Math.max(0, last - first + 1));
  const ticks: Tick[] = [];
  const edgeTolerance = Math.max(1, extent) * Number.EPSILON * 16;
  for (let offset = 0; offset < count; offset++) {
    const index = first + offset;
    // Multiplication from an integer index avoids accumulation while zooming and panning.
    const coordinate = index * minorStep;
    const position = toPixel(coordinate);
    if (Number.isFinite(position) && position >= -edgeTolerance && position <= extent + edgeTolerance) {
      ticks.push({ position: clamp(position, 0, extent), coordinate, major: index % SUBDIVISIONS === 0 });
    }
  }
  return { step, ticks };
}

/** Pure, bounded work: create visible grid lines and mathematical tick labels. */
export function createGridPlan(view: GridViewport): GridPlan {
  const plan: GridPlan = {
    minorLines: [], majorLines: [], axisLines: [], labels: [], majorStepX: 0, majorStepY: 0,
  };
  let transform: CoordinateTransform;
  try {
    transform = createCoordinateTransform(view);
  } catch (error) {
    // Grid planning is deliberately tolerant of transient empty or unrepresentable views.
    if (error instanceof RangeError) return plan;
    throw error;
  }

  // Tick intervals are grid-unit coefficients; the common transform maps their real values.
  const horizontal = planTicks(view.minX, view.scaleY, view.width,
    coordinate => transform.xToPixel(coordinate * view.unitY));
  const vertical = planTicks(view.minY, view.scaleX, view.height,
    coordinate => transform.yToPixel(-coordinate * view.unitX));
  plan.majorStepX = horizontal.step;
  plan.majorStepY = vertical.step;
  const axisX = transform.originX;
  const axisY = transform.originY;
  if (axisX >= 0 && axisX <= view.width) {
    plan.axisLines.push({ x1: axisX, y1: 0, x2: axisX, y2: view.height });
  }
  if (axisY >= 0 && axisY <= view.height) {
    plan.axisLines.push({ x1: 0, y1: axisY, x2: view.width, y2: axisY });
  }

  const xLabelY = clamp(axisY + LABEL_FONT_SIZE + 3, LABEL_FONT_SIZE, view.height - LABEL_PADDING);
  const yLabelX = clamp(axisX + 7, LABEL_PADDING, view.width - LABEL_PADDING);
  const showLabels = view.width >= 24 && view.height >= LABEL_FONT_SIZE + LABEL_PADDING * 2;
  for (const tick of horizontal.ticks) {
    if (tick.coordinate !== 0) {
      (tick.major ? plan.majorLines : plan.minorLines).push({
        x1: tick.position, y1: 0, x2: tick.position, y2: view.height,
      });
    }
    if (tick.major && showLabels) {
      const text = formatXLabel(tick.coordinate, view.unitY, horizontal.step);
      if (text !== null) plan.labels.push({ axis: 'x', x: tick.position, y: xLabelY, text });
    }
  }
  for (const tick of vertical.ticks) {
    if (tick.coordinate === 0) continue;
    (tick.major ? plan.majorLines : plan.minorLines).push({
      x1: 0, y1: tick.position, x2: view.width, y2: tick.position,
    });
    const worldValue = -tick.coordinate * view.unitX;
    if (tick.major && showLabels && Number.isFinite(worldValue)) {
      plan.labels.push({
        axis: 'y', x: yLabelX,
        y: clamp(tick.position - 5, LABEL_FONT_SIZE, view.height - LABEL_PADDING),
        text: formatNumber(worldValue, vertical.step * view.unitX),
      });
    }
  }
  return plan;
}

function strokeLines(ctx: CanvasRenderingContext2D, lines: GridLine[], color: string, width: number): void {
  if (lines.length === 0) return;
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  for (const line of lines) {
    ctx.moveTo(line.x1, line.y1);
    ctx.lineTo(line.x2, line.y2);
  }
  ctx.stroke();
}

interface LabelBounds { left: number; top: number; right: number; bottom: number }

function drawLabels(ctx: CanvasRenderingContext2D, labels: GridLabel[], width: number, height: number): void {
  if (width < 24 || height < LABEL_FONT_SIZE + LABEL_PADDING * 2) return;
  ctx.font = `${LABEL_FONT_SIZE}px Arial, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const occupied: LabelBounds[] = [];
  for (const label of labels) {
    const textWidth = Math.min(ctx.measureText(label.text).width, width - LABEL_PADDING * 2);
    const left = clamp(label.axis === 'x' ? label.x - textWidth / 2 : label.x,
      LABEL_PADDING, width - textWidth - LABEL_PADDING);
    const bottom = clamp(label.y, LABEL_FONT_SIZE + LABEL_PADDING, height - LABEL_PADDING);
    const bounds = { left, top: bottom - LABEL_FONT_SIZE, right: left + textWidth, bottom };
    if (occupied.some(other => bounds.left < other.right + LABEL_PADDING
      && bounds.right + LABEL_PADDING > other.left
      && bounds.top < other.bottom + LABEL_PADDING && bounds.bottom + LABEL_PADDING > other.top)) continue;
    occupied.push(bounds);
    ctx.fillStyle = 'white';
    ctx.fillRect(left - 2, bounds.top, textWidth + 4, LABEL_FONT_SIZE + 2);
    ctx.fillStyle = '#364152';
    ctx.fillText(label.text, left, bottom, textWidth);
  }
}

function sameViewport(a: GridViewport, b: GridViewport): boolean {
  return a.width === b.width && a.height === b.height && a.minX === b.minX && a.minY === b.minY
    && a.scaleX === b.scaleX && a.scaleY === b.scaleY && a.unitX === b.unitX && a.unitY === b.unitY;
}

/** Keep the static background separate from changing geometry and pointer previews. */
export function createGridRenderer(): {
  draw(ctx: CanvasRenderingContext2D, viewport: GridViewport, dpr: number): void;
} {
  let cache: HTMLCanvasElement | null = null;
  let cachedViewport: GridViewport | null = null;
  let cachedDpr = 0;

  return {
    draw(ctx, viewport, dpr) {
      if (!validViewport(viewport)) return;
      const pixelRatio = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
      if (!cache) cache = document.createElement('canvas');
      if (!cachedViewport || !sameViewport(cachedViewport, viewport) || cachedDpr !== pixelRatio) {
        // Bound cache memory and platform canvas dimensions, including unusual external viewports.
        const rasterScale = Math.min(pixelRatio,
          MAX_CACHE_DIMENSION / Math.max(viewport.width, viewport.height),
          Math.sqrt(MAX_CACHE_PIXELS / viewport.width / viewport.height));
        if (!(rasterScale > 0)) return;
        const pixelWidth = Math.max(1, Math.ceil(viewport.width * rasterScale));
        const pixelHeight = Math.max(1, Math.ceil(viewport.height * rasterScale));
        if (cache.width !== pixelWidth) cache.width = pixelWidth;
        if (cache.height !== pixelHeight) cache.height = pixelHeight;
        const background = cache.getContext('2d');
        if (!background) return;
        background.setTransform(pixelWidth / viewport.width, 0, 0, pixelHeight / viewport.height, 0, 0);
        background.fillStyle = 'white';
        background.fillRect(0, 0, viewport.width, viewport.height);
        const plan = createGridPlan(viewport);
        strokeLines(background, plan.minorLines, '#e8edf2', 0.6);
        strokeLines(background, plan.majorLines, '#c7d0da', 0.9);
        strokeLines(background, plan.axisLines, '#d94b4b', 1.6);
        drawLabels(background, plan.labels, viewport.width, viewport.height);
        cachedViewport = { ...viewport };
        cachedDpr = pixelRatio;
      }
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(cache, 0, 0, cache.width, cache.height, 0, 0, viewport.width, viewport.height);
      ctx.restore();
    },
  };
}
