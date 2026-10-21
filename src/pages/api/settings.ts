import type { APIRoute } from 'astro';
import { homeSettingsSchema, siteSettingsSchema } from '../../lib/schema';
import {
	readHomeSettings,
	readSiteSettings,
	writeHomeSettings,
	writeSiteSettings,
} from '../../lib/settings';

export const prerender = false;

function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'content-type': 'application/json' },
	});
}

export const GET: APIRoute = async () => {
	const [site, home] = await Promise.all([readSiteSettings(), readHomeSettings()]);

	return json({ site, home });
};

export const POST: APIRoute = async ({ request }) => {
	try {
		const payload = (await request.json()) as {
			site?: unknown;
			home?: unknown;
		};

		if (!payload.site || !payload.home) {
			return json({ error: 'site and home are required' }, 400);
		}

		// Validate both before writing either, so a bad field cannot leave a
		// partially updated settings set on disk.
		siteSettingsSchema.parse(payload.site);
		homeSettingsSchema.parse(payload.home);

		const [site, home] = await Promise.all([
			writeSiteSettings(payload.site),
			writeHomeSettings(payload.home),
		]);

		return json({ site, home });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Invalid settings';
		return json({ error: message }, 400);
	}
};
