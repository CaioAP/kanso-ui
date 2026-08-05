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
          await page.getByRole('tab', { name: 'Field.tsx', exact: true }).click();
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

      test('the error replaces the description when the field turns invalid', async ({ page }) => {
        // Composition, resolved by the browser rather than by reading the
        // attribute: this is what a screen reader would actually announce.
        // One region of text below the control, so the description goes away
        // rather than being pushed down by the error.
        await knob(page, 'invalid').check();

        await expect(control(page)).toHaveAccessibleDescription('Enter an email address.');
        await expect(control(page)).toHaveAttribute('aria-invalid', 'true');
        await expect(stage(page).locator('[data-part="description"]')).toHaveCount(0);

        // And back, because a field that could never show its help text again
        // would pass every assertion above.
        await knob(page, 'invalid').uncheck();
        await expect(control(page)).toHaveAccessibleDescription('We only use this to sign you in.');
      });

      test('shows exactly one line of text below the control, in both states', async ({ page }) => {
        // The user-visible form of the rule, measured rather than inferred: the
        // error element stays mounted while valid — it is the live region — so
        // "one region" has to mean one region with any height, not one element.
        const visibleMessages = async () =>
          await stage(page)
            .locator('[data-part="description"], [data-part="error-text"]')
            .evaluateAll(
              (nodes) => nodes.filter((node) => node.getBoundingClientRect().height > 0).length,
            );

        expect(await visibleMessages()).toBe(1);

        await knob(page, 'invalid').check();
        expect(await visibleMessages()).toBe(1);
      });

      test('the empty live region does not pay for the layout gap', async ({ page }) => {
        // While valid, the error element is mounted and zero-height — but a
        // flex `gap` does not care about height, so it was adding 8px of dead
        // space below the message. Measured against the root's own bottom edge,
        // which is what a consumer sees when the field sits in a bordered card.
        const slack = await stage(page)
          .locator('[data-part="root"]')
          .evaluate((root) => {
            const boxes = [...root.children].map((child) => child.getBoundingClientRect());
            const lastWithHeight = boxes.filter((box) => box.height > 0).pop();
            return root.getBoundingClientRect().bottom - (lastWithHeight?.bottom ?? 0);
          });

        expect(slack).toBeLessThan(1);
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
