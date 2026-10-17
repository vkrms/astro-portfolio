# Definition of done

Two levels:

- **Per-phase gate** - the exit criteria for phase 0b, 1, 2 or 3. Do not start the next phase until the gate passes.
- **Project release gate** - the conditions for shipping the portfolio.

Cross-cutting checks (build, type check, secrets, JS budget) are written once in
the release gate and referenced by the phases.

How tests are written: [tdd-workflow.md](./tdd-workflow.md).

## Verification

| Method | Use |
| --- | --- |
| Playwright | Admin and public flows. Runs against a production-mode server for auth, and against `astro dev` where auth is skipped. |
| Unit | GitHub client, stale-SHA check, browser resize, cookie signing. |
| Build check | Drafts excluded, JS budget, secrets in the client, file and repo size. |
| Manual | Vercel preview, real GitHub commit, domain, design. |

Phase 0b runs locally and unauthenticated.

## Phase 0b - BlockNote spike (localhost only)

- [x] A Carousel block (add, reorder, remove, alt, caption) with a ~3 MB image saves to JSON and reloads identically. The image uploads through the media picker, is written to disk, and the post renders it.
- [x] `Blocks.astro` renders that JSON, including grouped lists and inline links, to the same HTML on a static page and through `/api/preview`.

Deferred to Phase 1: GitHub commit, stale-SHA refusal, Vercel preview.

## Phase 1 - MVP

### Admin

- [ ] A wrong password is rejected and the admin password logs in.
- [ ] The session survives a reload; the cookie is `HttpOnly`, `Secure`, `SameSite=Strict`, 30-day expiry.
- [ ] `/admin` lists posts with draft/published state.
- [ ] Creating a post produces a `src/content/projects/<slug>.json` entry with every required field.
- [ ] The body editor accepts every phase 1 block.
- [ ] The media picker resizes an image to <= 3000 px and <= 3.5 MB before upload.
- [ ] The preview pane matches the production page.
- [ ] Saving commits the post JSON and all new images in one commit.
- [ ] Saving against a stale SHA is refused and offers a reload.
- [ ] An image without alt text blocks the save.
- [ ] `site`, `home` and `about` are editable at `/admin/settings`.

### Public site

- [ ] `/` shows the intro and the featured projects.
- [ ] `/projects` lists published projects newest first and filters by tag.
- [ ] `/projects/[slug]` shows header, cover, block body, links and previous/next.
- [ ] `cover` is the OG image; `summary` is the meta description.
- [ ] `/about` shows the about body and portrait.
- [ ] `/rss.xml`, `/sitemap-index.xml` and `/404` respond.
- [ ] Drafts are excluded from the production build.
- [ ] Public pages have no framework hydration; total JS stays under 40 KB gzipped per page (tune in Phase 1).
- [ ] The carousel is keyboard operable and never autoplays.
- [ ] Every content image has alt text; every embed has a `title`.

### Release

- [ ] Three real projects are published from the browser.

## Phase 2 - video

- [ ] A Video block uploads to R2 through a presigned URL, without passing through a serverless function.
- [ ] The video plays with a poster; captions (`.vtt`) and loop/muted/autoplay options work.
- [ ] The bucket is served from the `media.` subdomain, not `r2.dev`.

## Phase 3 - polish

- [ ] Tag filter, RSS, view transitions, gallery lightbox, per-project OG images and draft autosave work.
- [ ] axe reports no serious or critical issues on public pages.
- [ ] LCP is within budget on a throttled mobile profile.

## Project release gate

- [ ] All phase gates pass.
- [ ] Three real projects are published from the browser.
- [ ] The site is deployed on Vercel Hobby at the production domain.
- [ ] `npm run build` and `astro check` pass.
- [ ] Public pages have no framework hydration and stay within the JS budget.
- [ ] Alt text on every content image; every embed has a `title`; the carousel is keyboard operable and never autoplays.
- [ ] Every project page sets canonical, title, `summary` as meta description and `cover` as OG image.
- [ ] Drafts are excluded from the production build.
- [ ] No secrets in the client bundle or git.
- [ ] The repo is under 1 GB and no file is over 5 MB.

## Not automated

- Vercel preview and the real GitHub commit path.
- The 5 MB file cap and the 1 GB repo budget (CI, not Playwright).
- Domain setup and design review.
