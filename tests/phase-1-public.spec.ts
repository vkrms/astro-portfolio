import { expect, test } from '@playwright/test';
import { resetProjects, waitForProject } from './helpers/projects';

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

	test('project page shows title, summary, date, links and previous/next', async ({ page, request }) => {
		await request.post('/api/save', {
			data: { title: 'Older Project', summary: 'Older summary.', date: '2026-01-01', draft: false },
		});
		await request.post('/api/save', {
			data: {
				title: 'Newer Project',
				summary: 'Newer summary.',
				date: '2026-06-01',
				draft: false,
				links: [{ label: 'Live site', url: 'https://example.com' }],
			},
		});

		await waitForProject(request, 'newer-project');
		await page.goto('/projects/newer-project');

		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Newer Project');
		await expect(page.getByText('Newer summary.')).toBeVisible();
		await expect(page.getByText('Jun 1, 2026')).toBeVisible();
		await expect(page.getByRole('link', { name: 'Live site' })).toHaveAttribute(
			'href',
			'https://example.com',
		);
		await expect(page.getByRole('link', { name: /Older Project/ })).toBeVisible();
	});

	test('shows an edit shortcut on the post page', async ({ page, request }) => {
		await request.post('/api/save', {
			data: {
				title: 'Editable Project',
				summary: 'Editable summary.',
				date: '2026-06-01',
				draft: false,
			},
		});

		await waitForProject(request, 'editable-project');
		await page.goto('/projects/editable-project');

		await expect(page.getByRole('link', { name: 'Edit post' })).toHaveAttribute(
			'href',
			'/admin/edit/editable-project',
		);
	});

	test('project page returns 404 for a draft or unknown slug', async ({ page, request }) => {
		await request.post('/api/save', {
			data: { title: 'Draft Only', summary: 'Draft summary.', date: '2026-01-01', draft: true },
		});

		const response = await page.goto('/projects/draft-only');
		expect(response?.status()).toBe(404);
		await expect(page.getByText('Lost in space')).toBeVisible();
	});

	test.fixme('home shows the intro and featured projects', async ({ page }) => {
		await page.goto('/');
	});

	test.fixme('project page shows the cover and body', async ({ page }) => {
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
