import {
	expect,
	test,
	request as playwrightRequest,
	type APIRequestContext,
	type Locator,
} from '@playwright/test';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import {
	PROJECTS_DIR,
	UPLOADS_DIR,
	resetProjects,
	resetUploads,
} from './helpers/projects';

/**
 * Phase 0b gate. Runs locally against `astro dev`, where login is skipped.
 * Uploads and post JSON go to the tmp directories set in playwright.config.ts,
 * never to src/assets or src/content.
 */

const FIXTURE_DIR = 'tmp/fixtures';
// Astro's checkOrigin rejects multipart POSTs without an Origin header.
const ORIGIN = process.env.E2E_BASE_URL ?? 'http://localhost:1893';

interface Fixture {
	path: string;
	buffer: Buffer;
}

interface CarouselItem {
	src: string;
	alt: string;
	caption: string;
}

async function makeImage(name: string, seed: number): Promise<Fixture> {
	const width = 2400;
	const height = 1600;
	const raw = Buffer.alloc(width * height * 3);
	let state = seed;
	for (let i = 0; i < raw.length; i += 1) {
		state = (state * 1664525 + 1013904223) >>> 0;
		raw[i] = state & 0xff;
	}

	const path = join(FIXTURE_DIR, name);
	const buffer = await sharp(raw, { raw: { width, height, channels: 3 } })
		.jpeg({ quality: 92 })
		.toBuffer();

	await mkdir(FIXTURE_DIR, { recursive: true });
	await writeFile(path, buffer);

	return { path, buffer };
}

async function upload(
	request: APIRequestContext,
	slug: string,
	file: Fixture,
	name: string,
): Promise<string> {
	const response = await request.post('/api/media', {
		headers: { origin: ORIGIN },
		multipart: {
			slug,
			file: { name, mimeType: 'image/jpeg', buffer: file.buffer },
		},
	});

	expect(response.status()).toBe(201);
	return ((await response.json()) as { path: string }).path;
}

async function createPost(
	request: APIRequestContext,
	data: Record<string, unknown>,
): Promise<string> {
	const response = await request.post('/api/save', { data });
	expect(response.status()).toBe(201);
	return ((await response.json()) as { post: { slug: string } }).post.slug;
}

function carousel(items: CarouselItem[], aspect = '16/9') {
	return {
		type: 'carousel',
		props: { items: JSON.stringify(items), aspect },
	};
}

function parityBody(image: string) {
	return [
		{
			type: 'paragraph',
			content: [{ type: 'text', text: 'Intro text', styles: {} }],
		},
		{
			type: 'heading',
			props: { level: 2 },
			content: [{ type: 'text', text: 'A heading', styles: {} }],
		},
		{
			type: 'bulletListItem',
			content: [{ type: 'text', text: 'First bullet', styles: {} }],
		},
		{
			type: 'bulletListItem',
			content: [{ type: 'text', text: 'Second bullet', styles: { bold: true } }],
		},
		{
			type: 'numberedListItem',
			content: [{ type: 'text', text: 'First step', styles: {} }],
		},
		{
			type: 'numberedListItem',
			content: [{ type: 'text', text: 'Second step', styles: {} }],
		},
		{
			type: 'paragraph',
			content: [
				{
					type: 'link',
					href: 'https://example.com',
					content: [{ type: 'text', text: 'Example link', styles: {} }],
				},
			],
		},
		carousel([{ src: image, alt: 'Parity image', caption: 'Parity caption' }]),
	];
}

async function imageSources(page: Locator): Promise<(string | null)[]> {
	return page.evaluateAll((images) => images.map((image) => image.getAttribute('src')));
}

/**
 * Astro inlines component styles and scripts differently per render path, and
 * the dev server adds data-astro-source-* attributes that the container does
 * not. Neither affects the rendered output, so strip them before comparing.
 */
async function textBlockHtml(blocks: Locator): Promise<string[]> {
	return blocks.evaluate((root) => {
		const clean = (node: Element) => {
			const clone = node.cloneNode(true) as Element;
			for (const element of [clone, ...Array.from(clone.querySelectorAll('*'))]) {
				element.removeAttribute('data-astro-source-file');
				element.removeAttribute('data-astro-source-loc');
			}
			return clone.outerHTML;
		};

		return Array.from(root.children)
			.filter((child) => !child.matches('figure.carousel, style, script'))
			.map(clean);
	});
}

let large: Fixture;
let second: Fixture;
let firstSlide: string;
let parityImage: string;

// Astro dev caches getStaticPaths per route, so every post the suite opens on
// /projects/<slug> must exist before the first /projects request.
test.beforeAll(async () => {
	large = await makeImage('large.jpg', 123456789);
	second = await makeImage('second.jpg', 987654321);

	// The fixture must exercise the ~3 MB case, not a tiny placeholder.
	const { size } = await stat(large.path);
	expect(size).toBeGreaterThan(2.5 * 1024 * 1024);

	await resetProjects();
	await resetUploads();

	const api = await playwrightRequest.newContext({ baseURL: ORIGIN });
	try {
		const pickerImage = await upload(api, 'picker-test', large, 'seeded.jpg');
		await createPost(api, {
			slug: 'picker-test',
			title: 'Picker Test',
			summary: 'Picker summary.',
			date: '2026-06-01',
			draft: true,
			body: [carousel([{ src: pickerImage, alt: '', caption: '' }])],
		});

		firstSlide = await upload(api, 'carousel-round-trip', large, 'first.jpg');
		await createPost(api, {
			slug: 'carousel-round-trip',
			title: 'Carousel Round Trip',
			summary: 'Carousel summary.',
			date: '2026-06-01',
			draft: false,
			body: [
				carousel([{ src: firstSlide, alt: 'First slide', caption: 'First caption' }]),
			],
		});

		parityImage = await upload(api, 'parity', second, 'parity.jpg');
		await createPost(api, {
			slug: 'parity',
			title: 'Parity',
			summary: 'Parity summary.',
			date: '2026-06-01',
			draft: false,
			body: parityBody(parityImage),
		});
	} finally {
		await api.dispose();
	}
});

