import { test } from '@playwright/test';

/**
 * Phase 0b gate. Runs locally against `astro dev`, where login is skipped.
 * Remove .fixme as each check is implemented.
 */
test.describe('phase 0b - BlockNote spike', () => {
	test.fixme('carousel with a ~3 MB image round-trips through JSON', async ({ page }) => {
		await page.goto('/admin/edit/new');

		// Add a Carousel block and upload a ~3 MB image through the media picker.
		// Set alt text and a caption, add a second slide, then reorder.
		// Save, reload, and compare the block with the editor state before saving.
		// Open /projects/<slug> and assert CmsImage renders the image.
	});

	test.fixme('static page and /api/preview render the same HTML', async ({ page }) => {
		await page.goto('/admin/edit/new');

		// Save a post with grouped lists, an inline link and a carousel.
		// Read the block HTML from /projects/<slug>.
		// POST the same JSON to /api/preview and compare the block HTML.
	});
});
