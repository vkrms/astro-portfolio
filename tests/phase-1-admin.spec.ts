import { expect, test, type APIRequestContext } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PROJECTS_DIR, resetProjects } from './helpers/projects';

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
		await expect(nav.getByRole('link', { name: 'Settings' })).toHaveCount(0);

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
		await page.getByLabel('Summary').fill('A short summary.');
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
		await page.goto('/admin/login');
	});

	test.fixme('session survives a reload and sets the required cookie flags', async ({ page }) => {
		await page.goto('/admin');
	});

	test.fixme('creates a post with every required field', async ({ page }) => {
		await page.goto('/admin/edit/new');
	});

	test.fixme('accepts every phase 1 block', async ({ page }) => {
		await page.goto('/admin/edit/new');
	});

	test.fixme('resizes an image before upload', async ({ page }) => {
		await page.goto('/admin/edit/new');
	});

	test.fixme('preview matches the production render', async ({ page }) => {
		await page.goto('/admin/edit/new');
	});

	test.fixme('saves the post JSON and images in one commit', async ({ page }) => {
		await page.goto('/admin/edit/new');
	});

	test.fixme('refuses a save against a stale SHA', async ({ page }) => {
		await page.goto('/admin/edit/new');
	});

	test.fixme('blocks a save when an image has no alt text', async ({ page }) => {
		await page.goto('/admin/edit/new');
	});

	test.fixme('edits the site, home and about singletons', async ({ page }) => {
		await page.goto('/admin/settings');
	});
});
