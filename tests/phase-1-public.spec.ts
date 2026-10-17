import { expect, test } from '@playwright/test';
import { resetProjects } from './helpers/projects';

test.describe('phase 1 - public site', () => {
	test.beforeEach(resetProjects);

	test('projects lists published posts newest first', async ({ page, request }) => {
		await request.post('/api/save', {
			data: { title: 'Older Project', summary: 'Older summary.', date: '2026-01-01', draft: false },
		});
		await request.post('/api/save', {
			data: { title: 'Newer Project', summary: 'Newer summary.', date: '2026-06-01', draft: false },
		});
		await request.post('/api/save', {
			data: { title: 'Draft Project', summary: 'Draft summary.', date: '2026-07-01', draft: true },
		});

		await page.goto('/projects');

		const items = page.getByRole('listitem');
		await expect(items).toHaveCount(2);
		await expect(items.nth(0)).toContainText('Newer Project');
		await expect(items.nth(1)).toContainText('Older Project');
		await expect(page.getByText('Draft Project')).toHaveCount(0);
	});

	test.fixme('home shows the intro and featured projects', async ({ page }) => {
		await page.goto('/');
	});

	test.fixme('project page shows header, cover, body, links and previous/next', async ({ page }) => {
		await page.goto('/projects/example');
	});

	test.fixme('project page sets canonical, meta description and OG image', async ({ page }) => {
		await page.goto('/projects/example');
		// canonical, meta description from summary, og:image from cover.
	});

	test.fixme('about page shows the body and portrait', async ({ page }) => {
		await page.goto('/about');
	});

	test.fixme('serves the feed, sitemap and 404', async () => {
		// /rss.xml and /sitemap-index.xml return 200. /missing returns 404.
	});

	test.fixme('excludes drafts from the production build', async () => {
		// A draft post has no output page in dist/.
	});

	test.fixme('public pages have no framework hydration', async ({ page }) => {
		await page.goto('/projects/example');
		// No React or BlockNote runtime. Inline scripts only.
	});

	test.fixme('carousel is keyboard operable and never autoplays', async ({ page }) => {
		await page.goto('/projects/example');
		// Arrow keys move slides. No slide change without input.
	});

	test.fixme('every content image has alt text and every embed has a title', async ({ page }) => {
		await page.goto('/projects/example');
	});
});
