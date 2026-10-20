/**
 * Post storage. Reads and writes the local repo directly. The admin is a local
 * tool; commit and push to publish the content. The deployed site is static.
 */
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { formatZodError, postFileSchema, type PostFile } from './schema';

export const PROJECTS_DIR = 'src/content/projects';

export interface PostLink {
	label: string;
	url: string;
}

export interface PostSummary {
	slug: string;
	title: string;
	summary?: string;
	date?: string;
	draft: boolean;
	cover?: string;
	coverAlt?: string;
	tags?: string[];
	featured: boolean;
}

export interface PostRecord extends PostFile {
	slug: string;
}

export interface ListPostsOptions {
	/** Override the projects directory. Used by tests. */
	dir?: string;
	/** Exclude posts with `draft: true`. */
	publishedOnly?: boolean;
}

export interface ReadPostOptions {
	/** Override the projects directory. Used by tests. */
	dir?: string;
	/** Return null for a draft post. */
	publishedOnly?: boolean;
}

export interface PostInput {
	slug?: string;
	title: string;
	summary: string;
	date: string;
	draft?: boolean;
	cover?: string;
	coverAlt?: string;
	tags?: string[];
	role?: string;
	client?: string;
	links?: PostLink[];
	featured?: boolean;
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

export function parseLinks(value: unknown): PostLink[] | undefined {
	if (!Array.isArray(value)) return undefined;

	const links = value.filter(
		(link): link is PostLink =>
			typeof link === 'object' &&
			link !== null &&
			typeof (link as PostLink).label === 'string' &&
			typeof (link as PostLink).url === 'string',
	);

	return links.length > 0 ? links : undefined;
}

function projectsDir(override?: string): string {
	return override ?? process.env.PROJECTS_DIR ?? PROJECTS_DIR;
}

function parsePost(slug: string, data: Record<string, unknown>): PostRecord {
	const result = postFileSchema.safeParse({
		...data,
		// A missing draft flag means published, matching the files written by
		// earlier versions of the admin.
		draft: data.draft === true,
	});

	if (!result.success) {
		throw new Error(`Invalid post "${slug}": ${formatZodError(result.error)}`);
	}

	return { slug, ...result.data };
}

function toSummary(post: PostRecord): PostSummary {
	return {
		slug: post.slug,
		title: post.title,
		summary: post.summary || undefined,
		date: post.date || undefined,
		draft: post.draft,
		cover: post.cover || undefined,
		coverAlt: post.coverAlt || undefined,
		tags: post.tags,
		featured: post.featured,
	};
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
		const post = parsePost(entry.slice(0, -'.json'.length), data);
		if (options.publishedOnly && post.draft) continue;

		posts.push(toSummary(post));
	}

	return posts.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
}

export async function readPost(
	slug: string,
	options: ReadPostOptions = {},
): Promise<PostRecord | null> {
	const dir = projectsDir(options.dir);
	const file = join(dir, `${slug}.json`);

	let raw: string;
	try {
		raw = await readFile(file, 'utf8');
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
		throw error;
	}

	const post = parsePost(slug, JSON.parse(raw) as Record<string, unknown>);
	if (options.publishedOnly && post.draft) return null;

	return post;
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
	const result = postFileSchema.safeParse({
		title,
		summary,
		date,
		draft: input.draft ?? true,
		cover: input.cover,
		coverAlt: input.coverAlt,
		tags: input.tags,
		role: input.role,
		client: input.client,
		links: input.links,
		featured: input.featured ?? false,
		body: input.body ?? [],
		schemaVersion: input.schemaVersion ?? 1,
	});

	if (!result.success) {
		throw new Error(formatZodError(result.error));
	}

	const post = result.data;

	await mkdir(dir, { recursive: true });
	await writeFile(join(dir, `${slug}.json`), `${JSON.stringify(post, null, '\t')}\n`, 'utf8');

	return {
		slug,
		title,
		summary,
		date,
		draft: post.draft,
		cover: post.cover,
		coverAlt: post.coverAlt,
		tags: post.tags,
		featured: post.featured,
	};
}

export async function deletePost(slug: string, options: { dir?: string } = {}): Promise<boolean> {
	const dir = projectsDir(options.dir);

	try {
		await rm(join(dir, `${slug}.json`));
		return true;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
		throw error;
	}
}

export async function duplicatePost(
	slug: string,
	options: { dir?: string } = {},
): Promise<PostSummary | null> {
	const source = await readPost(slug, { dir: options.dir });
	if (!source) return null;

	const dir = projectsDir(options.dir);
	const base = `${source.slug}-copy`;
	let candidate = base;
	let suffix = 2;

	while ((await readPost(candidate, { dir })) !== null) {
		candidate = `${base}-${suffix}`;
		suffix += 1;
	}

	const copy = {
		title: source.title,
		summary: source.summary,
		date: source.date,
		draft: true,
		cover: source.cover,
		coverAlt: source.coverAlt,
		tags: source.tags,
		role: source.role,
		client: source.client,
		links: source.links,
		featured: false,
		body: source.body,
		schemaVersion: source.schemaVersion,
	};

	await mkdir(dir, { recursive: true });
	await writeFile(join(dir, `${candidate}.json`), `${JSON.stringify(copy, null, '\t')}\n`, 'utf8');

	return toSummary({ ...source, slug: candidate, draft: true });
}
