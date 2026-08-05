import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

/**
 * The prose pages, scanned — and their code blocks measured.
 *
 * These pages mount no islands, so a build passing says almost nothing about
 * them. The defect they are actually prone to is `scrollable-region-focusable`:
 * an Expressive Code <pre> that overflows horizontally is a scrollable region
 * with no keyboard access, and it has been found three times in this repo
 * already — on the Switch page, on a Menu embed, and on the Card page.
 *
 * It has presented as *flakiness* every time, because whether a block overflows
 * depends on the viewport, so a scan that happens to run wide passes. So this
 * file does two things: it runs axe, and it measures the blocks directly at the
 * narrowest width the site is expected to hold. The measurement is the reliable
 * half; axe is the backstop for everything else.
 */

const pages = [
  '/',
  '/getting-started/introduction/',
  '/getting-started/installation/',
  '/guides/accessibility/',
  '/guides/architecture/',
  '/guides/theming/',
  '/guides/ssr/',
] as const;

/**
 * Pages whose code blocks are measured at 360px.
 *
 * The guides are the obvious ones, but the component pages carry more code than
 * any guide and — crucially — they are served by the *other* half of the fix.
 * Markdown fences go through the rehype plugin; the `<Code>` blocks
 * ComponentPreview renders go through the Expressive Code plugin, configured in
 * a different file for a different reason. Leaving those out would verify one
 * half of a two-part fix and call it done, which is how this defect came back
 * three times.
 *
 * Only two component pages, not all seven: they are built from one shared
 * preview component, so the third would test the same code path again.
 */
const codePages = [...pages, '/components/switch/', '/components/menu/'] as const;

const setTheme = (page: Page, theme: 'light' | 'dark') =>
  page.evaluate((value) => {
    document.documentElement.dataset.theme = value;
  }, theme);

for (const path of pages) {
  test.describe(path, () => {
    test('has no axe violations in either theme', async ({ page }) => {
      await page.goto(path);

      // Contrast is computed from painted colours, so one theme is half a test.
      for (const theme of ['light', 'dark'] as const) {
        await setTheme(page, theme);

        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze();

        expect(results.violations, `axe on ${path} in ${theme}`).toEqual([]);
      }
    });

    test('has no axe violations at 360px either', async ({ page }) => {
      // Narrow is its own state: it is where a code block starts overflowing,
      // and where the rule below has anything to report at all.
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto(path);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

      expect(results.violations, `axe on ${path} at 360px`).toEqual([]);
    });
  });
}

for (const path of codePages) {
  test(`every scrollable code block on ${path} is reachable by keyboard`, async ({ page }) => {
    // Narrow enough to be a real phone, and narrow enough that essentially
    // every code sample overflows — which is the point. At 1280px most blocks
    // fit, the region is not scrollable, and axe has nothing to report. That
    // is exactly how this defect stayed hidden three times.
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(path);

    // Every `pre` on the page, not only the ones inside prose: on a component
    // page the interesting blocks are the ones ComponentPreview renders, and
    // they are the half of the fix the rehype plugin does not reach.
    const unreachable = await page.evaluate(() =>
      [...document.querySelectorAll('pre')]
        .filter((pre) => pre.scrollWidth > pre.clientWidth)
        .filter((pre) => pre.getAttribute('tabindex') === null)
        .map((pre) => (pre.textContent ?? '').slice(0, 60)),
    );

    expect(unreachable, `scrollable but unfocusable blocks on ${path}`).toEqual([]);
  });
}

test('code blocks inside MDX components are focusable too', async ({ page }) => {
  // The measurement above only ever sees the *visible* tab panel: a hidden one
  // reports zero scroll width, so it is never scrollable and never flagged.
  // Seven of this page's twelve code blocks sit inside `<Tabs>`, and six of
  // those are hidden at any moment — so the usual check covers barely half the
  // page and would keep passing while the rest went unreachable.
  //
  // The rehype plugin does reach fences nested in an MDX component today; this
  // asserts the attribute directly, regardless of visibility or viewport, so
  // that stays true if its tree walk is ever narrowed.
  await page.goto('/getting-started/installation/');

  const blocks = await page.evaluate(() =>
    [...document.querySelectorAll('.sl-markdown-content pre')].map((pre) => ({
      tabindex: pre.getAttribute('tabindex'),
      text: (pre.textContent ?? '').slice(0, 40),
    })),
  );

  // A page that rendered no code blocks would pass the filter below vacuously.
  expect(blocks.length).toBeGreaterThan(8);
  expect(blocks.filter((block) => block.tabindex !== '0')).toEqual([]);
});

test.describe('guide navigation', () => {
  test('every guide is reachable from the sidebar', async ({ page }) => {
    await page.goto('/guides/accessibility/');

    // A page can exist, build, and be linked from nowhere. Starlight validates
    // that a sidebar slug resolves; it does not validate the reverse.
    const sidebar = page.locator('.sidebar-content');
    for (const label of ['Accessibility', 'Architecture', 'Theming', 'Server rendering']) {
      await expect(sidebar.getByRole('link', { name: label, exact: true })).toHaveCount(1);
    }
  });

  test('Installation is reachable from the sidebar', async ({ page }) => {
    await page.goto('/guides/accessibility/');

    const sidebar = page.locator('.sidebar-content');
    for (const label of ['Introduction', 'Installation']) {
      await expect(sidebar.getByRole('link', { name: label, exact: true })).toHaveCount(1);
    }
  });

  test('every component page links to Installation', async ({ page }) => {
    // The install instructions live in one place now, and seven pages point at
    // it. A pointer repeated seven times is a pointer that rots six times
    // unnoticed — so assert the link exists and actually lands, on every page
    // rather than a sample.
    const components = ['switch', 'tabs', 'dialog', 'menu', 'field', 'button', 'card'] as const;

    for (const component of components) {
      await page.goto(`/components/${component}/`);

      const link = page
        .locator('.sl-markdown-content')
        .getByRole('link', { name: 'Installation', exact: true });
      await expect(link, `Installation link on /components/${component}/`).toHaveCount(1);

      await link.click();
      await expect(page).toHaveURL(/\/getting-started\/installation\/$/);
    }
  });

  test('the guides cross-link without dead ends', async ({ page }) => {
    await page.goto('/guides/theming/');

    const link = page.locator('.sl-markdown-content').getByRole('link', {
      name: /accessibility guide/i,
    });
    await expect(link).toHaveCount(1);

    await link.click();
    await expect(page).toHaveURL(/\/guides\/accessibility\/$/);
  });
});
