import { expect, test, type Page } from '@playwright/test';
import type { RadialToolAction } from '../src/ui/toolbar-types';

interface RenderProbe {
  mainComposites: number;
  gridStrokes: number;
}

type ProbedWindow = Window & { __renderProbe: RenderProbe };
type CanvasRegion = { x: number; y: number; width: number; height: number };
const runtimeFailures = new WeakMap<Page, string[]>();

test.beforeEach(({ page }) => {
  const failures: string[] = [];
  runtimeFailures.set(page, failures);
  page.on('pageerror', error => failures.push(error.message));
});

test.afterEach(({ page }) => {
  expect(runtimeFailures.get(page), 'Rendering must not cause JavaScript errors').toEqual([]);
});

async function settlePaint(page: Page): Promise<void> {
  await page.evaluate(() => new Promise<void>(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
}

async function selectTool(page: Page, action: RadialToolAction): Promise<void> {
  await page.evaluate(action => {
    if (!window.drAW2DRadialToolbar) throw new Error('The toolbar is not initialized');
    window.drAW2DRadialToolbar.selectToolByAction(action, { showToast: false });
  }, action);
}

async function canvasHash(page: Page, region?: CanvasRegion): Promise<number> {
  await settlePaint(page);
  return page.locator('#canvas').evaluate((canvas: HTMLCanvasElement, region) => {
    const rect = canvas.getBoundingClientRect();
    const ratioX = canvas.width / rect.width;
    const ratioY = canvas.height / rect.height;
    const pixels = region
      ? canvas.getContext('2d')!.getImageData(
        Math.floor(region.x * ratioX), Math.floor(region.y * ratioY),
        Math.ceil(region.width * ratioX), Math.ceil(region.height * ratioY),
      ).data
      : canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
    let hash = 2166136261;
    for (const value of pixels) hash = Math.imul(hash ^ value, 16777619);
    return hash >>> 0;
  }, region);
}

async function canvasSize(page: Page) {
  await settlePaint(page);
  return page.locator('#canvas').evaluate((canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    return { width: canvas.width, height: canvas.height, cssWidth: rect.width, cssHeight: rect.height };
  });
}

test('HiDPI drawing and hit testing use CSS coordinates before and after resizing', async ({ browser, page, baseURL }) => {
  const context = await browser.newContext({ baseURL, deviceScaleFactor: 2, viewport: { width: 1200, height: 800 } });
  try {
    const highDpiPage = await context.newPage();
    highDpiPage.on('pageerror', error => runtimeFailures.get(page)!.push(error.message));
    await highDpiPage.goto('/');
    await expect(highDpiPage.locator('#giris')).toBeVisible();
    expect(await canvasSize(highDpiPage)).toEqual({ width: 2400, height: 1600, cssWidth: 1200, cssHeight: 800 });

    const pointRegion = { x: 747, y: 247, width: 6, height: 6 };
    const emptyPointRegion = await canvasHash(highDpiPage, pointRegion);
    await selectTool(highDpiPage, 'point');
    await highDpiPage.locator('#canvas').click({ position: { x: 750, y: 250 } });
    await expect(highDpiPage.locator('#objectsContainer .expr-block input')).toHaveValue('A=(2.50,2.50)');
    expect(await canvasHash(highDpiPage, pointRegion), 'The point must appear at its CSS click position').not.toBe(emptyPointRegion);

    await highDpiPage.setViewportSize({ width: 1400, height: 900 });
    expect(await canvasSize(highDpiPage)).toEqual({ width: 2800, height: 1800, cssWidth: 1400, cssHeight: 900 });
    expect(await canvasHash(highDpiPage, pointRegion), 'Resize must retain the point at the same world position').not.toBe(emptyPointRegion);

    await selectTool(highDpiPage, 'select');
    await highDpiPage.mouse.move(750, 250);
    await highDpiPage.mouse.down();
    await highDpiPage.mouse.move(780, 230);
    await highDpiPage.mouse.up();
    await expect(highDpiPage.locator('#objectsContainer .expr-block input')).toHaveValue('A=(2.80,2.70)');
    expect(await canvasHash(highDpiPage, pointRegion), 'Dragging must clear the previous point position').toBe(emptyPointRegion);
  } finally {
    await context.close();
  }
});

test('a pointer burst paints one preview frame and reuses the coordinate grid', async ({ page }) => {
  await page.addInitScript(() => {
    const probe: RenderProbe = { mainComposites: 0, gridStrokes: 0 };
    (window as ProbedWindow).__renderProbe = probe;
    const originalDrawImage = CanvasRenderingContext2D.prototype.drawImage;
    const originalStroke = CanvasRenderingContext2D.prototype.stroke;
    CanvasRenderingContext2D.prototype.drawImage = function (...args: unknown[]) {
      if (this.canvas.id === 'canvas') probe.mainComposites++;
      return Reflect.apply(originalDrawImage, this, args);
    };
    CanvasRenderingContext2D.prototype.stroke = function (...args: unknown[]) {
      if (this.canvas.id !== 'canvas') probe.gridStrokes++;
      return Reflect.apply(originalStroke, this, args);
    };
  });
  await page.goto('/');
  await expect(page.locator('#giris')).toBeVisible();
  const emptyCanvas = await canvasHash(page);
  await selectTool(page, 'line');
  await page.locator('#canvas').click({ position: { x: 750, y: 250 } });
  await expect(page.locator('#objectsContainer .expr-block')).toHaveCount(1);
  const pointOnlyCanvas = await canvasHash(page);

  // Dispatch in one JavaScript task: every movement belongs to the same frame.
  await page.evaluate(() => {
    const probe = (window as ProbedWindow).__renderProbe;
    probe.mainComposites = 0;
    probe.gridStrokes = 0;
    const canvas = document.querySelector<HTMLCanvasElement>('#canvas')!;
    const rect = canvas.getBoundingClientRect();
    for (let index = 0; index < 30; index++) {
      canvas.dispatchEvent(new PointerEvent('pointermove', {
        bubbles: true, pointerId: 1, pointerType: 'mouse', isPrimary: true,
        clientX: rect.left + 800 + index * 3, clientY: rect.top + 320 + index,
      }));
    }
  });
  await settlePaint(page);
  expect(await page.evaluate(() => ({ ...(window as ProbedWindow).__renderProbe })))
    .toEqual({ mainComposites: 1, gridStrokes: 0 });
  expect(await canvasHash(page), 'The latest line preview must survive the scheduled scene paint').not.toBe(pointOnlyCanvas);
  await expect(page.locator('#objectsContainer .expr-block')).toHaveCount(1);
  await expect(page.locator('#undo')).toBeDisabled();

  await page.keyboard.press('Escape');
  await expect(page.locator('#objectsContainer .expr-block')).toHaveCount(0);
  await expect(page.locator('#undo')).toBeDisabled();
  await expect(page.locator('#redo')).toBeDisabled();
  expect(await canvasHash(page), 'Cancelling removes the preview and its temporary point').toBe(emptyCanvas);
});

test('partial-domain functions draw their real branches without invalid-domain bridges', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#giris')).toBeVisible();
  await page.locator('#btnAcordeon').click();
  const samples = [
    { command: 'sqrt(x)', y: Math.sqrt(1.37), gap: { x: 360, y: 380, width: 8, height: 8 } },
    { command: 'log(x)', y: Math.log(1.37), gap: { x: 360, y: 465, width: 8, height: 8 } },
    { command: '1/x', y: 1 / 1.37, gap: { x: 496, y: 496, width: 8, height: 8 } },
  ];
  for (const sample of samples) {
    await test.step(sample.command, async () => {
      const branch = { x: 633, y: Math.floor(500 - 100 * sample.y) - 4, width: 8, height: 8 };
      const emptyBranch = await canvasHash(page, branch);
      const emptyGap = await canvasHash(page, sample.gap);
      await page.locator('#giris').fill(sample.command);
      await page.locator('#giris').press('Enter');
      await expect(page.locator('#objectsContainer .expr-block')).toHaveCount(1);
      await expect(page.locator('#giris')).toHaveValue('');
      expect(await canvasHash(page, branch), 'A finite real sample must be visible').not.toBe(emptyBranch);
      expect(await canvasHash(page, sample.gap), 'Undefined or disconnected parts must stay clear').toBe(emptyGap);
      await page.locator('#clear').click();
      await expect(page.locator('#objectsContainer .expr-block')).toHaveCount(0);
    });
  }
});

test('tangent slider bursts update the equation synchronously and paints do not create history', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#giris')).toBeVisible();
  await page.locator('#btnAcordeon').click();
  await page.locator('#giris').fill('Teğet(x^2,1)');
  await page.locator('#giris').press('Enter');
  const row = page.locator('#objectsContainer .expr-block');
  await expect(row).toHaveCount(1);
  await expect(row.locator('input[readonly]')).toHaveValue('Teğet(x^2,1)');
  await expect(row.locator('output')).toHaveText('f: y = 2x-1');
  await settlePaint(page);

  const slider = page.locator('#objectsContainer .sliders input[type="range"]').first();
  // Both edits and the commit happen before any animation frame can paint.
  const immediateEquation = await slider.evaluate((element: HTMLInputElement) => {
    element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    for (const value of ['2', '3']) {
      element.value = value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return element.closest('.sliders')!.parentElement!.querySelector('output')!.value;
  });
  expect(immediateEquation).toBe('f: y = 6x-9');
  await settlePaint(page);
  await expect(row.locator('input[readonly]')).toHaveValue('Teğet(x^2,3)');
  await expect(row.locator('output')).toHaveText('f: y = 6x-9');

  // An unchanged slider interaction spanning a paint must not add an undo step.
  await slider.evaluate((element: HTMLInputElement) => {
    element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await settlePaint(page);
  await slider.dispatchEvent('change');

  await page.locator('#undo').click();
  await expect(row.locator('input[readonly]')).toHaveValue('Teğet(x^2,1)');
  await expect(row.locator('output')).toHaveText('f: y = 2x-1');
  await settlePaint(page);
  await page.locator('#redo').click();
  await expect(row.locator('input[readonly]')).toHaveValue('Teğet(x^2,3)');
  await expect(row.locator('output')).toHaveText('f: y = 6x-9');
  await expect(page.locator('#redo')).toBeDisabled();
});

test('point input keeps precise coordinates without implicit integer snapping or rounding', async ({ page }) => {
  await page.addInitScript(() => {
    const originalArc = CanvasRenderingContext2D.prototype.arc;
    CanvasRenderingContext2D.prototype.arc = function (x, y, radius, start, end, counterclockwise) {
      if (this.canvas.id === 'canvas') this.canvas.dataset.pointArc = JSON.stringify({ x, y });
      return originalArc.call(this, x, y, radius, start, end, counterclockwise);
    };
  });
  await page.goto('/');
  await expect(page.locator('#giris')).toBeVisible();
  const canvas = page.locator('#canvas');
  const pointRegion = { x: 701, y: 293, width: 6, height: 6 };
  const emptyPointRegion = await canvasHash(page, pointRegion);
  await selectTool(page, 'point');
  await canvas.click({ position: { x: 704, y: 296 } });
  const pointInput = page.locator('#objectsContainer .expr-block input[readonly]');
  await expect(pointInput).toHaveValue('A=(2.04,2.04)');
  expect(await canvasHash(page, pointRegion)).not.toBe(emptyPointRegion);
  expect(await canvas.evaluate((element: HTMLCanvasElement) => JSON.parse(element.dataset.pointArc!)))
    .toEqual({ x: 704, y: 296 });

  await selectTool(page, 'select');
  // Feed subpixel positions directly, independently of native mouse coordinate rounding.
  await canvas.evaluate((element: HTMLCanvasElement) => {
    const rect = element.getBoundingClientRect();
    for (const event of [
      { type: 'pointerdown', x: 704, y: 296, buttons: 1 },
      { type: 'pointermove', x: 714.625, y: 285.25, buttons: 1 },
      { type: 'pointerup', x: 714.625, y: 285.25, buttons: 0 },
    ]) {
      const pointerEvent = new PointerEvent(event.type, {
        bubbles: true, button: 0, buttons: event.buttons, pointerId: 1, pointerType: 'mouse', isPrimary: true,
        clientX: rect.left + event.x, clientY: rect.top + event.y,
      });
      Object.defineProperties(pointerEvent, {
        clientX: { value: rect.left + event.x },
        clientY: { value: rect.top + event.y },
      });
      element.dispatchEvent(pointerEvent);
    }
  });
  await expect(pointInput).toHaveValue('A=(2.15,2.15)');
  await settlePaint(page);
  const paintedPoint = await canvas.evaluate((element: HTMLCanvasElement) =>
    JSON.parse(element.dataset.pointArc!) as { x: number; y: number });
  expect(paintedPoint.x, 'Only the displayed label may round the mathematical coordinate').toBeCloseTo(714.625, 8);
  expect(paintedPoint.y).toBeCloseTo(285.25, 8);
});
