import type { APIRoute } from 'astro';
import { deletePost } from '../../lib/storage';

export const prerender = false;

export const POST: APIRoute = async ({ request, redirect }) => {
	const form = await request.formData();
	const slug = String(form.get('slug') ?? '').trim();

	if (!slug) return new Response('Slug is required', { status: 400 });

	const removed = await deletePost(slug);
	if (!removed) return new Response('Not Found', { status: 404 });

	return redirect('/admin', 303);
};
