import { expect, test, type APIRequestContext } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PROJECTS_DIR, resetProjects, resetSettings, SETTINGS_DIR } from './helpers/projects';

async function createPost(request: APIRequestContext, data: Record<string, unknown>) {
	await request.post('/api/save', { data });
}

test.describe('phase 1 - admin', () => {
	test.describe.configure({ mode: 'serial' });
	test.beforeEach(resetProjects);

	test('shows the empty state with a create action', async ({ page }) => {
		await page.goto('/admin');

		await expect(page.getByRole('heading', { level: 1 })).toHaveText('Posts');
		await expect(page.getByText('No posts yet')).toBeVisible();
		await expect(page.getByRole('link', { name: 'Create your first post' })).toHaveAttribute(
			'href',
			'/admin/edit/new',
		);
	});

	test('shows the admin shell and the posts table', async ({ page, request }) => {
		await createPost(request, {
			title: 'Older Project',
			summary: 'Older summary.',
			date: '2026-01-01',
			draft: false,
		});
		await createPost(request, {
			title: 'Newer Project',
			summary: 'Newer summary.',
			date: '2026-06-01',
			draft: false,
		});
		await createPost(request, {
			title: 'Draft Project',
			summary: 'Draft summary.',
			date: '2026-07-01',
			draft: true,
		});

		await page.goto('/admin');

		const nav = page.getByRole('navigation', { name: 'Admin' });
		await expect(nav.getByRole('link', { name: 'Posts' })).toHaveAttribute(
			'aria-current',
			'page',
		);
		await expect(nav.getByRole('link', { name: 'View site' })).toBeVisible();
		await expect(nav.getByRole('link', { name: 'Media' })).toHaveCount(0);
		await expect(nav.getByRole('link', { name: 'Settings' })).toHaveAttribute(
			'href',
			'/admin/settings',
		);

		const table = page.getByRole('table');
		await expect(table).toBeVisible();
		await expect(table.getByRole('columnheader', { name: 'Title' })).toBeVisible();
		await expect(table.getByRole('columnheader', { name: 'Status' })).toBeVisible();
		await expect(table.getByRole('columnheader', { name: 'Date' })).toBeVisible();
		await expect(table.getByRole('columnheader', { name: 'Actions' })).toBeVisible();

		const rows = table.locator('tbody tr');
		await expect(rows).toHaveCount(3);
		await expect(rows.nth(0)).toContainText('Draft Project');
		await expect(rows.nth(1)).toContainText('Newer Project');
		await expect(rows.nth(2)).toContainText('Older Project');

		await expect(rows.nth(0)).toContainText('Draft');
		await expect(rows.nth(1)).toContainText('Published');

		await expect(rows.nth(1).getByRole('link', { name: 'Newer Project' })).toHaveAttribute(
			'href',
			'/admin/edit/newer-project',
		);
		await expect(rows.nth(1).getByRole('link', { name: 'View' })).toHaveAttribute(
			'href',
			'/projects/newer-project',
		);
		await expect(rows.nth(0).getByRole('link', { name: 'View' })).toHaveCount(0);

		await expect(rows.nth(0).getByRole('link', { name: 'Edit' })).toBeVisible();
		await expect(rows.nth(0).getByRole('button', { name: 'Duplicate' })).toBeVisible();
		await expect(rows.nth(0).getByRole('button', { name: 'Delete' })).toBeVisible();
	});

	test('filters posts by status', async ({ page, request }) => {
		await createPost(request, {
			title: 'Draft Project',
			summary: 'Draft summary.',
			date: '2026-06-01',
			draft: true,
		});
		await createPost(request, {
			title: 'Live Project',
			summary: 'Live summary.',
			date: '2026-01-01',
			draft: false,
		});

		await page.goto('/admin?status=draft');

		const rows = page.getByRole('table').locator('tbody tr');
		await expect(rows).toHaveCount(1);
		await expect(rows.first()).toContainText('Draft Project');
		await expect(rows.first()).not.toContainText('Live Project');

		await expect(page.getByRole('link', { name: 'All (2)' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Published (1)' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Drafts (1)' })).toHaveAttribute(
			'aria-current',
			'page',
		);

		await page.getByRole('link', { name: 'Published (1)' }).click();
		await expect(page).toHaveURL('/admin?status=published');
		await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(1);
		await expect(page.getByRole('table').locator('tbody tr').first()).toContainText(
			'Live Project',
		);
	});

	test('shows the filtered empty state', async ({ page, request }) => {
		await createPost(request, {
			title: 'Live Project',
			summary: 'Live summary.',
			date: '2026-01-01',
			draft: false,
		});

		await page.goto('/admin?status=draft');

		await expect(page.getByText('No drafts')).toBeVisible();
		await expect(page.getByRole('link', { name: 'Show all posts' })).toHaveAttribute(
			'href',
			'/admin',
		);
	});

	test('duplicates a post', async ({ page, request }) => {
		await createPost(request, {
			title: 'Original Project',
			summary: 'Summary.',
			date: '2026-01-01',
			draft: false,
		});

		await page.goto('/admin');
		await page
			.getByRole('table')
			.locator('tbody tr')
			.first()
			.getByRole('button', { name: 'Duplicate' })
			.click();

		await expect(page).toHaveURL('/admin');
		await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(2);
		await expect(page.getByRole('table').getByText('original-project-copy')).toBeVisible();
	});

	test('deletes a post after confirmation', async ({ page, request }) => {
		await createPost(request, {
			title: 'Delete Me',
			summary: 'Summary.',
			date: '2026-01-01',
			draft: true,
		});

		await page.goto('/admin');
		page.once('dialog', (dialog) => dialog.accept());
		await page
			.getByRole('table')
			.locator('tbody tr')
			.first()
			.getByRole('button', { name: 'Delete' })
			.click();

		await expect(page).toHaveURL('/admin');
		await expect(page.getByText('No posts yet')).toBeVisible();
	});

	test('shows stacked cards and a drawer on mobile', async ({ page, request }) => {
		await createPost(request, {
			title: 'Mobile Project',
			summary: 'Summary.',
			date: '2026-01-01',
			draft: false,
		});

		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto('/admin');

		await expect(page.getByRole('table')).toBeHidden();
		const cards = page.getByRole('list', { name: 'Posts' });
		await expect(cards).toBeVisible();
		await expect(cards.getByRole('listitem')).toHaveCount(1);
		await expect(cards).toContainText('Mobile Project');

		const menu = page.getByRole('banner').getByRole('button', { name: 'Menu' });
		const nav = page.getByRole('navigation', { name: 'Admin' });
		await expect(nav).toBeHidden();

		await menu.click();
		await expect(menu).toHaveAttribute('aria-expanded', 'true');
		await expect(nav).toBeVisible();

		await page.keyboard.press('Escape');
		await expect(menu).toHaveAttribute('aria-expanded', 'false');
		await expect(nav).toBeHidden();
	});

	test('creates a draft post and writes JSON', async ({ page }) => {
		await page.goto('/admin/edit/new');

		await page.getByLabel('Title').fill('Hello World');
		await page.getByLabel('Slug').fill('hello-world');
		await page.getByLabel('Excerpt').fill('A short summary.');
		await page.getByLabel('Date').fill('2026-06-01');
		await page.getByLabel('Draft').check();
		await page.getByRole('button', { name: 'Save' }).click();

		await expect(page).toHaveURL('/admin');
		await expect(page.getByRole('table').getByText('hello-world')).toBeVisible();

		const raw = await readFile(join(PROJECTS_DIR, 'hello-world.json'), 'utf8');
		expect(JSON.parse(raw)).toMatchObject({
			title: 'Hello World',
			summary: 'A short summary.',
			date: '2026-06-01',
			draft: true,
		});
	});

	test('serves an empty post list from /api/posts', async ({ request }) => {
		const response = await request.get('/api/posts');
		expect(response.status()).toBe(200);
		expect(await response.json()).toEqual({ posts: [] });
	});

	test.fixme('rejects a wrong password and accepts the admin password', async ({ page }) => {
		// Auth is out of scope: the admin is local-only.
		await page.goto('/admin');
	});

	test.fixme('session survives a reload and sets the required cookie flags', async ({ page }) => {
		// Auth is out of scope: the admin is local-only.
		await page.goto('/admin');
	});

	test('creates a post with every required field', async ({ request }) => {
		const response = await request.post('/api/save', {
			data: {
				slug: 'every-field',
				title: 'Every Field',
				summary: 'A summary.',
				date: '2026-06-01',
				draft: false,
				featured: true,
				cover: '/uploads/every-field/cover.jpg',
				coverAlt: 'Cover alt',
				tags: ['design', 'astro'],
				role: 'Design and front end',
				client: 'Acme',
				links: [{ label: 'Live', url: 'https://example.com' }],
				body: [
					{ type: 'paragraph', content: [{ type: 'text', text: 'Body', styles: {} }] },
				],
			},
		});
		expect(response.status()).toBe(201);

		const saved = JSON.parse(await readFile(join(PROJECTS_DIR, 'every-field.json'), 'utf8'));
		expect(saved).toMatchObject({
			title: 'Every Field',
			summary: 'A summary.',
			date: '2026-06-01',
			draft: false,
			featured: true,
			cover: '/uploads/every-field/cover.jpg',
			coverAlt: 'Cover alt',
			tags: ['design', 'astro'],
			role: 'Design and front end',
			client: 'Acme',
			schemaVersion: 1,
		});
		expect(saved.links).toEqual([{ label: 'Live', url: 'https://example.com' }]);
	});

	test('accepts every phase 1 block', async ({ page, request }) => {
		const body = [
			{ type: 'paragraph', content: [{ type: 'text', text: 'Intro', styles: {} }] },
			{
				type: 'heading',
				props: { level: 2 },
				content: [{ type: 'text', text: 'Heading', styles: {} }],
			},
			{ type: 'bulletListItem', content: [{ type: 'text', text: 'Bullet', styles: {} }] },
			{ type: 'numberedListItem', content: [{ type: 'text', text: 'Numbered', styles: {} }] },
			{ type: 'codeBlock', content: [{ type: 'text', text: 'const x = 1;', styles: {} }] },
			{
				type: 'image',
				props: { src: '/uploads/all-blocks/a.jpg', alt: 'Image alt', caption: '', width: 'wide' },
			},
			{
				type: 'carousel',
				props: {
					items: JSON.stringify([{ src: '/uploads/all-blocks/a.jpg', alt: 'Carousel alt', caption: '' }]),
					aspect: '16/9',
				},
			},
			{
				type: 'gallery',
				props: {
					items: JSON.stringify([{ src: '/uploads/all-blocks/a.jpg', alt: 'Gallery alt', caption: '' }]),
					columns: '3',
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
			{
				type: 'quote',
				props: { attribution: 'Someone' },
				content: [{ type: 'text', text: 'Quote', styles: {} }],
			},
			{
				type: 'mediaText',
				props: { src: '/uploads/all-blocks/a.jpg', alt: 'Media alt', side: 'left' },
				content: [{ type: 'text', text: 'Side text', styles: {} }],
			},
		];

		const response = await request.post('/api/save', {
			data: {
				slug: 'all-blocks',
				title: 'All Blocks',
				summary: 'Every phase 1 block.',
				date: '2026-06-01',
				draft: false,
				body,
			},
		});
		expect(response.status()).toBe(201);

		await page.goto('/admin/edit/all-blocks');
		await expect(page.locator('.bn-editor[contenteditable="true"]')).toBeVisible();

		for (const type of [
			'paragraph',
			'heading',
			'bulletListItem',
			'numberedListItem',
			'codeBlock',
			'image',
			'carousel',
			'gallery',
			'embed',
			'quote',
			'mediaText',
		]) {
			await expect(
				page.locator(`.bn-block-content[data-content-type="${type}"]`).first(),
			).toBeVisible();
		}

		const preview = await request.post('/api/preview', { data: { blocks: body } });
		expect(preview.status()).toBe(200);
		const html = await preview.text();
		expect(html).toContain('<h2');
		expect(html).toContain('<blockquote');
		expect(html).toContain('data-embed');
		expect(html).toContain('Carousel alt');
		expect(html).toContain('Gallery alt');
		expect(html).toContain('Side text');
	});

	test.fixme('resizes an image before upload', async ({ page }) => {
		// Covered by the 3 MB upload assertions in phase-0b.spec.ts.
		await page.goto('/admin/edit/new');
	});

	test.fixme('preview matches the production render', async ({ page }) => {
		// Covered by the static/preview parity test in phase-0b.spec.ts.
		await page.goto('/admin/edit/new');
	});

	test.fixme('saves the post JSON and images in one commit', async ({ page }) => {
		// Publishing is a manual commit and push; the admin only writes files.
		await page.goto('/admin/edit/new');
	});

	test.fixme('refuses a save against a stale SHA', async ({ page }) => {
		// There is no remote write path.
		await page.goto('/admin/edit/new');
	});

	test('edits the site, home and about singletons', async ({ page }) => {
		await resetSettings();
		await page.goto('/admin/settings');
		await expect(page.locator('.bn-editor[contenteditable="true"]')).toBeVisible();

		await page.getByLabel('Site title').fill('Studio');
		await page.getByLabel('Intro').fill('Custom intro.');

		await page.locator('.bn-editor').click();
		await page.keyboard.press('End');
		await page.keyboard.type(' Updated.');

		await page.getByRole('button', { name: 'Save settings' }).first().click();
		await expect(page.getByText('Saved.')).toBeVisible();

		const site = JSON.parse(await readFile(join(SETTINGS_DIR, 'site.json'), 'utf8'));
		const home = JSON.parse(await readFile(join(SETTINGS_DIR, 'home.json'), 'utf8'));
		const about = JSON.parse(await readFile(join(SETTINGS_DIR, 'about.json'), 'utf8'));

		expect(site.seo.title).toBe('Studio');
		expect(home.intro).toBe('Custom intro.');
		expect(JSON.stringify(about.body)).toContain('Updated.');
	});
});
