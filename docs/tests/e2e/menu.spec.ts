import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

/**
 * The checks a real browser has to make for Menu.
 *
 * Two of them are the reason this file exists at all. Where focus lands after
 * `Tab` cannot be asserted in jsdom — user-event computes the next tab stop
 * itself, from a DOM the framework has not finished unmounting — and the
 * collision fallback is pure layout, which jsdom does not do. See docs/04.
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

/**
 * Wait out the entry animation before scanning colours.
 *
 * The menu fades in over ~140ms, and axe computes contrast from *composited*
 * colours — so a scan that lands mid-fade measures a half-transparent label
 * against the page and reports a violation that does not exist once the
 * animation settles. It surfaced as a failure only in the serial run, which is
 * exactly how a timing-dependent scan behaves.
 */
const settled = (locator: ReturnType<Page['locator']>) =>
  locator.evaluate((element) =>
    Promise.all(element.getAnimations({ subtree: true }).map((animation) => animation.finished)),
  );

test.describe('Menu docs page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/components/menu/');
  });

  test('has no axe violations while every menu is closed', async ({ page }) => {
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
      const trigger = (page: Page) => stage(page).getByRole('button', { name: 'Actions' });
      const menu = (page: Page) => stage(page).getByRole('menu');
      const item = (page: Page, name: string) =>
        stage(page).getByRole('menuitem', { name, exact: true });
      const knob = (page: Page, name: string) => stage(page).getByLabel(name);

      test('opens and shows the items', async ({ page }) => {
        await trigger(page).click();

        await expect(menu(page)).toBeVisible();
        await expect(stage(page).getByRole('menuitem')).toHaveCount(5);
      });

      test('has no axe violations while open', async ({ page }) => {
        await trigger(page).click();
        await expect(menu(page)).toBeVisible();
        await settled(menu(page));

        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze();

        expect(results.violations).toEqual([]);
      });

      test('the arrows move focus and wrap', async ({ page }) => {
        await trigger(page).click();
        await expect(item(page, 'Archive')).toBeFocused();

        await page.keyboard.press('ArrowDown');
        await expect(item(page, 'Duplicate')).toBeFocused();

        await page.keyboard.press('ArrowUp');
        await page.keyboard.press('ArrowUp');
        await expect(item(page, 'Permissions')).toBeFocused();
      });

      test('ArrowUp on the trigger opens at the last item', async ({ page }) => {
        await trigger(page).focus();
        await page.keyboard.press('ArrowUp');

        await expect(item(page, 'Permissions')).toBeFocused();
      });

      test('typeahead jumps, and a repeated letter cycles', async ({ page }) => {
        // The waits are the feature, not flake-avoidance: consecutive keys are
        // one query, so "r" then "d" searches for "rd" and matches nothing.
        // Waiting past the ~500ms window starts a fresh query, which is exactly
        // what a user typing two separate letters experiences.
        await trigger(page).click();

        await page.keyboard.press('r');
        await expect(item(page, 'Rename')).toBeFocused();

        await page.waitForTimeout(600);
        await page.keyboard.press('d');
        await expect(item(page, 'Duplicate')).toBeFocused();

        await page.waitForTimeout(600);
        await page.keyboard.press('p');
        await expect(item(page, 'Permissions')).toBeFocused();

        // Immediately, so this is the same query: "pp" matches no prefix and
        // falls back to cycling the items starting with "p" — of which there is
        // one, so focus stays put.
        await page.keyboard.press('p');
        await expect(item(page, 'Permissions')).toBeFocused();
      });

      test('a longer prefix is matched as one query', async ({ page }) => {
        await trigger(page).click();

        await page.keyboard.press('r');
        await page.keyboard.press('e');

        // "re" — Rename, not the next item beginning with "e".
        await expect(item(page, 'Rename')).toBeFocused();
      });

      test('Tab closes the menu and moves focus on past the trigger', async ({ page }) => {
        // The assertion the whole no-trap decision rests on, and the one jsdom
        // cannot make: the handler closes and focuses the trigger *without*
        // preventing the default, so the browser continues its own Tab handling
        // from there.
        await trigger(page).click();
        await expect(menu(page)).toBeVisible();

        await page.keyboard.press('Tab');

        await expect(menu(page)).toHaveCount(0);
        await expect(trigger(page)).not.toBeFocused();
        // Focus is somewhere after the trigger — the knobs are the next stops.
        await expect(stage(page).locator(':focus')).toHaveCount(1);
      });

      test('Escape closes and returns focus to the trigger', async ({ page }) => {
        await trigger(page).click();
        await expect(menu(page)).toBeVisible();

        await page.keyboard.press('Escape');

        await expect(menu(page)).toHaveCount(0);
        await expect(trigger(page)).toBeFocused();
      });

      test('selecting reports the value, closes, and restores focus', async ({ page }) => {
        await trigger(page).click();
        await item(page, 'Duplicate').click();

        await expect(menu(page)).toHaveCount(0);
        await expect(stage(page).locator('[data-chosen]')).toHaveText('Chose: duplicate');
        await expect(trigger(page)).toBeFocused();
      });

      test('a disabled item is focusable and does nothing', async ({ page }) => {
        await trigger(page).click();

        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('ArrowDown');
        await expect(item(page, 'Share (unavailable)')).toBeFocused();

        await page.keyboard.press('Enter');
        await expect(menu(page)).toBeVisible();
        await expect(stage(page).locator('[data-chosen]')).toHaveText('Nothing chosen yet.');
      });

      test('the loop knob stops the wrap', async ({ page }) => {
        await knob(page, 'loop').uncheck();
        await trigger(page).click();

        await page.keyboard.press('ArrowUp');

        await expect(item(page, 'Archive')).toBeFocused();
      });

      test('the typeahead knob turns type-to-select off', async ({ page }) => {
        await knob(page, 'typeahead').uncheck();
        await trigger(page).click();

        await page.keyboard.press('r');

        await expect(item(page, 'Archive')).toBeFocused();
      });

      test('meets the target size minimum', async ({ page }) => {
        // WCAG 2.2 SC 2.5.8 wants 24x24 CSS pixels — for the items too, which
        // is where a menu usually fails it.
        await trigger(page).click();

        const box = await item(page, 'Archive').boundingBox();
        expect(box?.width ?? 0).toBeGreaterThanOrEqual(24);
        expect(box?.height ?? 0).toBeGreaterThanOrEqual(24);
      });

      test('the focused item is visibly focused, even when opened by pointer', async ({ page }) => {
        // Styled from :focus rather than :focus-visible, deliberately: focus
        // here is moved by script, and the browser's heuristic would hide the
        // ring exactly when a keyboard user navigates a mouse-opened menu.
        await trigger(page).click();
        await page.keyboard.press('ArrowDown');

        await expect(item(page, 'Duplicate')).toHaveCSS('outline-style', 'solid');
      });

      test('the menu is painted over the page, not squeezed into the flow', async ({ page }) => {
        // In flow but out of layout: `position: absolute` on the positioner is
        // what stops the menu from pushing the page around when it opens.
        const before = await stage(page).locator('[data-chosen]').boundingBox();

        await trigger(page).click();
        await expect(menu(page)).toBeVisible();

        const after = await stage(page).locator('[data-chosen]').boundingBox();
        expect(after?.y).toBeCloseTo(before?.y ?? 0, 0);
      });
    });
  }
});

