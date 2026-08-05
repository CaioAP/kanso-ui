import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

/**
 * The checks a real browser has to make for Card.
 *
 * The component has no behaviour, so there is only one interesting question and
 * it is pure layout: does the whole-card link actually cover the card, and does
 * it really swallow the second control? Both are hit-testing, which jsdom
 * cannot do at all. See docs/04.
 */

const panel = (page: Page, framework: 'vue' | 'react') =>
  page.locator(`[data-panel="${framework}"]`);

const hydrated = (page: Page, framework: 'vue' | 'react') =>
  expect(page.locator(`[data-panel="${framework}"] astro-island[ssr]`)).toHaveCount(0);

test.describe('Card docs page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/components/card/');
  });

  test('has no axe violations', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  for (const framework of ['vue', 'react'] as const) {
    test.describe(`${framework} island`, () => {
      test.beforeEach(async ({ page }) => {
        if (framework === 'react') {
          await page.getByRole('tab', { name: 'Card.tsx', exact: true }).click();
        }
        await hydrated(page, framework);
      });

      const stage = (page: Page) => panel(page, framework);
      const card = (page: Page) => stage(page).locator('[data-scope="card"]');
      const link = (page: Page) => stage(page).getByRole('link', { name: 'Kanso' });
      const secondary = (page: Page) => stage(page).locator('[data-secondary]');
      const knob = (page: Page, name: string) => stage(page).getByLabel(name);

      /** What the browser would hit at the centre of the card's body. */
      const elementAtCardCentre = async (page: Page) => {
        const box = await card(page).boundingBox();
        return page.evaluate(
          ([x, y]) => {
            const element = document.elementFromPoint(x as number, y as number);
            return element?.tagName ?? '';
          },
          [(box?.x ?? 0) + (box?.width ?? 0) / 2, (box?.y ?? 0) + (box?.height ?? 0) / 2],
        );
      };

      test('renders the tag the `as` prop asks for', async ({ page }) => {
        await expect(card(page)).toHaveCount(1);
        expect(await card(page).evaluate((element) => element.tagName)).toBe('ARTICLE');

        await knob(page, 'as').selectOption('section');
        expect(await card(page).evaluate((element) => element.tagName)).toBe('SECTION');
      });

      test('leaves the second control reachable by default', async ({ page }) => {
        await expect(secondary(page)).toBeVisible();
        expect(await elementAtCardCentre(page)).not.toBe('A');
      });

      test('the whole-card link really covers the card', async ({ page }) => {
        // Not the link's own text box — the overlay. Asserting on the pseudo
        // element is impossible, so ask the browser what it would hit.
        await knob(page, 'whole-card link').check();
        expect(await elementAtCardCentre(page)).toBe('A');
      });

      test('and that is exactly why the second control becomes unreachable', async ({ page }) => {
        // The documented cost, asserted rather than asserted-away. If this test
        // ever starts failing because someone "fixed" it with z-index, the
        // pattern has been broken rather than improved — a card with two
        // actions should not be one big link.
        await knob(page, 'whole-card link').check();

        const box = await secondary(page).boundingBox();
        const covering = await page.evaluate(
          ([x, y]) => document.elementFromPoint(x as number, y as number)?.tagName ?? '',
          [(box?.x ?? 0) + (box?.width ?? 0) / 2, (box?.y ?? 0) + (box?.height ?? 0) / 2],
        );

        expect(covering).toBe('A');
      });

      test('the whole-card link still has one sensible accessible name', async ({ page }) => {
        await knob(page, 'whole-card link').check();
        await expect(link(page)).toHaveAccessibleName('Kanso');
        await expect(stage(page).getByRole('link')).toHaveCount(1);
      });

      test('has no axe violations with the whole-card link on', async ({ page }) => {
        await knob(page, 'whole-card link').check();

        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze();

        expect(results.violations).toEqual([]);
      });
    });
  }
});

test.describe('Card embed route', () => {
  test('renders both frameworks with no chrome', async ({ page }) => {
    await page.goto('/embed/card');

    await expect(page.locator('[data-scope="card"]')).toHaveCount(2);
    await expect(page.locator('nav')).toHaveCount(0);
  });

  test('honours the theme query parameter', async ({ page }) => {
    await page.goto('/embed/card?theme=dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('has no axe violations', async ({ page }) => {
    await page.goto('/embed/card');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
