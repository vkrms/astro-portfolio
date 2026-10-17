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
| Vercel preview, domain | Manual |

## Commands

| Command | Runs |
| --- | --- |
| `npm run test:unit` | Vitest once |
| `npm run test:unit:watch` | Vitest in watch mode |
| `npm run test:e2e` | Playwright |
| `npx playwright test --grep "<title>"` | One Playwright test |

The manual dev server runs on 1892. Playwright starts its own server on 1893
with `PROJECTS_DIR=tmp/e2e-projects`, so tests never touch 1892 or
`src/content/projects`. The admin is local-only; Playwright tests against
`astro dev`, where admin routes are allowed on localhost.

## Slices

1. Admin empty post list (done): `/admin` reads `listPosts()` and shows an empty state.
2. Create a draft post (done): the form writes `src/content/projects/<slug>.json`.
3. Admin shell and posts table (done): sidebar, filters, table on desktop, cards on mobile, duplicate and delete.
4. BlockNote body with the Carousel block (done).
5. Media upload and browser resize (done).
6. `/api/preview` renders the same HTML as the static page (done).
7. Public `/projects` and `/projects/[slug]` (done; cover pending).
8. Image block with required alt text (done).
9. Settings singletons.
