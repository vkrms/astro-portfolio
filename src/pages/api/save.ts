import type { APIRoute } from 'astro';
import { parseLinks, writePost } from '../../lib/storage';

export const prerender = false;

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
			links: parseLinks(input.links),
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
