import type { APIRoute } from 'astro';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { slugify } from '../../lib/storage';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
	const form = await request.formData();
	const file = form.get('file');
	const slug = slugify(String(form.get('slug') ?? 'draft')) || 'draft';

	if (!(file instanceof File)) {
		return new Response('File is required', { status: 400 });
	}

	const extension =
		file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
	const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
	const root = process.env.UPLOADS_DIR ?? 'src/assets/uploads';
	const dir = join(root, slug);

	await mkdir(dir, { recursive: true });
	await writeFile(join(dir, name), Buffer.from(await file.arrayBuffer()));

	return new Response(JSON.stringify({ path: `/uploads/${slug}/${name}` }), {
		status: 201,
		headers: { 'content-type': 'application/json' },
	});
};
