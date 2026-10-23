import { expect, test, type Page } from '@playwright/test';
import { legacyCommandBaseline } from './fixtures/legacy-command-baseline';
import { legacyCommandMatrix } from './fixtures/legacy-command-matrix';

type ObjectRow = { input: string; output: string };
const runtimeFailures = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const failures: string[] = [];
  runtimeFailures.set(page, failures);
  page.on('pageerror', error => failures.push(`JavaScript: ${error.message}`));
  page.on('response', response => {
    if (response.status() >= 400) {
      failures.push(`HTTP ${response.status()}: ${response.url()}`);
    }
  });
  page.on('requestfailed', request => {
    failures.push(`Request: ${request.url()} (${request.failure()?.errorText})`);
  });
  await page.goto('/');
  await expect(page.locator('#giris')).toBeVisible();
  await expect(page.locator('#canvas')).toBeVisible();
});

test.afterEach(async ({ page }) => {
  expect(runtimeFailures.get(page), 'JavaScript errors or missing assets').toEqual([]);
});

async function objectRows(page: Page): Promise<ObjectRow[]> {
  return page.locator('#objectsContainer .expr-block').evaluateAll(rows => rows.map(row => ({
    input: row.querySelector('input')!.value,
    output: row.querySelector('output')!.value,
  })));
}

async function canvasHash(page: Page): Promise<number> {
  return page.locator('#canvas').evaluate(async (canvas: HTMLCanvasElement) => {
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
    let hash = 2166136261;
    for (const value of pixels) hash = Math.imul(hash ^ value, 16777619);
    return hash >>> 0;
  });
}

test('panel, radial tools, help examples and drawing remain usable', async ({ page }) => {
  await expect(page).toHaveTitle('drAW2D | mADEMatik');
  await expect(page.locator('#objectsContainer .expr-block')).toHaveCount(0);

  await page.locator('#btnCalc').click();
  await expect(page.locator('#rightWrapper')).toHaveClass(/\bhide\b/);
  await expect(page.locator('#btnCalc')).toHaveAttribute('title', 'Paneli Göster');
  await page.locator('#btnCalc').click();
  await expect(page.locator('#rightWrapper')).not.toHaveClass(/\bhide\b/);

  const emptyCanvas = await canvasHash(page);
  // The point group's button chooses its default tool, the point.
  await page.locator('#toolgroup-point').click();
  await expect(page.locator('#mainToolbar')).toHaveAttribute('data-action', 'point');
  await page.locator('#canvas').click({ position: { x: 800, y: 250 } });
  await expect.poll(() => objectRows(page)).toEqual([{ input: 'A=(3,2.50)', output: '' }]);
  expect(await canvasHash(page), 'The point must be rendered on the canvas').not.toBe(emptyCanvas);

  await page.locator('#helpMenuButton').click();
  await expect(page.locator('#help-popup')).toBeVisible();
  await page.locator('#helpSearch').fill('türev');
  const topic = page.locator('.help-topic:not([hidden])');
  await expect(topic).toHaveCount(1);
  await expect(topic.locator('summary')).toHaveText('Türev');
  await topic.locator('.example').click();
  await expect(page.locator('#giris')).toHaveValue('Türev(sin(x+1))');
  await expect(page.locator('#help-popup')).toBeHidden();
});

test('legacy command outputs, canvas rendering and undo/redo/clear are preserved', async ({ page }) => {
  await expect(page.locator('#undo')).toBeDisabled();
  await expect(page.locator('#redo')).toBeDisabled();
  await expect(page.locator('#clear')).toBeDisabled();

  const emptyCanvas = await canvasHash(page);
  const states: ObjectRow[][] = [[]];
  let expectedRows: ObjectRow[] = [];
  for (const step of legacyCommandBaseline) {
    await page.locator('#giris').fill(step.command);
    await page.locator('#giris').press('Enter');
    expectedRows = [...step.addedRows, ...expectedRows];
    states.push(expectedRows);
    await expect.poll(() => objectRows(page), `Output for ${step.command}`).toEqual(expectedRows);
    await expect(page.locator('#giris')).toHaveValue('');
  }
  expect(await canvasHash(page), 'Commands must draw their objects').not.toBe(emptyCanvas);

  await page.locator('#undo').click();
  await expect.poll(() => objectRows(page)).toEqual(states.at(-2));
  await expect(page.locator('#redo')).toBeEnabled();
  await page.locator('#redo').click();
  await expect.poll(() => objectRows(page)).toEqual(expectedRows);
  await expect(page.locator('#redo')).toBeDisabled();

  await page.locator('#clear').click();
  await expect(page.locator('#objectsContainer .expr-block')).toHaveCount(0);
  await expect(page.locator('#clear')).toBeDisabled();
  expect(await canvasHash(page), 'Clear restores the coordinate grid').toBe(emptyCanvas);

  await page.locator('#undo').click();
  await expect.poll(() => objectRows(page)).toEqual(expectedRows);
  await page.locator('#redo').click();
  await expect(page.locator('#objectsContainer .expr-block')).toHaveCount(0);
});

test.describe('legacy command matrix', () => {
  // Keep these small, independent cases in one worker instead of opening many
  // Chromium processes at once when the global fullyParallel option is enabled.
  test.describe.configure({ mode: 'default' });

  for (const scenario of legacyCommandMatrix) {
    test(scenario.name, async ({ page }) => {
      for (const step of scenario.steps) {
        await test.step(step.command, async () => {
          await page.locator('#giris').fill(step.command);
          await page.locator('#giris').press('Enter');
          await expect.poll(() => objectRows(page)).toEqual(step.rows);
          await expect(page.locator('#giris')).toHaveValue('');
        });
      }
    });
  }
});
