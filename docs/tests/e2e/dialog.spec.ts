import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

/**
 * The checks that only a real browser can make — and for Dialog that is most of
 * the component.
 *
 * jsdom implements neither `inert` nor a trustworthy focus model, so the vitest
 * suites can only assert the *mechanism*: which elements were marked, what
 * teardown restored. Whether focus can actually escape a trap, whether the page
 * really stops scrolling, and whether opening a dialog shifts the layout are
 * questions that need layout and a real focus implementation. See docs/04.
 */

const panel = (page: Page, framework: 'vue' | 'react') =>
  page.locator(`[data-panel="${framework}"]`);

/**
 * Wait for the island's JavaScript to arrive.
 *
 * The previews mount with `client:visible`, and the React one starts inside a
 * hidden panel — so it only begins hydrating once the framework toggle reveals
 * it. Server-rendered markup is fully present and fully inert before that, which
 * makes every "press a key, assert what moved" test a race.
 *
 * Astro drops the `ssr` attribute from <astro-island> when hydration completes,
 * which is the only signal that distinguishes rendered from live.
 */
const hydrated = (page: Page, framework: 'vue' | 'react') =>
  expect(page.locator(`[data-panel="${framework}"] astro-island[ssr]`)).toHaveCount(0);

/**
 * Wait out the entry animation before scanning colours.
 *
 * axe computes contrast from *composited* colours, so a scan that lands
 * mid-fade measures half-transparent text against whatever is behind it. The
 * Menu suite hit this for real; the same fade exists here, so the same wait
 * belongs here before it does.
 */
const settled = (locator: ReturnType<Page['locator']>) =>
  locator.evaluate((element) =>
    Promise.all(element.getAnimations({ subtree: true }).map((animation) => animation.finished)),
  );

