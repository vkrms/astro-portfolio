# Phase 0 spike: TinaCMS on Astro

Goal: confirm TinaCMS can carry the portfolio before building phase 1.
Spec: "Portfolio Website Spec" doc, section Phases.

Stack tested: Astro 6.4.8, tinacms 3.14.4, @tinacms/astro 0.7.1,
scaffolded from `tinacms/tina-astro-starter`.

## Results

| # | Check | Result |
| --- | --- | --- |
| 1 | Uploads land in `src/` and Astro optimizes them | Pass (local) |
| 2 | A 5-slide Carousel block round-trips through MDX | Pass (local) |
| 3 | Click-to-edit preview works on the deployed site | Needs Tina Cloud + Vercel |

### 1. Media in `src/` is optimized

- `tina/config.ts` sets `media.tina` to `publicFolder: "src/assets"`,
  `mediaRoot: "uploads"`.
- Uploading through Tina's media endpoint (the one the admin's upload
  button calls) writes to `src/assets/uploads/<folder>/<file>` and stores
  the path as `/uploads/<folder>/<file>`.
- `src/components/media/CmsImage.astro` resolves that path to an imported
  asset with `import.meta.glob` and renders `<Picture>`: AVIF + WebP at
  up to 5 widths (480–2400), JPEG fallback.
- On-demand renders (the visual-editing island route) serve the original
  file instead of calling the runtime image service, so editing never uses
  Vercel's image-optimization quota. Remote URLs (e.g. `assets.tina.io`
  inside Tina Cloud's editor) fall back to a plain `<img>`.

### 2. Carousel round-trip

Template: `src/components/mdx/Carousel.template.ts`, renderer:
`src/components/mdx/Carousel.astro`, registered on the blog body.

Tested through Tina's GraphQL API, which is what the editor calls on save:

- Create a post with 5 slides (image, alt, caption) and an aspect ratio:
  saved as readable MDX, `<Carousel slides={[...]} aspect="16/9" />`.
- Read back: all 5 slides, aspect, image paths intact, including a caption
  with `"quotes"`, an apostrophe and `&`.
- Re-save unchanged: byte-identical file.
- Reorder slides: saved and read back in the new order; the git diff only
  moves the one slide.
- Production build and the island route both render 5 slides.
- Headless browser: prev/next buttons (including rapid clicks), wrap-around,
  arrow keys and swipe resync all work. Never autoplays.

Gotcha found: `updateDocument` replaces the whole document, so a save must
send every field. The editor always does; scripts must too.

### 3. Deployed preview: steps for you

1. Reconnect GitHub for Claude so this branch can be pushed.
2. On app.tina.io, sign in with GitHub and create a project from
   `vkrms/astro-portfolio`, branch `main`. Copy the Client ID and create a
   read-only token.
3. On Vercel, import the repo. Framework preset Astro, build command
   `npm run build`. Add env vars `PUBLIC_TINA_CLIENT_ID` and `TINA_TOKEN`.
4. Add the Vercel URL to the Tina Cloud project's site URLs.
5. Open `https://<project>.vercel.app/admin`, log in, open
   "Spike: carousel round-trip", click the carousel, edit a caption.
   Pass = the page updates as you type, and saving creates a commit on
   `main` that triggers a new Vercel build.
6. Also upload one image in the media manager and confirm the commit puts
   it under `src/assets/uploads/`.

## Cleanup before phase 1

Delete `src/content/blog/spike-carousel.mdx` and
`src/assets/uploads/spike-project/`, and replace the starter's blog/page
content with the portfolio content model.
