import { test } from '@playwright/test';

/**
 * Phase 1 admin gate. Auth tests need a production-mode server; the rest run
 * against `astro dev`. Remove .fixme as each feature lands.
 */
test.describe('phase 1 - admin', () => {
	test.fixme('rejects a wrong password and accepts the admin password', async ({ page }) => {
		await page.goto('/admin/login');
		// A wrong password shows an error. The admin password lands on /admin.
	});

	test.fixme('session survives a reload and sets the required cookie flags', async ({ page }) => {
		await page.goto('/admin');
		// Reload stays logged in. Cookie: HttpOnly, Secure, SameSite=Strict, 30 days.
	});

	test.fixme('lists posts with draft and published state', async ({ page }) => {
		await page.goto('/admin');
		// Each row shows draft or published.
	});

	test.fixme('creates a post with every required field', async ({ page }) => {
		await page.goto('/admin/edit/new');
		// Fill title, slug, summary, date and cover. Save.
		// src/content/projects/<slug>.json contains all required fields.
	});

	test.fixme('accepts every phase 1 block', async ({ page }) => {
		await page.goto('/admin/edit/new');
		// Insert rich text, image, gallery, carousel, embed, quote and media + text.
	});

	test.fixme('resizes an image before upload', async ({ page }) => {
		await page.goto('/admin/edit/new');
		// Upload a large image. The stored file is <= 3000 px and <= 3.5 MB.
	});

	test.fixme('preview matches the production render', async ({ page }) => {
		await page.goto('/admin/edit/new');
		// Toggle the preview pane. Its HTML matches /projects/<slug>.
	});

	test.fixme('saves the post JSON and images in one commit', async ({ page }) => {
		await page.goto('/admin/edit/new');
		// Save. One commit contains the JSON and every new image.
	});

	test.fixme('refuses a save against a stale SHA', async ({ page }) => {
		await page.goto('/admin/edit/new');
		// Open the post in two tabs. Save the second. The save is refused and offers a reload.
	});

	test.fixme('blocks a save when an image has no alt text', async ({ page }) => {
		await page.goto('/admin/edit/new');
		// Add an image without alt. Save is blocked with a clear error.
	});

	test.fixme('edits the site, home and about singletons', async ({ page }) => {
		await page.goto('/admin/settings');
		// Each singleton saves and reloads.
	});
});
