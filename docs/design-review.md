# MVP design review

Status: **pending owner confirmation**. The MVP is not done until every item below is checked.

How to review: run `npm run dev`, then open each URL at desktop (>= 1024 px) and mobile (<= 640 px), in both light and dark themes. For the preview modal, open a post in `/admin` and click **Preview**.

## Visitor-facing pages

- [ ] **Home** `/` - header, hero, intro, featured project cards, empty state, footer.
- [ ] **Projects** `/projects` - cards, tag chips, active tag, no-results state, cover thumbnails. Check that the `real deal` chip filters to the published post.
- [ ] **Project** `/projects/[slug]` - header, cover, byline, links, body blocks, previous/next, footer. Body coverage: paragraph, H2/H3, lists, code, image, gallery, carousel, embed, quote, media + text.
- [ ] **404** `/does-not-exist` - message and a way back.

## Visitor-facing overlays and interactions

- [ ] **Mobile navigation** - open, close, links, theme toggle, Escape.
- [ ] **Theme toggle** - light/dark switches and persists across pages.
- [ ] **Carousel** - previous/next, counter, keyboard arrows, no autoplay.
- [ ] **Embed** - thumbnail facade, accessible title, click loads the iframe, correct aspect ratio.

## Modal

- [ ] **Admin preview modal** (`/admin/edit/<slug>` -> **Preview**) - visually matches the project page; carousel and embeds work; content scrolls; closes via **Close**, Escape and the backdrop.

## Notes

- The MVP has no public modal. The mobile navigation is a drawer; the admin preview is the only modal.
- Phase 3 adds the gallery lightbox; add a review item when it ships.
- Check every public surface in both light and dark themes.
