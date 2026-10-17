import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PROJECTS_DIR, resetProjects } from './helpers/projects';

/**
 * Phase 1 admin gate. Auth tests need a production-mode server; the rest run
 * against `astro dev`. Remove .fixme as each feature lands.
 */
test.describe('phase 1 - admin', () => {
	test.describe.configure({ mode: 'serial' });
	test.beforeEach(resetProjects);

	test('shows an empty state when there are no posts', async ({ page }) => {
		await page.goto('/admin');
		await expect(page.getByRole('heading', { name: 'Posts' })).toBeVisible();
		await expect(page.getByText('No posts yet')).toBeVisible();
	});

	test('serves an empty post list from /api/posts', async ({ request }) => {
		const response = await request.get('/api/posts');
		expect(response.status()).toBe(200);
		expect(await response.json()).toEqual({ posts: [] });
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
		await expect(page.getByRole('listitem').filter({ hasText: 'Hello World' })).toContainText('Draft');

		const raw = await readFile(join(PROJECTS_DIR, 'hello-world.json'), 'utf8');
		expect(JSON.parse(raw)).toMatchObject({
			title: 'Hello World',
			summary: 'A short summary.',
			date: '2026-06-01',
			draft: true,
		});
	});

	test('lists posts with draft and published state', async ({ page }) => {
		await page.goto('/admin/edit/new');
		await page.getByLabel('Title').fill('Draft Post');
		await page.getByLabel('Slug').fill('draft-post');
		await page.getByLabel('Summary').fill('Draft summary.');
		await page.getByLabel('Date').fill('2026-06-01');
		await page.getByLabel('Draft').check();
		await page.getByRole('button', { name: 'Save' }).click();
		await expect(page).toHaveURL('/admin');

		await page.goto('/admin/edit/new');
		await page.getByLabel('Title').fill('Published Post');
		await page.getByLabel('Slug').fill('published-post');
		await page.getByLabel('Summary').fill('Published summary.');
		await page.getByLabel('Date').fill('2026-06-02');
		await page.getByLabel('Draft').uncheck();
		await page.getByRole('button', { name: 'Save' }).click();
		await expect(page).toHaveURL('/admin');

		await expect(page.getByRole('listitem').filter({ hasText: 'Draft Post' })).toContainText('Draft');
		await expect(page.getByRole('listitem').filter({ hasText: 'Published Post' })).toContainText('Published');
	});

	test.fixme('rejects a wrong password and accepts the admin password', async ({ page }) => {
		await page.goto('/admin/login');
		// A wrong password shows an error. The admin password lands on /admin.
	});

	test.fixme('session survives a reload and sets the required cookie flags', async ({ page }) => {
		await page.goto('/admin');
		// Reload stays logged in. Cookie: HttpOnly, Secure, SameSite=Strict, 30 days.
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
