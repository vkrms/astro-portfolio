import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { PROJECTS_DIR, resetProjects } from './helpers/projects';

/**
 * Phase 1 image block. The block uses the same media pipeline as the carousel
 * and requires alt text before the post can be saved.
 */

let PNG: Buffer;

test.beforeAll(async () => {
	PNG = await sharp({
		create: { width: 64, height: 64, channels: 3, background: { r: 40, g: 90, b: 160 } },
	})
		.png()
		.toBuffer();
});

async function seedPost(request: APIRequestContext, slug: string) {
	await request.post('/api/save', {
		data: {
			slug,
			title: 'Image Block',
			summary: 'Image summary.',
			date: '2026-06-01',
			draft: false,
			body: [
				{
					type: 'paragraph',
					content: [{ type: 'text', text: 'Intro', styles: {} }],
				},
			],
		},
	});
}

async function insertImage(page: Page) {
	await page.locator('.bn-block-content').filter({ hasText: 'Intro' }).click();
	await page.keyboard.press('End');
	await page.keyboard.type('/image');

	const menu = page.locator('.bn-suggestion-menu');
	await expect(menu).toBeVisible();
	await menu.getByText('Image', { exact: true }).click();
	await expect(page.getByRole('button', { name: 'Add image' })).toBeVisible();
}

test.describe('phase 1 - image block', () => {
	test.describe.configure({ mode: 'serial' });
	test.beforeEach(resetProjects);

	test('saves an image with alt and caption and renders it', async ({ page, request }) => {
		const slug = 'image-block';
		await seedPost(request, slug);

		await page.goto(`/admin/edit/${slug}`);
		await insertImage(page);

		await page
			.locator('input[type="file"]')
			.setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: PNG });
		await expect(page.locator('img[src^="/uploads/"]')).toHaveCount(1);

		await page.getByLabel('Alt text').fill('A test image');
		await page.getByLabel('Caption').fill('A caption');
		await page.getByRole('button', { name: 'Save' }).click();
		await expect(page).toHaveURL('/admin');

		const saved = JSON.parse(await readFile(join(PROJECTS_DIR, `${slug}.json`), 'utf8'));
		const image = saved.body.find((block: any) => block.type === 'image');

		expect(image.props.alt).toBe('A test image');
		expect(image.props.caption).toBe('A caption');
		expect(image.props.src).toMatch(new RegExp(`^/uploads/${slug}/`));

		await page.goto(`/admin/edit/${slug}`);
		await expect(page.getByLabel('Alt text')).toHaveValue('A test image');
		await expect(page.getByLabel('Caption')).toHaveValue('A caption');
		await expect(page.locator('img[src^="/uploads/"]')).toHaveCount(1);

		await page.goto(`/projects/${slug}`);
		await expect(page.getByRole('img', { name: 'A test image' })).toBeVisible();
		await expect(page.getByText('A caption')).toBeVisible();
	});

	test('blocks the save when an image has no alt text', async ({ page, request }) => {
		const slug = 'image-needs-alt';
		await seedPost(request, slug);

		await page.goto(`/admin/edit/${slug}`);
		await insertImage(page);
		await page
			.locator('input[type="file"]')
			.setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: PNG });
		await expect(page.locator('img[src^="/uploads/"]')).toHaveCount(1);

		await page.getByRole('button', { name: 'Save' }).click();

		await expect(page.getByRole('alert')).toHaveText(
			'Add alt text to every image before saving.',
		);
		await expect(page).toHaveURL(`/admin/edit/${slug}`);

		await page.getByLabel('Alt text').fill('Described image');
		await page.getByRole('button', { name: 'Save' }).click();
		await expect(page).toHaveURL('/admin');
	});
});