test.describe('phase 0b - BlockNote spike', () => {
	test.describe.configure({ mode: 'serial' });

	test('media picker uploads a ~3 MB image to disk', async ({ page }) => {
		const slug = 'picker-test';

		await page.goto(`/admin/edit/${slug}`);
		await expect(page.locator('img[src^="/uploads/"]')).toHaveCount(1);

		const before = await readdir(join(UPLOADS_DIR, slug));

		await page.locator('input[type="file"]').setInputFiles(second.path);
		await expect(page.locator('img[src^="/uploads/"]')).toHaveCount(2);

		const after = await readdir(join(UPLOADS_DIR, slug));
		expect(after.length).toBe(before.length + 1);

		const added = after.find((name) => !before.includes(name));
		expect(added).toBeDefined();

		const { size } = await stat(join(UPLOADS_DIR, slug, added as string));
		expect(size).toBeGreaterThan(0);
		expect(size).toBeLessThan(3.5 * 1024 * 1024);
		expect(size).toBeLessThan(large.buffer.length);
	});

	test('carousel with a ~3 MB image round-trips through JSON', async ({ page }) => {
		const slug = 'carousel-round-trip';

		await page.goto(`/admin/edit/${slug}`);
		await expect(page.locator('img[src^="/uploads/"]')).toHaveCount(1);

		// Add a second slide through the media picker.
		await page.locator('input[type="file"]').setInputFiles(second.path);
		await expect(page.locator('img[src^="/uploads/"]')).toHaveCount(2);

		await page.getByLabel('Alt text').nth(1).fill('Second slide');
		await page.getByLabel('Caption').nth(1).fill('Second caption');

		// Move the new slide to the front.
		await page.getByRole('button', { name: 'Down' }).first().click();

		const reordered = await imageSources(page.locator('img[src^="/uploads/"]'));
		expect(reordered).toHaveLength(2);
		expect(reordered[0]).not.toBe(firstSlide);

		await page.getByRole('button', { name: 'Save' }).click();
		await expect(page).toHaveURL('/admin');

		const saved = JSON.parse(await readFile(join(PROJECTS_DIR, `${slug}.json`), 'utf8'));
		const items = JSON.parse(saved.body[0].props.items) as CarouselItem[];

		expect(items).toHaveLength(2);
		expect(items.map((item) => item.src)).toEqual(reordered);
		expect(items[0]).toMatchObject({ alt: 'Second slide', caption: 'Second caption' });

		// Reload the editor: the saved order and metadata come back unchanged.
		await page.goto(`/admin/edit/${slug}`);
		await expect(page.locator('img[src^="/uploads/"]')).toHaveCount(2);
		await expect(page.getByLabel('Alt text').first()).toHaveValue('Second slide');
		await expect(page.getByLabel('Caption').first()).toHaveValue('Second caption');
		await expect
			.poll(() => imageSources(page.locator('img[src^="/uploads/"]')))
			.toEqual(reordered);

		// Remove the old slide, then save and load the public page.
		await page.getByRole('button', { name: 'Remove' }).nth(1).click();
		await page.getByRole('button', { name: 'Save' }).click();
		await expect(page).toHaveURL('/admin');

		const trimmed = JSON.parse(await readFile(join(PROJECTS_DIR, `${slug}.json`), 'utf8'));
		const remaining = JSON.parse(trimmed.body[0].props.items) as CarouselItem[];
		expect(remaining).toHaveLength(1);
		expect(remaining[0]).toMatchObject({
			src: reordered[0],
			alt: 'Second slide',
			caption: 'Second caption',
		});

		await page.goto(`/projects/${slug}`);
		const figure = page.locator('figure.carousel');
		await expect(figure).toBeVisible();
		await expect(figure.locator('img')).toHaveAttribute('src', remaining[0].src);
		await expect(figure.locator('img')).toHaveAttribute('alt', 'Second slide');
		await expect(figure.locator('figcaption')).toHaveText('Second caption');
	});

	test('static page and /api/preview render the same HTML', async ({ page, request }) => {
		const slug = 'parity';
		const image = parityImage;
		const body = parityBody(image);

		const response = await request.post('/api/preview', { data: { blocks: body } });
		expect(response.status()).toBe(200);
		const previewHtml = await response.text();

		await page.goto(`/projects/${slug}`);
		const staticBlocks = page.locator('[data-blocks]');
		await expect(staticBlocks).toBeVisible();
		const staticHtml = await textBlockHtml(staticBlocks);

		await page.setContent(previewHtml);
		const previewBlocks = page.locator('[data-blocks]');
		const previewText = await textBlockHtml(previewBlocks);

		expect(staticHtml.length).toBeGreaterThan(0);
		expect(previewText).toEqual(staticHtml);

		// The carousel is compared separately: Astro inlines its style and
		// script on one path and bundles them on the other.
		await page.goto(`/projects/${slug}`);
		await expect(page.locator('figure.carousel img')).toHaveAttribute('src', image);
		await expect(page.locator('figure.carousel figcaption')).toHaveText('Parity caption');

		await page.setContent(previewHtml);
		await expect(page.locator('figure.carousel img')).toHaveAttribute('src', image);
		await expect(page.locator('figure.carousel img')).toHaveAttribute('alt', 'Parity image');
		await expect(page.locator('figure.carousel figcaption')).toHaveText('Parity caption');
	});
});
