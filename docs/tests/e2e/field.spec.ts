import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

/**
 * The checks a real browser has to make for Field.
 *
 * jsdom can assert the attribute; only a browser can compute the accessible
 * description the way an assistive technology will, resolve the idref list, and
 * measure the target size. See docs/04.
 */

const panel = (page: Page, framework: 'vue' | 'react') =>
  page.locator(`[data-panel="${framework}"]`);

/**
 * Wait for the island's JavaScript to arrive. The previews mount with
 * `client:visible`, and the React one starts inside a hidden panel, so it only
 * hydrates once the framework toggle reveals it. Astro drops the `ssr`
 * attribute from <astro-island> when hydration completes.
 */
const hydrated = (page: Page, framework: 'vue' | 'react') =>
  expect(page.locator(`[data-panel="${framework}"] astro-island[ssr]`)).toHaveCount(0);

test.describe('Field docs page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/components/field/');
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
      const control = (page: Page) => stage(page).getByLabel('Email');
      const knob = (page: Page, name: string) => stage(page).getByLabel(name);

      test('the label names the control', async ({ page }) => {
        await expect(control(page)).toHaveCount(1);
        await expect(control(page)).toHaveAttribute('type', 'email');
      });

      test('clicking the label focuses the control', async ({ page }) => {
        // The half of the association that no ARIA attribute provides, and the
        // reason this uses a native `for` rather than aria-labelledby.
        await stage(page).getByText('Email', { exact: true }).click();
        await expect(control(page)).toBeFocused();
      });

      test('the description is the accessible description while valid', async ({ page }) => {
        await expect(control(page)).toHaveAccessibleDescription('We only use this to sign you in.');
      });

      test('the error joins the description when the field turns invalid', async ({ page }) => {
        // Composition, resolved by the browser rather than by reading the
        // attribute: this is what a screen reader would actually announce.
        await knob(page, 'invalid').check();

        await expect(control(page)).toHaveAccessibleDescription(
          'We only use this to sign you in. Enter an email address.',
        );
        await expect(control(page)).toHaveAttribute('aria-invalid', 'true');
      });

      test('the live region is present and empty before the error appears', async ({ page }) => {
        // A live region announces changes to a region already in the document.
        // If this element only appeared with its message, the announcement
        // would fire in some screen readers and not others.
        const region = stage(page).locator('[data-part="error-text"]');

        await expect(region).toHaveAttribute('aria-live', 'polite');
        await expect(region).toBeEmpty();

        await knob(page, 'invalid').check();
        await expect(region).toHaveText('Enter an email address.');
      });

      test('the invalid state is not carried by colour alone', async ({ page }) => {
        const before = await control(page).evaluate(
          (element) => getComputedStyle(element).borderTopWidth,
        );

        await knob(page, 'invalid').check();

        const after = await control(page).evaluate(
          (element) => getComputedStyle(element).borderTopWidth,
        );
        expect(Number.parseFloat(after)).toBeGreaterThan(Number.parseFloat(before));
      });

      test('a required empty control is not styled as invalid', async ({ page }) => {
        // The whole reason the stylesheet keys off data-invalid and never
        // :invalid. `required` on an empty control matches :invalid from the
        // moment the page loads.
        await expect(control(page)).toHaveAttribute('required', '');
        await expect(control(page)).not.toHaveAttribute('data-invalid', '');
      });

      test('meets the target size minimum', async ({ page }) => {
        const box = await control(page).boundingBox();
        expect(box?.height ?? 0).toBeGreaterThanOrEqual(24);
      });

      test('has no axe violations while invalid', async ({ page }) => {
        await knob(page, 'invalid').check();
        await expect(control(page)).toHaveAttribute('aria-invalid', 'true');

        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze();

        expect(results.violations).toEqual([]);
      });

      test('a disabled field is not focusable', async ({ page }) => {
        await knob(page, 'disabled').check();
        await expect(control(page)).toBeDisabled();
      });
    });
  }
});

test.describe('Field embed route', () => {
  test('renders both frameworks with no chrome', async ({ page }) => {
    await page.goto('/embed/field');

    await expect(page.getByLabel('Email')).toHaveCount(2);
    await expect(page.locator('nav')).toHaveCount(0);
  });

  test('honours the theme query parameter', async ({ page }) => {
    await page.goto('/embed/field?theme=dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('has no axe violations, valid or invalid', async ({ page }) => {
    await page.goto('/embed/field');

    const scan = () =>
      new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

    expect((await scan()).violations).toEqual([]);

    for (const box of await page.getByLabel('invalid').all()) {
      await box.check();
    }
    await expect(page.getByLabel('Email').first()).toHaveAttribute('aria-invalid', 'true');

    expect((await scan()).violations).toEqual([]);
  });
});