test.describe('Dialog docs page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/components/dialog/');
  });

  test('has no axe violations while every dialog is closed', async ({ page }) => {
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
          await page.getByRole('tab', { name: 'Dialog.tsx', exact: true }).click();
        }
        await hydrated(page, framework);
      });

      const stage = (page: Page) => panel(page, framework);
      const trigger = (page: Page) => stage(page).getByRole('button', { name: 'Delete project' });
      const dialog = (page: Page) => page.getByRole('dialog');
      const knob = (page: Page, name: string) => stage(page).getByLabel(name);

      test('opens, and shows the dialog over the page', async ({ page }) => {
        await trigger(page).click();

        await expect(dialog(page)).toBeVisible();
        await expect(dialog(page)).toContainText('This cannot be undone');
      });

      test('has no axe violations while open', async ({ page }) => {
        // The scan that is easy to skip: a closed dialog is nothing but a
        // button, so a closed-only scan says almost nothing.
        await trigger(page).click();
        await expect(dialog(page)).toBeVisible();
        await settled(dialog(page));

        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze();

        expect(results.violations).toEqual([]);
      });

      test('the trap holds under repeated Tab', async ({ page }) => {
        // The assertion this whole phase exists for, and the one jsdom cannot
        // make. Twelve presses is more stops than the dialog has, so a leaking
        // trap lands somewhere in the page behind it.
        await trigger(page).click();
        await expect(dialog(page)).toBeVisible();

        for (let press = 0; press < 12; press += 1) {
          await page.keyboard.press('Tab');
          await expect(dialog(page).locator(':focus')).toHaveCount(1);
        }
      });

      test('the trap holds in reverse too', async ({ page }) => {
        await trigger(page).click();
        await expect(dialog(page)).toBeVisible();

        for (let press = 0; press < 12; press += 1) {
          await page.keyboard.press('Shift+Tab');
          await expect(dialog(page).locator(':focus')).toHaveCount(1);
        }
      });

      test('inert really applies to the page behind', async ({ page }) => {
        await trigger(page).click();
        await expect(dialog(page)).toBeVisible();

        // Not "the attribute is present" — that is the jsdom test, and jsdom
        // implements none of the behaviour. This asks the browser to focus the
        // element behind the dialog and reports whether it took: an inert
        // element refuses focus, and nothing else here would stop it.
        //
        // Deliberately not `elementFromPoint`, which was the first version of
        // this check and passes for the wrong reason — the centred dialog can
        // simply be covering the trigger.
        const focusable = await trigger(page).evaluate((element) => {
          element.focus();
          return document.activeElement === element;
        });

        expect(focusable).toBe(false);
      });

      test('focus returns to the trigger on Escape', async ({ page }) => {
        // Failing to restore focus strands keyboard users at the top of the
        // document, on a page they have to re-navigate from scratch.
        await trigger(page).click();
        await expect(dialog(page)).toBeVisible();

        await page.keyboard.press('Escape');

        await expect(dialog(page)).toHaveCount(0);
        await expect(trigger(page)).toBeFocused();
      });

      test('a press on the backdrop closes it, a drag out of the content does not', async ({
        page,
      }) => {
        await trigger(page).click();
        const content = dialog(page);
        await expect(content).toBeVisible();

        // Press inside, release outside — selecting text and dragging past the
        // edge. A `click` handler treats this as a click outside and throws the
        // user's selection away.
        const box = await content.boundingBox();
        if (box === null) throw new Error('no dialog box');
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x - 40, box.y + box.height / 2);
        await page.mouse.up();

        await expect(content).toBeVisible();

        // A press that starts outside does close it.
        await page.mouse.click(box.x - 40, box.y + box.height / 2);
        await expect(dialog(page)).toHaveCount(0);
      });

      test('locks the body scroll without shifting the layout', async ({ page }) => {
        // The scrollbar compensation. Without it the page jumps sideways by the
        // scrollbar's width the moment a dialog opens — a small detail that is
        // very visible and completely invisible to unit tests.
        await page.setViewportSize({ width: 900, height: 500 });

        const widthBefore = await page.evaluate(() => document.body.clientWidth);

        await trigger(page).click();
        await expect(dialog(page)).toBeVisible();

        const locked = await page.evaluate(() => ({
          overflow: getComputedStyle(document.body).overflow,
          width: document.body.clientWidth,
        }));

        expect(locked.overflow).toBe('hidden');
        expect(Math.abs(locked.width - widthBefore)).toBeLessThanOrEqual(1);

        await page.keyboard.press('Escape');
        await expect(dialog(page)).toHaveCount(0);

        const after = await page.evaluate(() => getComputedStyle(document.body).overflow);
        expect(after).not.toBe('hidden');
      });

      test('the page really cannot scroll while a modal is open', async ({ page }) => {
        await page.setViewportSize({ width: 900, height: 500 });
        await trigger(page).click();
        await expect(dialog(page)).toBeVisible();

        const before = await page.evaluate(() => window.scrollY);
        await page.mouse.wheel(0, 400);
        await page.waitForTimeout(120);
        const after = await page.evaluate(() => window.scrollY);

        expect(after).toBe(before);
      });

      test('the non-modal knob leaves the page usable', async ({ page }) => {
        await knob(page, 'non-modal').check();
        await trigger(page).click();
        await expect(dialog(page)).toBeVisible();

        const overflow = await page.evaluate(() => getComputedStyle(document.body).overflow);
        expect(overflow).not.toBe('hidden');

        // A corner of the viewport, well away from the centred dialog. The
        // question is what a press there would actually hit: page content, or
        // the dialog's own layer. The positioner covers the whole viewport by
        // design, so `pointer-events: none` on it is the only thing making this
        // true — and the playground renders no backdrop when non-modal, because
        // a scrim over a usable page both lies and swallows the clicks.
        const hitsThePage = await page.evaluate(() => {
          const hit = document.elementFromPoint(5, 5);
          return hit !== null && hit.closest('[data-part="positioner"]') === null;
        });
        expect(hitsThePage).toBe(true);

        // And nothing was inerted, which is the other half of "usable".
        expect(await page.locator('body > [inert]').count()).toBe(0);
      });

      test('the closeOnEscape knob turns Escape off without breaking the rest', async ({
        page,
      }) => {
        await knob(page, 'closeOnEscape').uncheck();
        await trigger(page).click();
        await expect(dialog(page)).toBeVisible();

        await page.keyboard.press('Escape');
        await expect(dialog(page)).toBeVisible();

        // Scoped to the dialog, not to the preview panel: the content is
        // portalled to <body> and is not inside `[data-panel]` at all.
        await dialog(page).getByRole('button', { name: 'Keep it' }).click();
        await expect(dialog(page)).toHaveCount(0);
      });

      test('the alertdialog knob changes the role and nothing else', async ({ page }) => {
        await knob(page, 'alertdialog').check();
        await trigger(page).click();

        await expect(page.getByRole('alertdialog')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.getByRole('alertdialog')).toHaveCount(0);
      });

      test('meets the target size minimum', async ({ page }) => {
        // WCAG 2.2 SC 2.5.8 wants 24x24 CSS pixels. Invisible without layout.
        const box = await trigger(page).boundingBox();
        expect(box?.width ?? 0).toBeGreaterThanOrEqual(24);
        expect(box?.height ?? 0).toBeGreaterThanOrEqual(24);
      });

      test('shows a focus ring on keyboard focus but not on click', async ({ page }) => {
        await trigger(page).click();
        await expect(dialog(page)).toBeVisible();

        // Dismissed with the pointer, deliberately. Closing with `Escape` and
        // then asserting "no ring" would fail for a good reason: the restore is
        // programmatic, and after a keypress the browser is right to consider
        // the interaction a keyboard one and draw the ring.
        const box = await dialog(page).boundingBox();
        if (box === null) throw new Error('no dialog box');
        await page.mouse.click(box.x - 40, box.y + box.height / 2);
        await expect(dialog(page)).toHaveCount(0);

        await expect(trigger(page)).toBeFocused();
        await expect(trigger(page)).not.toHaveCSS('outline-style', 'solid');

        await page.keyboard.press('Shift+Tab');
        await page.keyboard.press('Tab');
        await expect(trigger(page)).toHaveCSS('outline-style', 'solid');
      });

      test('the dialog never obscures the element that has focus', async ({ page }) => {
        // WCAG 2.2 SC 2.4.11. The content is height-constrained and scrolls
        // internally, so a focused control cannot end up under the viewport
        // edge — which is what happens to a dialog that is simply taller than
        // the screen.
        await page.setViewportSize({ width: 900, height: 360 });
        await trigger(page).click();
        await expect(dialog(page)).toBeVisible();

        const box = await dialog(page).boundingBox();
        expect(box).not.toBeNull();
        expect(box?.y ?? -1).toBeGreaterThanOrEqual(0);
        expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(360);
      });
    });
  }
});

test.describe('Dialog embed route', () => {
  test('renders both frameworks with no chrome', async ({ page }) => {
    await page.goto('/embed/dialog');

    await expect(page.getByRole('button', { name: 'Delete project' })).toHaveCount(2);
    await expect(page.locator('nav')).toHaveCount(0);
  });

  test('honours the theme query parameter', async ({ page }) => {
    await page.goto('/embed/dialog?theme=dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('has no axe violations, open or closed', async ({ page }) => {
    await page.goto('/embed/dialog');

    const scan = () =>
      new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

    expect((await scan()).violations).toEqual([]);

    await page.getByRole('button', { name: 'Delete project' }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await settled(page.getByRole('dialog'));

    expect((await scan()).violations).toEqual([]);
  });
});
