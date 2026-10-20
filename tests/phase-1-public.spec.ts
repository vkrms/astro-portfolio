import { expect, test, type APIRequestContext } from '@playwright/test';
import sharp from 'sharp';
import {
	resetProjects,
	resetSettings,
	updateSettings,
	waitForProject,
} from './helpers/projects';

let PNG: Buffer;

test.beforeAll(async () => {
	PNG = await sharp({
		create: { width: 64, height: 64, channels: 3, background: { r: 20, g: 60, b: 120 } },
	})
		.png()
		.toBuffer();
});

async function uploadImage(
	request: APIRequestContext,
	slug: string,
	name = 'cover.png',
): Promise<string> {
	const response = await request.post('/api/media', {
		headers: { origin: 'http://localhost:1893' },
		multipart: { file: { name, mimeType: 'image/png', buffer: PNG }, slug },
	});
	expect(response.status()).toBe(201);
	return ((await response.json()) as { path: string }).path;
}

function paragraph(text: string) {
	return { type: 'paragraph', content: [{ type: 'text', text, styles: {} }] };
}

test.describe('phase 1 - public site', () => {
	test.beforeEach(async () => {
		await resetProjects();
		await resetSettings();
	});

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

	test('filters projects by tag', async ({ page, request }) => {
		await request.post('/api/save', {
			data: {
				title: 'Design Project',
				summary: 'Design summary.',
				date: '2026-06-01',
				draft: false,
				tags: ['design'],
			},
		});
		await request.post('/api/save', {
			data: {
				title: 'Code Project',
				summary: 'Code summary.',
				date: '2026-05-01',
				draft: false,
				tags: ['code'],
			},
		});

		await page.goto('/projects');
		await page.getByRole('button', { name: 'design', exact: true }).click();

		await expect(page).toHaveURL('/projects?tag=design');
		await expect(page.getByRole('link', { name: 'Design Project' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Code Project' })).toBeHidden();

		await page.getByRole('button', { name: 'All', exact: true }).click();
		await expect(page.getByRole('link', { name: 'Code Project' })).toBeVisible();
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

	test('home shows the intro and featured projects', async ({ page, request }) => {
		await request.post('/api/save', {
			data: {
				slug: 'featured-project',
				title: 'Featured Project',
				summary: 'Featured summary.',
				date: '2026-06-01',
				draft: false,
			},
		});
		await updateSettings(request, {
			home: { intro: 'Custom intro.', featured: ['featured-project'] },
		});

		await page.goto('/');

		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Portfolio');
		await expect(page.getByText('Custom intro.')).toBeVisible();
		await expect(page.getByRole('link', { name: 'Featured Project' })).toBeVisible();
	});

	test('project page shows the cover and body', async ({ page, request }) => {
		const cover = await uploadImage(request, 'cover-project');

		await request.post('/api/save', {
			data: {
				slug: 'cover-project',
				title: 'Cover Project',
				summary: 'Cover summary.',
				date: '2026-06-01',
				draft: false,
				cover,
				coverAlt: 'Cover alt',
				body: [paragraph('Body text.')],
			},
		});

		await waitForProject(request, 'cover-project');
		await page.goto('/projects/cover-project');

		await expect(page.locator('article img[alt="Cover alt"]')).toBeVisible();
		await expect(page.getByText('Body text.')).toBeVisible();
	});

	test('project page sets canonical, meta description and OG image', async ({ page, request }) => {
		const cover = await uploadImage(request, 'meta-project');

		await request.post('/api/save', {
			data: {
				slug: 'meta-project',
				title: 'Meta Project',
				summary: 'Meta summary.',
				date: '2026-06-01',
				draft: false,
				cover,
				coverAlt: 'Cover alt',
			},
		});

		await waitForProject(request, 'meta-project');
		await page.goto('/projects/meta-project');

		await expect(page.locator('meta[name="description"]')).toHaveAttribute(
			'content',
			'Meta summary.',
		);
		await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
			'href',
			'http://localhost:1893/projects/meta-project',
		);
		await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
			'content',
			/\/uploads\/meta-project\//,
		);
	});

	test('about page shows the body and portrait', async ({ page, request }) => {
		const portrait = await uploadImage(request, 'settings', 'portrait.png');

		await updateSettings(request, {
			about: {
				body: [paragraph('About body.')],
				portrait,
				portraitAlt: 'Portrait alt',
			},
		});

		await page.goto('/about');

		await expect(page.getByRole('heading', { level: 1 })).toHaveText('About');
		await expect(page.getByText('About body.')).toBeVisible();
		await expect(page.locator('img[alt="Portrait alt"]')).toBeVisible();
	});

	test('serves the feed and 404', async ({ page, request }) => {
		await request.post('/api/save', {
			data: {
				title: 'Feed Post',
				summary: 'Feed summary.',
				date: '2026-06-01',
				draft: false,
			},
		});

		const feed = await request.get('/rss.xml');
		expect(feed.status()).toBe(200);
		expect(await feed.text()).toContain('Feed Post');

		const missing = await page.goto('/does-not-exist');
		expect(missing?.status()).toBe(404);
		await expect(page.getByText('Lost in space')).toBeVisible();
	});

	test.fixme('excludes drafts from the production build', async ({ page }) => {
		// Build-only. The route uses listPosts({ publishedOnly: true }), and the
		// release gate checks dist/ for draft pages.
		await page.goto('/');
	});

	test('public pages have no framework hydration', async ({ page, request }) => {
		await request.post('/api/save', {
			data: {
				slug: 'plain-project',
				title: 'Plain Project',
				summary: 'Plain summary.',
				date: '2026-06-01',
				draft: false,
				body: [paragraph('Plain body.')],
			},
		});

		await waitForProject(request, 'plain-project');
		await page.goto('/projects/plain-project');

		const scripts = await page.evaluate(() => ({
			islands: document.querySelectorAll('astro-island').length,
			blocknote: Boolean(document.querySelector('.bn-container')),
			reactRefresh: Array.from(document.scripts).some((script) =>
				/react-refresh|react-dom/.test(script.src),
			),
		}));

		expect(scripts).toEqual({ islands: 0, blocknote: false, reactRefresh: false });
	});

	test('carousel is keyboard operable and never autoplays', async ({ page, request }) => {
		await request.post('/api/save', {
			data: {
				slug: 'carousel-project',
				title: 'Carousel Project',
				summary: 'Slides.',
				date: '2026-06-01',
				draft: false,
				body: [
					{
						type: 'carousel',
						props: {
							items: JSON.stringify([
								{ src: '/uploads/carousel-project/a.jpg', alt: 'One', caption: '' },
								{ src: '/uploads/carousel-project/b.jpg', alt: 'Two', caption: '' },
							]),
							aspect: '16/9',
						},
					},
				],
			},
		});

		await waitForProject(request, 'carousel-project');
		await page.goto('/projects/carousel-project');

		const current = page.locator('[data-carousel] [data-current]');
		await expect(current).toHaveText('1');

		await page.waitForTimeout(1000);
		await expect(current).toHaveText('1');

		await page.locator('.carousel-track').focus();
		await page.keyboard.press('ArrowRight');
		await expect(current).toHaveText('2');
		await page.keyboard.press('ArrowLeft');
		await expect(current).toHaveText('1');
	});

	test('every content image has alt text and every embed has a title', async ({ page, request }) => {
		await request.post('/api/save', {
			data: {
				slug: 'alt-embed',
				title: 'Alt and Embed',
				summary: 'Accessibility.',
				date: '2026-06-01',
				draft: false,
				body: [
					{
						type: 'image',
						props: {
							src: '/uploads/alt-embed/image.jpg',
							alt: 'Image alt',
							caption: '',
							width: 'wide',
						},
					},
					{
						type: 'embed',
						props: {
							url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
							title: 'Video title',
							aspect: '16/9',
						},
					},
				],
			},
		});

		await waitForProject(request, 'alt-embed');
		await page.goto('/projects/alt-embed');

		await expect(page.locator('img[alt="Image alt"]')).toBeVisible();
		const play = page.getByRole('button', { name: 'Play Video title' });
		await expect(play).toBeVisible();
		await play.click();
		await expect(page.locator('iframe[title="Video title"]')).toBeVisible();
	});
});
