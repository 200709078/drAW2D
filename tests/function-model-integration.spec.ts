import { expect, test, type Page } from '@playwright/test';

type CanvasRegion = { x: number; y: number; width: number; height: number };
const runtimeFailures = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const failures: string[] = [];
  runtimeFailures.set(page, failures);
  page.on('pageerror', error => failures.push(error.message));
  await page.goto('/');
  await expect(page.locator('#giris')).toBeVisible();
  await page.locator('#btnAcordeon').click();
});

test.afterEach(({ page }) => {
  expect(runtimeFailures.get(page), 'Function commands must not cause JavaScript errors').toEqual([]);
});

async function enterCommand(page: Page, command: string): Promise<void> {
  await page.locator('#giris').fill(command);
  await page.locator('#giris').press('Enter');
}

async function settlePaint(page: Page): Promise<void> {
  await page.evaluate(() => new Promise<void>(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
}

function aroundSample(x: number, y: number): CanvasRegion {
  // The initial view has its origin at (500, 500) and 100 CSS pixels per unit.
  return { x: Math.floor(500 + 100 * x) - 4, y: Math.floor(500 - 100 * y) - 4, width: 8, height: 8 };
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

test('composition substitutes variables without changing function names or nested arguments', async ({ page }) => {
  const samples = [
    { command: 'Bileşke(exp(x),x^2)', x: 0.83, y: Math.exp(0.83 ** 2), functionName: 'exp' },
    { command: 'Bileşke(max(x,1),x^2)', x: 1.17, y: Math.max(1.17 ** 2, 1), functionName: 'max' },
  ];
  for (const sample of samples) {
    await test.step(sample.command, async () => {
      const region = aroundSample(sample.x, sample.y);
      const emptySample = await canvasHash(page, region);
      await enterCommand(page, sample.command);
      const row = page.locator('#objectsContainer .expr-block');
      await expect(row).toHaveCount(1);
      await expect(row.locator('input[readonly]')).toHaveValue(sample.command);
      await expect(row.locator('output')).toContainText(sample.functionName);
      expect(await canvasHash(page, region), 'The composed curve must pass through its numerical sample').not.toBe(emptySample);
      await page.locator('#clear').click();
      await expect(row).toHaveCount(0);
    });
  }
});

test('the derivative of a composed exponential has a source card and the correct curve', async ({ page }) => {
  const x = 0.83;
  const derivativeRegion = aroundSample(x, 2 * x * Math.exp(x ** 2));
  const emptyDerivativeSample = await canvasHash(page, derivativeRegion);
  await enterCommand(page, 'Türev(Bileşke(exp(x),x^2))');
  const row = page.locator('#objectsContainer .expr-block');
  await expect(row).toHaveCount(1);
  await expect(row.locator('input[readonly]')).toHaveValue(/exp\s*\(/);
  await expect(row.locator('output')).toContainText('exp');
  await expect(row.locator('output')).not.toContainText('undefined');
  expect(await canvasHash(page, derivativeRegion), 'The derivative must equal 2x·exp(x²), rather than the original function').not.toBe(emptyDerivativeSample);
});

test('custom base-first logarithms differentiate correctly in derivatives and tangents', async ({ page }) => {
  const derivativeX = 1.37;
  const derivativeRegion = aroundSample(derivativeX, 1 / (derivativeX * Math.log(5)));
  const emptyDerivativeSample = await canvasHash(page, derivativeRegion);
  await enterCommand(page, 'Türev(log(5,x))');
  const row = page.locator('#objectsContainer .expr-block');
  await expect(row).toHaveCount(1);
  await expect(row.locator('input[readonly]')).toHaveValue(/log\s*\(\s*5\s*,\s*x\s*\)/);
  await expect(row.locator('output')).not.toHaveText('');
  expect(await canvasHash(page, derivativeRegion), 'd(log₅x)/dx must equal 1/(x·ln5)').not.toBe(emptyDerivativeSample);

  await page.locator('#clear').click();
  const tangentX = 2.37;
  const tangentRegion = aroundSample(tangentX, (tangentX - 1) / Math.log(5));
  const emptyTangentSample = await canvasHash(page, tangentRegion);
  await enterCommand(page, 'Teğet(log(5,x),1)');
  await expect(row).toHaveCount(1);
  await expect(row.locator('output')).toHaveText('f: y = 0.62x-0.62');
  expect(await canvasHash(page, tangentRegion), 'The tangent must use the base-first derivative').not.toBe(emptyTangentSample);
});

test('a derivative with a missing named function leaves the document and undo history intact', async ({ page }) => {
  await enterCommand(page, 'x^2');
  const row = page.locator('#objectsContainer .expr-block');
  await expect(row).toHaveCount(1);
  const originalInput = await row.locator('input[readonly]').inputValue();
  await enterCommand(page, 'Türev(Bileşke(f,g))');
  await expect(page.locator('#snackbar')).toHaveClass(/\bis-visible\b/);
  await expect(page.locator('#snackContent')).toContainText(/Fonksiyon|İfade/i);
  await expect(row).toHaveCount(1);
  await expect(row.locator('input[readonly]')).toHaveValue(originalInput);
  await page.locator('#undo').click();
  await expect(row).toHaveCount(0);
  await expect(page.locator('#undo')).toBeDisabled();
  await page.locator('#redo').click();
  await expect(row).toHaveCount(1);
  await expect(row.locator('input[readonly]')).toHaveValue(originalInput);
  await expect(page.locator('#redo')).toBeDisabled();
});

test('an unchanged secant slider preserves the picture and creates no undo step', async ({ page }) => {
  await enterCommand(page, 'TeğetH(x^2,1)');
  const row = page.locator('#objectsContainer .expr-block');
  await expect(row).toHaveCount(1);
  await expect(row.locator('output')).toHaveText('[f(1+h) - f(1)] / h = 4');
  const originalPicture = await canvasHash(page);
  const slider = page.locator('#objectsContainer .sliders input[type="range"]').first();
  await slider.evaluate((element: HTMLInputElement) => {
    element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await settlePaint(page);
  await slider.dispatchEvent('change');
  expect(await canvasHash(page), 'A no-op must preserve colors and rendered geometry').toBe(originalPicture);
  await page.locator('#undo').click();
  await expect(row).toHaveCount(0);
  await expect(page.locator('#undo')).toBeDisabled();
  await page.locator('#redo').click();
  await expect(row).toHaveCount(1);
  await expect(row.locator('input[readonly]')).toHaveValue('TeğetH(x^2,1)');
  await expect(row.locator('output')).toHaveText('[f(1+h) - f(1)] / h = 4');
  await expect(page.locator('#redo')).toBeDisabled();
});
