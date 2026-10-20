import type { APIRoute } from 'astro';
import {
	aboutSettingsSchema,
	homeSettingsSchema,
	siteSettingsSchema,
} from '../../lib/schema';
import {
	readAboutSettings,
	readHomeSettings,
	readSiteSettings,
	writeAboutSettings,
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
	const [site, home, about] = await Promise.all([
		readSiteSettings(),
		readHomeSettings(),
		readAboutSettings(),
	]);

	return json({ site, home, about });
};

export const POST: APIRoute = async ({ request }) => {
	try {
		const payload = (await request.json()) as {
			site?: unknown;
			home?: unknown;
			about?: unknown;
		};

		if (!payload.site || !payload.home || !payload.about) {
			return json({ error: 'site, home and about are required' }, 400);
		}

		// Validate all three before writing any, so a bad field cannot leave a
		// partially updated settings set on disk.
		siteSettingsSchema.parse(payload.site);
		homeSettingsSchema.parse(payload.home);
		aboutSettingsSchema.parse(payload.about);

		const [site, home, about] = await Promise.all([
			writeSiteSettings(payload.site),
			writeHomeSettings(payload.home),
			writeAboutSettings(payload.about),
		]);

		return json({ site, home, about });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Invalid settings';
		return json({ error: message }, 400);
	}
};
