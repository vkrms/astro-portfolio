import { test } from '@playwright/test';

test.describe('phase 2 - video', () => {
	test.fixme('uploads a video to R2 through a presigned URL', async ({ page }) => {
		await page.goto('/admin/edit/new');
		// The upload goes directly to R2, not through a serverless function.
	});

	test.fixme('plays with a poster and supports captions and loop/muted/autoplay', async ({ page }) => {
		await page.goto('/projects/example');
		// The video element has a poster and a captions track.
	});

	test.fixme('serves the bucket from the media subdomain', async ({ page }) => {
		await page.goto('/projects/example');
		// No r2.dev URLs in the page.
	});
});
