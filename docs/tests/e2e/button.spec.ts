import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

/**
 * The checks a real browser has to make for Button.
 *
 * Two of them cannot be made anywhere else: the 44px floor is layout, which
 * jsdom does not do, and "the label is faded but still names the button" is a
 * computed style plus an accessible name. See docs/04.
 */

const panel = (page: Page, framework: 'vue' | 'react') =>
  page.locator(`[data-panel="${framework}"]`);

const hydrated = (page: Page, framework: 'vue' | 'react') =>
  expect(page.locator(`[data-panel="${framework}"] astro-island[ssr]`)).toHaveCount(0);

test.describe('Button docs page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/components/button/');
  });

  test('has no axe violations', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  // The same assertions against both frameworks. If these ever diverge, the
  // thesis is broken — behaviour is meant to live once, in core.
  for (const framework of ['vue', 'react'] as const) {
    test.describe(`${framework} island`, () => {
      test.beforeEach(async ({ page }) => {
        if (framework === 'react') {
          await page.getByRole('tab', { name: 'React', exact: true }).click();
        }
        await hydrated(page, framework);
      });

      const stage = (page: Page) => panel(page, framework);
      const button = (page: Page) => stage(page).getByRole('button', { name: 'Save changes' });
      const presses = (page: Page) => stage(page).locator('[data-presses]');
      const knob = (page: Page, name: string) => stage(page).getByLabel(name);

      test('a press runs the consumer’s handler', async ({ page }) => {
        // Core's props are applied last, so a core onClick that did not compose
        // would delete the handler — and the button would look and scan fine.
        await button(page).click();
        await expect(presses(page)).toHaveText('Presses: 1');
      });

      test('loading blocks the press but keeps the button focusable', async ({ page }) => {
        await knob(page, 'loading').check();

        await button(page).click();
        await expect(presses(page)).toHaveText('Presses: 0');

        await button(page).focus();
        await expect(button(page)).toBeFocused();
        await expect(button(page)).toHaveAttribute('aria-busy', 'true');
      });

      test('loading keeps the accessible name under the spinner', async ({ page }) => {
        // The label is faded with opacity, never visibility or display — both
        // of those would remove it from the a11y tree along with the name.
        await knob(page, 'loading').check();

        await expect(button(page)).toHaveAccessibleName('Save changes');

        const label = stage(page).locator('[data-part="label"]');
        await expect(label).toHaveCSS('opacity', '0');
        await expect(label).not.toHaveCSS('visibility', 'hidden');
        await expect(label).not.toHaveCSS('display', 'none');
      });

      test('every size keeps the 44px floor', async ({ page }) => {
        // docs/03 §6 decision 5: `sm` is narrower and lighter, not shorter.
        for (const size of ['sm', 'md', 'lg']) {
          await knob(page, 'size').selectOption(size);
          const box = await button(page).boundingBox();
          expect(box?.height ?? 0, `size=${size}`).toBeGreaterThanOrEqual(44);
          expect(box?.width ?? 0, `size=${size}`).toBeGreaterThanOrEqual(44);
        }
      });

      test('every variant has no axe violations', async ({ page }) => {
        for (const variant of ['solid', 'outline', 'ghost']) {
          await knob(page, 'variant').selectOption(variant);

          const results = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
            .analyze();

          expect(results.violations, `variant=${variant}`).toEqual([]);
        }
      });

      test('disabled removes it from the tab order, unlike loading', async ({ page }) => {
        await knob(page, 'disabled').check();
        await expect(button(page)).toBeDisabled();

        await knob(page, 'disabled').uncheck();
        await knob(page, 'loading').check();
        await expect(button(page)).toBeEnabled();
      });
    });
  }
});

test.describe('Button embed route', () => {
  test('renders both frameworks with no chrome', async ({ page }) => {
    await page.goto('/embed/button');

    await expect(page.getByRole('button', { name: 'Save changes' })).toHaveCount(2);
    await expect(page.locator('nav')).toHaveCount(0);
  });

  test('honours the theme query parameter', async ({ page }) => {
    await page.goto('/embed/button?theme=dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('has no axe violations', async ({ page }) => {
    await page.goto('/embed/button');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
