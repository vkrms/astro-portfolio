import type { APIRoute } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import Blocks from '../../blocks/render/Blocks.astro';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
	const payload = (await request.json()) as { blocks?: unknown[] };
	const container = await AstroContainer.create();
	const html = await container.renderToString(Blocks, {
		props: { blocks: payload.blocks ?? [] },
	});

	return new Response(html, { headers: { 'content-type': 'text/html' } });
};
