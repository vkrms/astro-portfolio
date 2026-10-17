import type { APIRoute } from 'astro';
import { listPosts } from '../../lib/storage';

export const prerender = false;

export const GET: APIRoute = async () => {
	const posts = await listPosts();
	return new Response(JSON.stringify({ posts }), {
		headers: { 'content-type': 'application/json' },
	});
};
