import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

/**
 * The Starlight theming, asserted in a browser because nothing else can see it.
 *
 * `src/styles/starlight.css` maps --sl-color-* onto --kanso-* from a single
 * bare :root block, and that only works because the file is unlayered and
 * Starlight's own palette is not. If it were ever moved into a layer, or the
 * customCss order were flipped, light mode would keep looking correct and dark
 * mode would silently fall back to Starlight's stock blue-grey — Starlight's
 * :root[data-theme='light'] block would go on winning while the bare :root one
 * it also ships would not.
 *
 * So the assertion that matters is not "the mapping is written down". It is
 * "the mapping resolves, in both themes, to two different palettes". Reading
 * the CSS cannot tell you that; a build cannot either.
 */

/** Resolve a custom property the way the cascade actually resolved it. */
const token = (page: Page, name: string) =>
  page.evaluate(
    (property) => getComputedStyle(document.documentElement).getPropertyValue(property).trim(),
    name,
  );

const setTheme = (page: Page, theme: 'light' | 'dark') =>
  // Set the attribute Starlight's own theme control sets. Going through the
  // <select> would test Starlight's script; this tests the stylesheet.
  page.evaluate((value) => {
    document.documentElement.dataset.theme = value;
  }, theme);

/**
 * Every Starlight variable this site remaps, and the kanso token it must
 * resolve to. Keep in step with src/styles/starlight.css — a pair dropped from
 * the stylesheet and left here fails, which is the point.
 */
const mapped: ReadonlyArray<readonly [starlight: string, kanso: string]> = [
  ['--sl-color-white', '--kanso-fg'],
  ['--sl-color-gray-1', '--kanso-fg'],
  ['--sl-color-gray-2', '--kanso-fg'],
  ['--sl-color-gray-3', '--kanso-fg-muted'],
  ['--sl-color-gray-4', '--kanso-line-strong'],
  ['--sl-color-gray-5', '--kanso-line'],
  ['--sl-color-gray-6', '--kanso-surface'],
  ['--sl-color-gray-7', '--kanso-surface'],
  ['--sl-color-black', '--kanso-bg'],
  ['--sl-color-accent', '--kanso-accent'],
  ['--sl-color-accent-high', '--kanso-accent'],
  ['--sl-color-accent-low', '--kanso-surface-sunk'],
  ['--sl-color-text', '--kanso-fg'],
  ['--sl-color-text-accent', '--kanso-accent'],
  ['--sl-color-text-invert', '--kanso-on-accent'],
  ['--sl-color-bg', '--kanso-bg'],
  ['--sl-color-bg-nav', '--kanso-surface'],
  ['--sl-color-bg-sidebar', '--kanso-bg'],
  ['--sl-color-bg-inline-code', '--kanso-surface-sunk'],
  ['--sl-color-bg-accent', '--kanso-accent'],
  ['--sl-color-hairline', '--kanso-line'],
  ['--sl-color-hairline-light', '--kanso-line'],
  ['--sl-color-hairline-shade', '--kanso-line'],
];

test.describe('Starlight theming', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/getting-started/introduction/');
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`every --sl-color-* resolves to its kanso token in ${theme}`, async ({ page }) => {
      await setTheme(page, theme);

      for (const [starlight, kanso] of mapped) {
        const [got, want] = await Promise.all([token(page, starlight), token(page, kanso)]);

        // A missing token resolves to '', and '' === '' would pass happily.
        expect(
          want,
          `${kanso} is not defined — is kanso-styles still first in customCss?`,
        ).not.toBe('');
        expect(got, `${starlight} should resolve to ${kanso}`).toBe(want);
      }
    });
  }

  test('the two themes actually resolve to different colours', async ({ page }) => {
    // The check above passes vacuously if data-theme stops switching anything,
    // because both sides of every comparison would move together.
    await setTheme(page, 'light');
    const light = await token(page, '--sl-color-bg');

    await setTheme(page, 'dark');
    const dark = await token(page, '--sl-color-bg');

    expect(light).not.toBe('');
    expect(dark).not.toBe(light);
  });

  test('the page really paints the kanso background, not just the variable', async ({ page }) => {
    // --sl-color-bg could resolve correctly and still be painted over by a
    // Starlight rule the mapping does not reach.
    for (const theme of ['light', 'dark'] as const) {
      await setTheme(page, theme);

      const [painted, expected] = await page.evaluate(() => {
        const probe = document.createElement('div');
        probe.style.backgroundColor = 'var(--kanso-bg)';
        document.body.append(probe);
        const wanted = getComputedStyle(probe).backgroundColor;
        probe.remove();
        return [getComputedStyle(document.body).backgroundColor, wanted];
      });

      expect(painted, `body background in ${theme}`).toBe(expected);
    }
  });

  test('Starlight radii are squared off to --kanso-radius', async ({ page }) => {
    const radius = await page
      .locator('.sidebar-content a')
      .first()
      .evaluate((element) => getComputedStyle(element).borderRadius);

    expect(radius).toBe('0px');
  });

  test('the chrome carries no decorative shadow', async ({ page }) => {
    const shadow = await token(page, '--sl-shadow-md');
    expect(shadow).toBe('none');
  });

  test('has no axe violations in either theme', async ({ page }) => {
    // Contrast is measured against the tokens by `pnpm contrast`, but that
    // script knows nothing about which token Starlight paints where. This is
    // the check that the *mapping* kept the chrome above AA.
    for (const theme of ['light', 'dark'] as const) {
      await setTheme(page, theme);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

      expect(results.violations, `axe in ${theme}`).toEqual([]);
    }
  });
});