test.describe('Menu placement', () => {
  test('flips above the trigger when there is no room below', async ({ page }) => {
    // The collision fallback, measured for real. jsdom lays nothing out, so
    // this is the only place the arithmetic meets an actual viewport.
    await page.setViewportSize({ width: 900, height: 420 });
    await page.goto('/embed/menu');

    const trigger = page.getByRole('button', { name: 'Actions' }).first();
    await trigger.scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(150);

    await trigger.click();
    const menu = page.getByRole('menu').first();
    await expect(menu).toBeVisible();

    const positioner = page.locator('[data-part="positioner"]').first();
    const placement = await positioner.getAttribute('data-placement');
    const menuBox = await menu.boundingBox();
    const triggerBox = await trigger.boundingBox();

    // Either it fitted below and stayed there, or it flipped — and if it
    // flipped, the menu really is above the trigger.
    if (placement?.startsWith('top')) {
      expect(menuBox?.y ?? 0).toBeLessThan(triggerBox?.y ?? 0);
    } else {
      expect((menuBox?.y ?? 0) + (menuBox?.height ?? 0)).toBeLessThanOrEqual(420);
    }
  });
});

test.describe('Menu embed route', () => {
  test('renders both frameworks with no chrome', async ({ page }) => {
    await page.goto('/embed/menu');

    await expect(page.getByRole('button', { name: 'Actions' })).toHaveCount(2);
    await expect(page.locator('nav')).toHaveCount(0);
  });

  test('honours the theme query parameter', async ({ page }) => {
    await page.goto('/embed/menu?theme=dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('has no axe violations, open or closed', async ({ page }) => {
    await page.goto('/embed/menu');

    const scan = () =>
      new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

    expect((await scan()).violations).toEqual([]);

    await page.getByRole('button', { name: 'Actions' }).first().click();
    await expect(page.getByRole('menu').first()).toBeVisible();
    await settled(page.getByRole('menu').first());

    expect((await scan()).violations).toEqual([]);
  });
});
