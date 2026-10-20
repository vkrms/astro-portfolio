import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { listPosts, parseLinks, readPost, slugify, writePost } from '../../src/lib/storage';

let dir = '';

beforeEach(async () => {
	dir = await mkdtemp(join(tmpdir(), 'projects-'));
});

afterEach(async () => {
	await rm(dir, { recursive: true, force: true });
});

describe('listPosts', () => {
	it('returns an empty array when the directory does not exist', async () => {
		expect(await listPosts({ dir: join(dir, 'missing') })).toEqual([]);
	});

	it('returns an empty array when there are no JSON files', async () => {
		await writeFile(join(dir, 'notes.txt'), 'ignore me');
		expect(await listPosts({ dir })).toEqual([]);
	});

	it('parses JSON files and sorts newest first', async () => {
		await writeFile(
			join(dir, 'older.json'),
			JSON.stringify({ title: 'Older', date: '2026-01-01' }),
		);
		await writeFile(
			join(dir, 'newer.json'),
			JSON.stringify({ title: 'Newer', date: '2026-06-01', draft: true }),
		);

		const posts = await listPosts({ dir });

		expect(posts.map((post) => post.slug)).toEqual(['newer', 'older']);
		expect(posts[0]).toMatchObject({ slug: 'newer', title: 'Newer', draft: true });
	});

	it('can exclude drafts', async () => {
		await writeFile(
			join(dir, 'draft.json'),
			JSON.stringify({ title: 'Draft', date: '2026-06-01', draft: true }),
		);
		await writeFile(
			join(dir, 'live.json'),
			JSON.stringify({ title: 'Live', date: '2026-01-01' }),
		);

		const posts = await listPosts({ dir, publishedOnly: true });

		expect(posts.map((post) => post.slug)).toEqual(['live']);
	});

	it('rejects invalid JSON', async () => {
		await writeFile(join(dir, 'bad.json'), '{ not json');
		await expect(listPosts({ dir })).rejects.toThrow();
	});
});

describe('slugify', () => {
	it('lowercases and hyphenates', () => {
		expect(slugify('Hello, World!')).toBe('hello-world');
	});

	it('collapses spaces and trims hyphens', () => {
		expect(slugify('  Multiple   spaces  ')).toBe('multiple-spaces');
	});

	it('returns an empty string when nothing is left', () => {
		expect(slugify('!!!')).toBe('');
	});
});

describe('parseLinks', () => {
	it('keeps valid links and drops invalid entries', () => {
		expect(
			parseLinks([
				{ label: 'Live', url: 'https://example.com' },
				{ label: 'Missing url' },
				null,
				'nope',
			]),
		).toEqual([{ label: 'Live', url: 'https://example.com' }]);
	});

	it('returns undefined for non-arrays', () => {
		expect(parseLinks(undefined)).toBeUndefined();
		expect(parseLinks('nope')).toBeUndefined();
	});
});

describe('readPost', () => {
	it('returns null when the file does not exist', async () => {
		expect(await readPost('missing', { dir })).toBeNull();
	});

	it('returns the parsed post', async () => {
		await writeFile(
			join(dir, 'p.json'),
			JSON.stringify({
				title: 'P',
				summary: 'S',
				date: '2026-01-01',
				draft: false,
				links: [{ label: 'Live', url: 'https://example.com' }],
				body: [{ type: 'paragraph' }],
			}),
		);

		const post = await readPost('p', { dir });

		expect(post).toMatchObject({
			slug: 'p',
			title: 'P',
			summary: 'S',
			draft: false,
			links: [{ label: 'Live', url: 'https://example.com' }],
			body: [{ type: 'paragraph' }],
			schemaVersion: 1,
		});
	});

	it('can hide drafts', async () => {
		await writeFile(
			join(dir, 'd.json'),
			JSON.stringify({ title: 'D', summary: 'S', date: '2026-01-01', draft: true }),
		);
		expect(await readPost('d', { dir, publishedOnly: true })).toBeNull();
	});

	it('rejects a post that fails validation', async () => {
		await writeFile(join(dir, 'bad.json'), JSON.stringify({ title: '', date: '2026-01-01' }));
		await expect(readPost('bad', { dir })).rejects.toThrow('Invalid post');
	});
});

describe('writePost', () => {
	it('writes a JSON file with defaults', async () => {
		const post = await writePost(
			{ title: 'Hello World', summary: 'Summary', date: '2026-06-01' },
			{ dir },
		);

		expect(post).toMatchObject({ slug: 'hello-world', title: 'Hello World', draft: true });

		const raw = await readFile(join(dir, 'hello-world.json'), 'utf8');
		expect(JSON.parse(raw)).toMatchObject({
			title: 'Hello World',
			summary: 'Summary',
			date: '2026-06-01',
			draft: true,
			body: [],
			schemaVersion: 1,
		});
	});

	it('creates the directory when it does not exist', async () => {
		const nested = join(dir, 'nested');
		await writePost({ title: 'Nested', summary: 'S', date: '2026-06-01' }, { dir: nested });
		await expect(readFile(join(nested, 'nested.json'), 'utf8')).resolves.toContain('Nested');
	});

	it('uses and slugifies an explicit slug', async () => {
		const post = await writePost(
			{ slug: 'Custom Slug', title: 'Title', summary: 'S', date: '2026-06-01' },
			{ dir },
		);
		expect(post.slug).toBe('custom-slug');
	});

	it('writes optional links', async () => {
		await writePost(
			{
				title: 'With Links',
				summary: 'S',
				date: '2026-06-01',
				links: [{ label: 'Live', url: 'https://example.com' }],
			},
			{ dir },
		);

		const raw = JSON.parse(await readFile(join(dir, 'with-links.json'), 'utf8'));
		expect(raw.links).toEqual([{ label: 'Live', url: 'https://example.com' }]);
	});

	it('writes the cover, tags, role, client and featured fields', async () => {
		await writePost(
			{
				title: 'Full Post',
				summary: 'S',
				date: '2026-06-01',
				cover: '/uploads/full/cover.jpg',
				coverAlt: 'Cover alt',
				tags: ['design', 'astro'],
				role: 'Design and front end',
				client: 'Acme',
				featured: true,
			},
			{ dir },
		);

		const raw = JSON.parse(await readFile(join(dir, 'full-post.json'), 'utf8'));
		expect(raw).toMatchObject({
			cover: '/uploads/full/cover.jpg',
			coverAlt: 'Cover alt',
			tags: ['design', 'astro'],
			role: 'Design and front end',
			client: 'Acme',
			featured: true,
		});
	});

	it('requires a title, summary and date', async () => {
		await expect(
			writePost({ title: '', summary: 'S', date: '2026-06-01' }, { dir }),
		).rejects.toThrow('Title');
		await expect(
			writePost({ title: 'T', summary: '', date: '2026-06-01' }, { dir }),
		).rejects.toThrow('Summary');
		await expect(
			writePost({ title: 'T', summary: 'S', date: '' }, { dir }),
		).rejects.toThrow('Date');
	});
});
