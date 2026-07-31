/**
 * Development-only diagnostics, without importing anything Node-shaped.
 *
 * Reading `process.env.NODE_ENV` directly is the usual way and throws in a
 * browser that has no `process` — the bundler is *expected* to have replaced it,
 * and nothing guarantees the consumer's did. Going through `globalThis` makes
 * the absence a value rather than a crash, and treats it as development, which
 * is the safe direction for a warning.
 *
 * Lived inside `dialog.dom.ts` until Field needed the same check; moved here
 * rather than copied, because two copies of a predicate are two chances to
 * disagree about what "production" means.
 */
export function isDevelopment(): boolean {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env?.NODE_ENV;
  return env !== 'production';
}
