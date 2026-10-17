# TDD workflow

Two loops:

- **Outer loop:** Playwright, one acceptance test per user slice.
- **Inner loop:** Vitest, one unit test per piece of logic, written before the code.

## Loop

1. Pick one slice from the definition of done.
2. Write one Playwright test with real selectors and assertions. Run it. It must fail for the expected reason.
3. For each non-trivial piece, write a unit test. Run it. It must fail.
4. Implement until the unit test passes.
5. Wire the pieces. Run the Playwright test until it passes.
6. Refactor with both suites green.
7. Commit.

## Rules

- Keep one Playwright test active at a time. Leave the rest as `test.fixme`.
- Use `getByRole` and `getByLabel` in Playwright. Do not use CSS classes or test ids tied to markup.
- Do not unit-test Astro templates. Test the functions and adapters they call.
- Skip unit tests for glue with no branches.
- Keep Playwright assertions coarse: what the user sees, not DOM structure.
- Do not write all acceptance tests up front. Add one per slice.

## Where checks live

| Check | Level |
| --- | --- |
| User flow | Playwright |
| Pure logic | Vitest |
| Thin route or glue | Playwright |
| Build output (drafts, JS budget, file size) | Build or CI script |
| Real GitHub commit, Vercel preview | Manual |

## Commands

| Command | Runs |
| --- | --- |
| `npm run test:unit` | Vitest once |
| `npm run test:unit:watch` | Vitest in watch mode |
| `npm run test:e2e` | Playwright |
| `npx playwright test --grep "<title>"` | One Playwright test |

Keep `npm run dev` running in another terminal. Playwright reuses it locally.

## Slices

1. Admin empty post list: `/admin` reads `listPosts()` and shows an empty state.
2. Create a draft post and write `src/content/projects/<slug>.json`.
3. Post list shows draft and published state.
4. BlockNote body with the Carousel block.
5. Media upload and browser resize.
6. `/api/preview` renders the same HTML as the static page.
7. Public `/projects` and `/projects/[slug]`.
8. Settings singletons.
