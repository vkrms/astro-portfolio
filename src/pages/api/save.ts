import type { APIRoute } from 'astro';
import { parseLinks, writePost } from '../../lib/storage';

export const prerender = false;

function parseTags(value: unknown): string[] | undefined {
	if (Array.isArray(value)) {
		const tags = value.filter((tag): tag is string => typeof tag === 'string').map((tag) => tag.trim());
		return tags.filter(Boolean).length > 0 ? tags.filter(Boolean) : undefined;
	}

	if (typeof value === 'string') {
		const tags = value.split(',').map((tag) => tag.trim()).filter(Boolean);
		return tags.length > 0 ? tags : undefined;
	}

	return undefined;
}

function parseLinksInput(value: unknown) {
	if (typeof value === 'string') {
		try {
			return parseLinks(JSON.parse(value));
		} catch {
			return undefined;
		}
	}

	return parseLinks(value);
}

export const POST: APIRoute = async ({ request, redirect }) => {
	const contentType = request.headers.get('content-type') ?? '';
	const isJson = contentType.includes('application/json');

	let input: Record<string, unknown>;
	if (isJson) {
		input = (await request.json()) as Record<string, unknown>;
	} else {
		input = Object.fromEntries(await request.formData());
	}

	try {
		const post = await writePost({
			slug: typeof input.slug === 'string' ? input.slug : undefined,
			title: String(input.title ?? ''),
			summary: String(input.summary ?? ''),
			date: String(input.date ?? ''),
			draft: input.draft === true || input.draft === 'on',
			featured: input.featured === true || input.featured === 'on',
			cover: typeof input.cover === 'string' && input.cover ? input.cover : undefined,
			coverAlt: typeof input.coverAlt === 'string' ? input.coverAlt : undefined,
			tags: parseTags(input.tags),
			role: typeof input.role === 'string' ? input.role : undefined,
			client: typeof input.client === 'string' ? input.client : undefined,
			links: parseLinksInput(input.links),
			body: Array.isArray(input.body) ? input.body : undefined,
		});

		if (isJson) {
			return new Response(JSON.stringify({ post }), {
				status: 201,
				headers: { 'content-type': 'application/json' },
			});
		}

		return redirect('/admin', 303);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Invalid post';

		if (isJson) {
			return new Response(JSON.stringify({ error: message }), {
				status: 400,
				headers: { 'content-type': 'application/json' },
			});
		}

		return new Response(message, { status: 400 });
	}
};
