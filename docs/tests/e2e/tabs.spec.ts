import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

/**
 * The checks that only a real browser can make.
 *
 * jsdom does not load the stylesheet and its focus model is not trustworthy, so
 * everything here is something the vitest suites structurally cannot verify:
 * that the selected rule is actually painted, that a trigger is big enough to
 * hit, and that `Tab` really does step over the list in one press. See docs/04.
 */

const panel = (page: Page, framework: 'vue' | 'react') =>
  page.locator(`[data-panel="${framework}"]`);

/**
 * Wait for the island's JavaScript to arrive.
 *
 * The previews mount with `client:visible`, and the React one starts inside a
 * hidden panel — so it only begins hydrating once the framework toggle reveals
 * it. Server-rendered markup is fully present and fully inert before that, which
 * makes every "press a key, assert what moved" test a race: the keypress lands
 * on markup with no handler yet, and the assertion then waits five seconds for a
 * change that already failed to happen.
 *
 * Astro drops the `ssr` attribute from <astro-island> when hydration completes,
 * which is the only signal that distinguishes rendered from live.
 */
const hydrated = (page: Page, framework: 'vue' | 'react') =>
  expect(page.locator(`[data-panel="${framework}"] astro-island[ssr]`)).toHaveCount(0);

test.describe('Tabs docs page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/components/tabs/');
  });

  test('has no axe violations', async ({ page }) => {
    // A floor, not a ceiling. Note what it cannot see: an `aria-controls`
    // pointing at a panel that was never rendered is reported as *incomplete*,
    // not as a violation, which is why the panels are never unmounted and why
    // the vitest suites assert the idrefs resolve.
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
      const trigger = (page: Page, name: string) =>
        stage(page).getByRole('tab', { name, exact: true });

      test('shows one panel at a time', async ({ page }) => {
        await expect(stage(page).getByRole('tabpanel')).toHaveCount(1);
        await expect(stage(page).getByRole('tabpanel')).toContainText('display name');

        await trigger(page, 'Password').click();

        await expect(stage(page).getByRole('tabpanel')).toHaveCount(1);
        await expect(stage(page).getByRole('tabpanel')).toContainText('not used before');
      });

      test('keeps every panel in the DOM, hidden rather than removed', async ({ page }) => {
        // The reason aria-controls never dangles. `toHaveCount` on the role
        // would miss this — hidden panels leave the accessibility tree.
        await expect(stage(page).locator('[data-part="content"]')).toHaveCount(3);
      });

      test('paints the selected rule — the non-colour state cue', async ({ page }) => {
        // Not visible to jsdom at all: no stylesheet, no pseudo-elements.
        const ruleColour = (name: string) =>
          trigger(page, name).evaluate((el) => getComputedStyle(el, '::after').backgroundColor);

        const selectedBefore = await ruleColour('Account');
        const unselectedBefore = await ruleColour('Password');
        expect(selectedBefore).not.toBe(unselectedBefore);

        await trigger(page, 'Password').click();
        await page.waitForTimeout(250);

        expect(await ruleColour('Password')).toBe(selectedBefore);
        expect(await ruleColour('Account')).toBe(unselectedBefore);
      });

      test('meets the target size minimum', async ({ page }) => {
        // WCAG 2.2 SC 2.5.8 wants 24x24 CSS pixels. Invisible without layout —
        // the switch shipped a failing 36x20 track past every unit test.
        const box = await trigger(page, 'Account').boundingBox();
        expect(box?.width ?? 0).toBeGreaterThanOrEqual(24);
        expect(box?.height ?? 0).toBeGreaterThanOrEqual(24);
      });

      test('Tab steps over the whole list in one press', async ({ page }) => {
        const account = trigger(page, 'Account');

        await account.focus();
        await expect(account).toBeFocused();

        await page.keyboard.press('Tab');

        // Not the second tab — the panel. This is the entire point of a roving
        // tabindex, and it is the assertion that fails if every trigger gets 0.
        await expect(stage(page).getByRole('tabpanel')).toBeFocused();
      });

      test('the arrows move focus and select, in automatic mode', async ({ page }) => {
        await trigger(page, 'Account').focus();

        await page.keyboard.press('ArrowRight');
        await expect(trigger(page, 'Password')).toBeFocused();
        await expect(trigger(page, 'Password')).toHaveAttribute('aria-selected', 'true');

        await page.keyboard.press('End');
        await expect(trigger(page, 'Sessions')).toBeFocused();

        await page.keyboard.press('Home');
        await expect(trigger(page, 'Account')).toBeFocused();
      });

      test('wraps past the ends, and stops when the loop knob is off', async ({ page }) => {
        await trigger(page, 'Account').focus();
        await page.keyboard.press('ArrowLeft');
        await expect(trigger(page, 'Sessions')).toBeFocused();

        await stage(page).getByLabel('loop').uncheck();

        await trigger(page, 'Account').focus();
        await page.keyboard.press('ArrowLeft');
        await expect(trigger(page, 'Account')).toBeFocused();
      });

      test('the manual knob moves focus without selecting', async ({ page }) => {
        await stage(page).getByLabel('manual').check();

        await trigger(page, 'Account').focus();
        await page.keyboard.press('ArrowRight');

        await expect(trigger(page, 'Password')).toBeFocused();
        await expect(trigger(page, 'Password')).toHaveAttribute('aria-selected', 'false');

        await page.keyboard.press('Enter');
        await expect(trigger(page, 'Password')).toHaveAttribute('aria-selected', 'true');
      });

      test('the vertical knob swaps which arrows do the work', async ({ page }) => {
        await stage(page).getByLabel('vertical').check();

        await trigger(page, 'Account').focus();

        await page.keyboard.press('ArrowRight');
        await expect(trigger(page, 'Account')).toBeFocused();

        await page.keyboard.press('ArrowDown');
        await expect(trigger(page, 'Password')).toBeFocused();
      });

      test('shows a focus ring on keyboard focus but not on click', async ({ page }) => {
        const account = trigger(page, 'Account');

        await account.click();
        await expect(account).not.toHaveCSS('outline-style', 'solid');

        await page.keyboard.press('Shift+Tab');
        await page.keyboard.press('Tab');
        await expect(account).toBeFocused();
        await expect(account).toHaveCSS('outline-style', 'solid');
      });
    });
  }
});

test.describe('Tabs embed route', () => {
  test('renders both frameworks with no chrome', async ({ page }) => {
    await page.goto('/embed/tabs');

    await expect(page.getByRole('tablist')).toHaveCount(2);
    await expect(page.locator('nav')).toHaveCount(0);
  });

  test('honours the theme query parameter', async ({ page }) => {
    await page.goto('/embed/tabs?theme=dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('has no axe violations', async ({ page }) => {
    await page.goto('/embed/tabs');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
