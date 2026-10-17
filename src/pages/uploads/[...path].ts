import type { APIRoute } from 'astro';
import { readFile } from 'node:fs/promises';
import { join, normalize } from 'node:path';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
	const safe = normalize(params.path ?? '').replace(/^\/+/, '');

	if (!safe || safe.startsWith('..')) {
		return new Response('Not Found', { status: 404 });
	}

	try {
		const root = process.env.UPLOADS_DIR ?? 'src/assets/uploads';
		const data = await readFile(join(root, safe));
		return new Response(data, { headers: { 'content-type': contentType(safe) } });
	} catch {
		return new Response('Not Found', { status: 404 });
	}
};

function contentType(path: string): string {
	if (path.endsWith('.png')) return 'image/png';
	if (path.endsWith('.webp')) return 'image/webp';
	if (path.endsWith('.avif')) return 'image/avif';
	if (path.endsWith('.gif')) return 'image/gif';
	return 'image/jpeg';
}
