import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

/**
 * The checks that only a real browser can make.
 *
 * jsdom does not load the stylesheet and its focus model is not trustworthy, so
 * everything here is something the vitest suites structurally cannot verify:
 * that the thumb actually moves, that the hidden input is clipped rather than
 * removed from constraint validation, and that focus lands where it should.
 * See docs/04.
 */

const panel = (page: Page, framework: 'vue' | 'react') =>
  page.locator(`[data-panel="${framework}"]`);

/**
 * Wait for the island's JavaScript to arrive.
 *
 * The previews mount with `client:visible`, and the React one starts inside a
 * hidden panel — so it only begins hydrating once the framework toggle reveals
 * it. Server-rendered markup is fully present and fully inert before that, which
 * makes every "click, then assert what changed" test a race the suite usually
 * wins and occasionally does not.
 *
 * Astro drops the `ssr` attribute from <astro-island> when hydration completes,
 * which is the only signal that distinguishes rendered from live.
 */
const hydrated = (page: Page, framework: 'vue' | 'react') =>
  expect(page.locator(`[data-panel="${framework}"] astro-island[ssr]`)).toHaveCount(0);

test.describe('Switch docs page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/components/switch/');
  });

  test('has no axe violations', async ({ page }) => {
    // A floor, not a ceiling — it cannot see any of the behaviour below. It did
    // catch one real defect the unit tests could not: a 36x20 track failing
    // SC 2.5.8 target size, which is invisible without layout.
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('the framework toggle swaps panels and source together', async ({ page }) => {
    await expect(panel(page, 'vue')).toBeVisible();
    await expect(panel(page, 'react')).toBeHidden();
    await expect(page.locator('[data-source="vue"]')).toBeVisible();
    await expect(page.locator('[data-source="react"]')).toBeHidden();

    await page.getByRole('tab', { name: 'Switch.tsx' }).click();

    // One tab, two regions. It is the file tab on the source block, so if it
    // moved the panel and left the source showing Vue it would be lying about
    // its own name.
    await expect(panel(page, 'react')).toBeVisible();
    await expect(panel(page, 'vue')).toBeHidden();
    await expect(page.locator('[data-source="react"]')).toBeVisible();
    await expect(page.locator('[data-source="vue"]')).toBeHidden();
  });

  /**
   * Starlight's markdown stylesheet puts `margin-top: 1rem` on every element
   * that has a preceding sibling, and component pages *are* markdown — so the
   * preview inherited it. The switch label dropped 16px below its own track,
   * the second framework tab sat lower than the first, and the field's error
   * message gained 16px on top of the field's own gap.
   *
   * `class="not-content"` on the preview root is the fix. This test is what
   * keeps it there: the class is invisible, does nothing locally, and is exactly
   * the kind of thing a later edit removes while tidying. See docs/09 Phase 5.2.
   */
  test('is exempt from Starlight markdown margins', async ({ page }) => {
    const margins = await page.evaluate(() =>
      [...document.querySelectorAll('[data-preview] *')]
        .filter((el) => getComputedStyle(el).marginTop !== '0px')
        .map((el) => `${el.tagName.toLowerCase()}[data-part=${el.getAttribute('data-part')}]`),
    );

    expect(margins).toEqual([]);
  });

  /**
   * The tabs are filenames sitting on top of a code block, so they have to read
   * as filenames. The first attempt used the `font` shorthand with a family-list
   * custom property, which is invalid at computed-value time — the declaration
   * dropped silently and the tabs rendered in the prose face. Nothing but a
   * computed-style comparison can see that.
   */
  test('the file tabs are set in the same face as the code below them', async ({ page }) => {
    const tab = page.getByRole('tab', { name: 'Switch.vue' });
    // `pre > code`, not `pre`. Expressive Code puts --ec-codeFontFml on the
    // inner code element; the `pre` keeps the UA stylesheet's bare `monospace`.
    const code = page.locator('[data-source="vue"] pre > code').first();

    const [tabFont, codeFont] = await Promise.all([
      tab.evaluate((el) => getComputedStyle(el).fontFamily),
      code.evaluate((el) => getComputedStyle(el).fontFamily),
    ]);

    // First family, not the whole string: Starlight's own `--__sl-font-mono`
    // appends its fallback list a second time, so the two stacks are equivalent
    // without being character-identical.
    const first = (stack: string) => stack.split(',')[0]?.trim();

    expect(first(tabFont)).toBe(first(codeFont));
    expect(first(tabFont)).not.toBe('monospace');
  });

  test('centres the label on the track rather than below it', async ({ page }) => {
    const control = panel(page, 'vue').locator('[data-part="control"]');
    const label = panel(page, 'vue').locator('[data-part="label"]');

    const [a, b] = await Promise.all([control.boundingBox(), label.boundingBox()]);
    const centre = (box: Awaited<ReturnType<typeof control.boundingBox>>) =>
      (box?.y ?? 0) + (box?.height ?? 0) / 2;

    // Sub-pixel, not exact: line-height rounding is legitimate, 16px of stray
    // margin is not.
    expect(Math.abs(centre(a) - centre(b))).toBeLessThan(1);
  });

  test('the framework toggle is operable by keyboard', async ({ page }) => {
    const vueTab = page.getByRole('tab', { name: 'Switch.vue' });
    const reactTab = page.getByRole('tab', { name: 'Switch.tsx' });

    await vueTab.focus();
    await page.keyboard.press('ArrowRight');

    await expect(reactTab).toBeFocused();
    await expect(reactTab).toHaveAttribute('aria-selected', 'true');
    await expect(vueTab).toHaveAttribute('aria-selected', 'false');

    // Roving tabindex: the unselected tab leaves the tab order entirely.
    await expect(vueTab).toHaveAttribute('tabindex', '-1');

    await page.keyboard.press('ArrowLeft');
    await expect(vueTab).toBeFocused();
    await expect(vueTab).toHaveAttribute('aria-selected', 'true');
  });

  // The same assertions against both frameworks. If these ever diverge, the
  // thesis is broken — behaviour is meant to live once, in core.
  for (const framework of ['vue', 'react'] as const) {
    test.describe(`${framework} island`, () => {
      test.beforeEach(async ({ page }) => {
        if (framework === 'react') {
          await page.getByRole('tab', { name: 'Switch.tsx' }).click();
        }
        await hydrated(page, framework);
      });

      test('toggles on click, Space and Enter', async ({ page }) => {
        const control = panel(page, framework).getByRole('switch');

        await expect(control).toHaveAttribute('aria-checked', 'false');

        await control.click();
        await expect(control).toHaveAttribute('aria-checked', 'true');

        await control.press(' ');
        await expect(control).toHaveAttribute('aria-checked', 'false');

        await control.press('Enter');
        await expect(control).toHaveAttribute('aria-checked', 'true');
      });

      test('moves the thumb — position is the state cue, not colour', async ({ page }) => {
        // The reason this test is here and not in vitest: jsdom applies no
        // stylesheet, so the transform simply does not exist there.
        const control = panel(page, framework).getByRole('switch');
        const thumb = panel(page, framework).locator('[data-part="thumb"]');

        const before = await thumb.boundingBox();
        await control.click();
        // Let the transition finish before measuring.
        await expect(control).toHaveAttribute('aria-checked', 'true');
        await page.waitForTimeout(250);
        const after = await thumb.boundingBox();

        expect(before).not.toBeNull();
        expect(after).not.toBeNull();
        expect(after?.x ?? 0).toBeGreaterThan(before?.x ?? 0);
      });

      test('shows a focus ring on keyboard focus but not on click', async ({ page }) => {
        const control = panel(page, framework).getByRole('switch');

        await control.click();
        await expect(control).not.toHaveCSS('outline-style', 'solid');

        await page.keyboard.press('Shift+Tab');
        await page.keyboard.press('Tab');
        await expect(control).toBeFocused();
        await expect(control).toHaveCSS('outline-style', 'solid');
      });

      test('the disabled knob removes it from the tab order', async ({ page }) => {
        const stage = panel(page, framework);
        const control = stage.getByRole('switch');

        await stage.getByLabel('disabled').check();

        await expect(control).toBeDisabled();
        await control.click({ force: true });
        await expect(control).toHaveAttribute('aria-checked', 'false');
      });

      test('the readOnly knob keeps it focusable but refuses writes', async ({ page }) => {
        const stage = panel(page, framework);
        const control = stage.getByRole('switch');

        await stage.getByLabel('readOnly').check();

        await control.focus();
        await expect(control).toBeFocused();
        await expect(control).toHaveAttribute('aria-readonly', 'true');

        await control.press(' ');
        await expect(control).toHaveAttribute('aria-checked', 'false');
      });
    });
  }
});

