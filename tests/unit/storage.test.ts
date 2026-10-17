import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { listPosts } from '../../src/lib/storage';

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
