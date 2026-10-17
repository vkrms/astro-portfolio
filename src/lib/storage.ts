/**
 * Post storage for Phase 0b. Reads the local repo directly.
 * Production adds a GitHub-backed implementation behind the same API.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const PROJECTS_DIR = 'src/content/projects';

export interface PostSummary {
	slug: string;
	title: string;
	summary?: string;
	date?: string;
	draft: boolean;
	tags?: string[];
}

export interface ListPostsOptions {
	/** Override the projects directory. Used by tests. */
	dir?: string;
	/** Exclude posts with `draft: true`. */
	publishedOnly?: boolean;
}

export async function listPosts(options: ListPostsOptions = {}): Promise<PostSummary[]> {
	const dir = options.dir ?? process.env.PROJECTS_DIR ?? PROJECTS_DIR;

	let entries: string[];
	try {
		entries = await readdir(dir);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
		throw error;
	}

	const posts: PostSummary[] = [];
	for (const entry of entries) {
		if (!entry.endsWith('.json')) continue;

		const raw = await readFile(join(dir, entry), 'utf8');
		const data = JSON.parse(raw) as Record<string, unknown>;
		if (options.publishedOnly && data.draft === true) continue;

		posts.push({
			slug: entry.slice(0, -'.json'.length),
			title: typeof data.title === 'string' ? data.title : '',
			summary: typeof data.summary === 'string' ? data.summary : undefined,
			date: typeof data.date === 'string' ? data.date : undefined,
			draft: data.draft === true,
			tags: Array.isArray(data.tags)
				? data.tags.filter((tag): tag is string => typeof tag === 'string')
				: undefined,
		});
	}

	return posts.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
}