test.describe('Switch in a form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/e2e/switch-form');
  });

  test('required blocks submission while unchecked', async ({ page }) => {
    // The load-bearing test for the stylesheet: if the hidden input were
    // `display: none` the browser would skip it during constraint validation,
    // submission would go through, and `required` would be decoration.
    await page.getByRole('button', { name: 'Submit', exact: true }).click();

    await expect(page).not.toHaveURL(/terms=/);

    const { willValidate, valid } = await page
      .locator('[data-part="hidden-input"][name="terms"]')
      .evaluate((input: HTMLInputElement) => ({
        willValidate: input.willValidate,
        valid: input.checkValidity(),
      }));

    // willValidate is the one that catches the subtle failure: a `readonly`
    // checkbox is barred from constraint validation entirely, so checkValidity()
    // returns true and `required` becomes decoration.
    expect(willValidate).toBe(true);
    expect(valid).toBe(false);
  });

  test('required submits once checked', async ({ page }) => {
    await page.getByRole('switch', { name: 'Accept the terms' }).click();
    await page.getByRole('button', { name: 'Submit', exact: true }).click();

    await expect(page).toHaveURL(/terms=on/);
  });

  test('the hidden input is clipped, not removed from the layout', async ({ page }) => {
    const input = page.locator('[data-part="hidden-input"][name="terms"]');

    // Absolutely positioned, so `display` computes to block — the point is only
    // that it is neither `none` nor `visibility: hidden`, either of which would
    // take it out of constraint validation or the form.
    await expect(input).not.toHaveCSS('display', 'none');
    await expect(input).not.toHaveCSS('visibility', 'hidden');
    // Clipped to a single pixel and unclickable, so it can never intercept a
    // press meant for the control.
    await expect(input).toHaveCSS('pointer-events', 'none');
    const box = await input.boundingBox();
    expect(box?.width).toBeLessThanOrEqual(1);
  });

  test('the hidden input is not a second tab stop', async ({ page }) => {
    await page.locator('h1').click();
    await page.keyboard.press('Tab');

    // One switch, one tab stop. If the mirror were focusable this would land
    // on the input instead.
    await expect(page.getByRole('switch', { name: 'Accept the terms' })).toBeFocused();
  });

  test('has no axe violations', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});

test.describe('Switch embed route', () => {
  test('renders both frameworks with no chrome', async ({ page }) => {
    await page.goto('/embed/switch');

    await expect(page.getByRole('switch')).toHaveCount(2);
    await expect(page.locator('nav')).toHaveCount(0);
  });

  test('honours the theme query parameter', async ({ page }) => {
    await page.goto('/embed/switch?theme=dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('has no axe violations', async ({ page }) => {
    await page.goto('/embed/switch');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
