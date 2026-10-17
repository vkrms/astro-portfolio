import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { deletePost, duplicatePost, readPost, writePost } from '../../src/lib/storage';

let dir = '';

beforeEach(async () => {
	dir = await mkdtemp(join(tmpdir(), 'projects-'));
});

afterEach(async () => {
	await rm(dir, { recursive: true, force: true });
});

describe('deletePost', () => {
	it('deletes an existing post', async () => {
		await writePost({ title: 'Original', summary: 'S', date: '2026-01-01' }, { dir });

		expect(await deletePost('original', { dir })).toBe(true);
		expect(await readPost('original', { dir })).toBeNull();
	});

	it('returns false for a missing post', async () => {
		expect(await deletePost('missing', { dir })).toBe(false);
	});
});

describe('duplicatePost', () => {
	it('copies a post as a draft with a unique slug', async () => {
		await writePost(
			{ title: 'Original', summary: 'S', date: '2026-01-01', draft: false },
			{ dir },
		);

		const copy = await duplicatePost('original', { dir });

		expect(copy).toMatchObject({ slug: 'original-copy', draft: true });
		expect(await readPost('original-copy', { dir })).toMatchObject({
			title: 'Original',
			draft: true,
		});
	});

	it('adds a suffix when the copy already exists', async () => {
		await writePost({ title: 'Original', summary: 'S', date: '2026-01-01' }, { dir });
		await duplicatePost('original', { dir });

		const second = await duplicatePost('original', { dir });

		expect(second?.slug).toBe('original-copy-2');
	});

	it('returns null for a missing post', async () => {
		expect(await duplicatePost('missing', { dir })).toBeNull();
	});
});
