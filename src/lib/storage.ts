/**
 * Post storage for Phase 0b. Reads and writes the local repo directly.
 * Production adds a GitHub-backed implementation behind the same API.
 */
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
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

export interface PostInput {
	slug?: string;
	title: string;
	summary: string;
	date: string;
	draft?: boolean;
	body?: unknown[];
	schemaVersion?: number;
}

export function slugify(value: string): string {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

function projectsDir(override?: string): string {
	return override ?? process.env.PROJECTS_DIR ?? PROJECTS_DIR;
}

export async function listPosts(options: ListPostsOptions = {}): Promise<PostSummary[]> {
	const dir = projectsDir(options.dir);

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

export async function writePost(
	input: PostInput,
	options: { dir?: string } = {},
): Promise<PostSummary> {
	const title = input.title.trim();
	const summary = input.summary.trim();
	const date = input.date.trim();

	if (!title) throw new Error('Title is required');
	if (!summary) throw new Error('Summary is required');
	if (!date) throw new Error('Date is required');

	const slug = slugify(input.slug?.trim() || title);
	if (!slug) throw new Error('A valid slug is required');

	const dir = projectsDir(options.dir);
	const post = {
		title,
		summary,
		date,
		draft: input.draft ?? true,
		body: input.body ?? [],
		schemaVersion: input.schemaVersion ?? 1,
	};

	await mkdir(dir, { recursive: true });
	await writeFile(join(dir, `${slug}.json`), `${JSON.stringify(post, null, '\t')}\n`, 'utf8');

	return { slug, title, summary, date, draft: post.draft };
}
