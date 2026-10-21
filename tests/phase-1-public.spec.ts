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

	test('home lists published projects newest first', async ({ page, request }) => {
		await request.post('/api/save', {
			data: { title: 'Older Project', summary: 'Older summary.', date: '2026-01-01', draft: false },
		});
		await request.post('/api/save', {
			data: { title: 'Newer Project', summary: 'Newer summary.', date: '2026-06-01', draft: false },
		});
		await request.post('/api/save', {
			data: { title: 'Draft Project', summary: 'Draft summary.', date: '2026-07-01', draft: true },
		});

		await page.goto('/');

		const items = page.locator('[data-project-card]');
		await expect(items).toHaveCount(2);
		await expect(items.nth(0)).toContainText('Newer Project');
		await expect(items.nth(1)).toContainText('Older Project');
		await expect(page.getByText('Draft Project')).toHaveCount(0);
	});

	test('home pins featured projects first and /projects redirects home', async ({ page, request }) => {
		for (const [title, date, featured] of [
			['Oldest Pinned', '2026-01-01', true],
			['Newest Plain', '2026-07-01', false],
			['Middle Plain', '2026-04-01', false],
		] as const) {
			await request.post('/api/save', {
				data: { title, summary: 'Summary.', date, draft: false, featured },
			});
		}

		await page.goto('/');

		const cards = page.locator('[data-project-card]');
		await expect(cards).toHaveCount(3);
		await expect(cards.nth(0)).toContainText('Oldest Pinned');
		await expect(cards.nth(1)).toContainText('Newest Plain');
		await expect(cards.nth(2)).toContainText('Middle Plain');

		await page.goto('/projects');
		await expect(page).toHaveURL('/');
	});

	test('project cards without a cover show a placeholder', async ({ page, request }) => {
		await request.post('/api/save', {
			data: { title: 'No Cover', summary: 'Summary.', date: '2026-01-01', draft: false },
		});
		await waitForProject(request, 'no-cover');

		await page.goto('/');

		const card = page.locator('[data-project-card]', { hasText: 'No Cover' });
		await expect(card.locator('[data-cover-placeholder]')).toBeVisible();
		await expect(card.locator('img')).toHaveCount(0);
	});

	test('the header menu button opens the nav on every screen size', async ({ page }) => {
		for (const width of [1280, 390]) {
			await page.setViewportSize({ width, height: 700 });
			await page.goto('/');

			const header = page.getByRole('banner');
			const toggle = header.getByRole('button', { name: 'Toggle navigation menu' });
			const panel = page.locator('#menu-panel');

			await expect(toggle).toHaveAttribute('aria-expanded', 'false');
			await expect(panel).toBeHidden();

			await toggle.click();
			await expect(toggle).toHaveAttribute('aria-expanded', 'true');
			await expect(panel.getByRole('link', { name: 'Projects' })).toBeVisible();

			await page.keyboard.press('Escape');
			await expect(panel).toBeHidden();

			await toggle.click();
			await panel.getByRole('link', { name: 'Projects' }).click();
			await expect(page).toHaveURL('/#work');
		}
	});

	test('the header scrolls away with the page', async ({ page, request }) => {
		await request.post('/api/save', {
			data: {
				title: 'Long Post',
				summary: 'Summary.',
				date: '2026-01-01',
				draft: false,
				body: Array.from({ length: 40 }, (_, i) => paragraph(`Paragraph ${i + 1}.`)),
			},
		});
		await waitForProject(request, 'long-post');

		await page.setViewportSize({ width: 1280, height: 600 });
		await page.goto('/projects/long-post');

		const header = page.getByRole('banner');
		await expect(header).toBeInViewport();

		await page.evaluate(() => window.scrollTo(0, 800));
		await expect(header).not.toBeInViewport();
	});

	test('filters projects by tag', async ({ page, request }) => {
		await request.post('/api/save', {
			data: {
				title: 'Design Project',
				summary: 'Design summary.',
				date: '2026-06-01',
				draft: false,
				tags: ['real deal'],
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

		await page.goto('/');
		await page.getByRole('button', { name: 'real deal', exact: true }).click();

		await expect(page).toHaveURL(/tag=real[+%20]deal/);
		await expect(page.getByRole('button', { name: 'real deal', exact: true })).toHaveAttribute(
			'aria-pressed',
			'true',
		);
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
		await expect(page.getByRole('link', { name: 'Back to projects' })).toHaveAttribute(
			'href',
			'/#work',
		);
		await expect(page.getByRole('link', { name: 'Live site' })).toHaveAttribute(
			'href',
			'https://example.com',
		);
		await expect(page.getByRole('link', { name: /Older Project/ })).toBeVisible();
	});

	test('card tags are hashtag links that filter the list', async ({ page, request }) => {
		await request.post('/api/save', {
			data: { title: 'Design Project', summary: 'S.', date: '2026-06-01', draft: false, tags: ['real deal'] },
		});
		await request.post('/api/save', {
			data: { title: 'Code Project', summary: 'S.', date: '2026-05-01', draft: false, tags: ['code'] },
		});

		await page.goto('/');

		const card = page.locator('[data-project-card]', { hasText: 'Design Project' });
		const tag = card.getByRole('link', { name: 'real deal' });
		await expect(tag).toHaveAttribute('href', '/?tag=real%20deal#work');

		// Shown as a hashtag with an underscore; the accessible name keeps the space.
		await expect(tag).toContainText('#real_deal');
		const chip = page.getByRole('button', { name: 'real deal', exact: true });
		await expect(chip).toContainText('#real_deal');
		await expect(page.getByRole('button', { name: 'All', exact: true })).toHaveText('All');

		// Pointer cursor, and every hover transition is 300ms.
		expect(await chip.evaluate((el) => getComputedStyle(el).cursor)).toBe('pointer');
		for (const locator of [chip, tag, page.getByRole('link', { name: 'Design Project' })]) {
			expect(await locator.evaluate((el) => getComputedStyle(el).transitionDuration)).toMatch(/^0\.3s/);
		}

		// Tags share one colour token with the filter chips.
		const colours = await page.evaluate(() => {
			const probe = document.createElement('span');
			probe.style.color = 'var(--tag)';
			document.body.append(probe);
			const token = getComputedStyle(probe).color;
			probe.remove();
			return {
				token,
				link: getComputedStyle(document.querySelector('[data-tag-link]')!).color,
			};
		});
		expect(colours.link).toBe(colours.token);

		await tag.click();
		await expect(page).toHaveURL(/\?tag=real\+deal|\?tag=real%20deal/);
		await expect(page.getByRole('button', { name: 'real deal', exact: true })).toHaveAttribute(
			'aria-pressed',
			'true',
		);
		await expect(page.locator('[data-project-card]:visible')).toHaveCount(1);
		await expect(page.locator('[data-project-card]:visible')).toContainText('Design Project');
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

		// With no headline set, the heading falls back to the site title.
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Portfolio');
		await expect(page.getByText('Custom intro.')).toBeVisible();
		await expect(page.getByRole('link', { name: 'Featured Project' })).toBeVisible();
	});

	test('home hero shows eyebrow, two-tone heading, paragraphs and button', async ({
		page,
		request,
	}) => {
		await updateSettings(request, {
			home: {
				eyebrow: "Hey, I'm Sam",
				headline: 'A designer',
				highlight: 'making things clear.',
				intro: 'First paragraph.\n\nSecond paragraph.',
				ctaLabel: 'See selected work',
				ctaLink: '#work',
				featured: [],
			},
		});

		await page.goto('/');

		await expect(page.getByText("Hey, I'm Sam")).toBeVisible();
		const heading = page.getByRole('heading', { level: 1 });
		await expect(heading).toHaveText('A designer making things clear.');
		await expect(heading.locator('span')).toHaveText('making things clear.');
		await expect(page.getByText('First paragraph.')).toBeVisible();
		await expect(page.getByText('Second paragraph.')).toBeVisible();
		await expect(page.getByRole('link', { name: /See selected work/ })).toHaveAttribute('href', '#work');
	});

	test('home heading and paragraphs share a 56ch column', async ({ page, request }) => {
		await updateSettings(request, {
			home: {
				headline: 'A designer and front-end engineer',
				highlight: 'making complex products feel calm and clear for the people who use them every day.',
				intro: Array.from({ length: 3 }, () => 'Words '.repeat(60).trim()).join('\n\n'),
				featured: [],
			},
		});

		await page.setViewportSize({ width: 1280, height: 900 });
		await page.goto('/');

		const widths = await page.evaluate(() => {
			const heading = document.querySelector('h1')!;
			const paragraph = heading.parentElement!.querySelector('p')!;
			const probe = document.createElement('div');
			probe.style.width = '56ch';
			paragraph.append(probe);
			const cap = probe.getBoundingClientRect().width;
			probe.remove();
			return {
				cap,
				heading: heading.getBoundingClientRect().width,
				paragraph: paragraph.getBoundingClientRect().width,
			};
		});

		expect(widths.paragraph).toBeLessThanOrEqual(widths.cap + 1);
		expect(widths.heading).toBeLessThanOrEqual(widths.cap + 1);
		expect(widths.heading).toBeCloseTo(widths.paragraph, 0);
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

	test('carousel bleeds past the column with the current slide inside it', async ({ page, request }) => {
		await request.post('/api/save', {
			data: {
				slug: 'bleed-project',
				title: 'Bleed Project',
				summary: 'Slides.',
				date: '2026-06-01',
				draft: false,
				body: [
					{
						type: 'carousel',
						props: {
							items: JSON.stringify([
								{ src: '/uploads/bleed-project/a.jpg', alt: 'One', caption: '' },
								{ src: '/uploads/bleed-project/b.jpg', alt: 'Two', caption: '' },
							]),
							aspect: '16/9',
						},
					},
				],
			},
		});

		await waitForProject(request, 'bleed-project');

		for (const width of [1280, 390]) {
			await page.setViewportSize({ width, height: 800 });
			await page.goto('/projects/bleed-project');

			const figure = (await page.locator('figure.carousel').boundingBox())!;
			const track = (await page.locator('.carousel-track').boundingBox())!;
			const slide = (await page.locator('.carousel-frame').first().boundingBox())!;

			// The track extends 24px past the column on both sides and fades there.
			expect(figure.x - track.x).toBeCloseTo(24, 0);
			expect(track.x + track.width - (figure.x + figure.width)).toBeCloseTo(24, 0);
			expect(await page.locator('.carousel-track').evaluate((el) => getComputedStyle(el).maskImage)).not.toBe('none');

			// The current slide still fills the column exactly.
			expect(slide.x).toBeCloseTo(figure.x, 0);
			expect(slide.width).toBeCloseTo(figure.width, 0);

			// No sideways page scroll from the bleed.
			expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
		}

		// Next slide lands in the column, not offset by the padding.
		await page.getByRole('button', { name: 'Next slide' }).click();
		await expect(page.locator('[data-carousel] [data-current]')).toHaveText('2');
		await expect
			.poll(async () => {
				const figure = (await page.locator('figure.carousel').boundingBox())!;
				const slide = (await page.locator('.carousel-frame').nth(1).boundingBox())!;
				return Math.round(slide.x - figure.x);
			})
			.toBe(0);
	});

	test('renders image alt text and embed titles', async ({ page, request }) => {
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
