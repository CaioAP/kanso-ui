<!--
Thanks for the pull request. CONTRIBUTING.md has the full list; this is the
short version. Delete anything that does not apply.
-->

## What and why

<!-- What changed, and what problem it solves. If it fixes an issue, link it. -->

## Checks

- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` pass
- [ ] `pnpm build` then `pnpm bundle-size` pass — no entry pulls in another
- [ ] Changeset added (`pnpm changeset`) — required for any change under `packages/*`

## If this touches behaviour

- [ ] The behaviour lives in `packages/core`, not in an adapter
- [ ] Both React and Vue ship it, with tests in both
- [ ] Keyboard behaviour is tested explicitly — axe cannot see a broken arrow key
- [ ] Server rendering still matches the client (no core-generated ids)

## If this touches a colour token

- [ ] `pnpm contrast` passes, and any new pair is listed in `scripts/contrast.mjs`

## Anything the reviewer should look at closely

<!--
Trade-offs you are unsure about, or something you decided one way and could
easily have decided the other. This is the most useful section here.
-->
