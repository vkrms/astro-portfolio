import { expect, type APIRequestContext } from '@playwright/test';
import { mkdir, rm } from 'node:fs/promises';

export const PROJECTS_DIR = 'tmp/e2e-projects';
export const UPLOADS_DIR = 'tmp/e2e-uploads';
export const SETTINGS_DIR = 'tmp/e2e-settings';

export async function resetProjects() {
	await rm(PROJECTS_DIR, { recursive: true, force: true });
	await mkdir(PROJECTS_DIR, { recursive: true });
}

export async function resetUploads() {
	await rm(UPLOADS_DIR, { recursive: true, force: true });
	await mkdir(UPLOADS_DIR, { recursive: true });
}

export async function resetSettings() {
	await rm(SETTINGS_DIR, { recursive: true, force: true });
	await mkdir(SETTINGS_DIR, { recursive: true });
}

/** Updates one settings singleton, keeping the other two from the server. */
export async function updateSettings(
	request: APIRequestContext,
	patch: { site?: unknown; home?: unknown; about?: unknown },
) {
	const current = (await (await request.get('/api/settings')).json()) as {
		site: unknown;
		home: unknown;
		about: unknown;
	};

	const response = await request.post('/api/settings', {
		data: { ...current, ...patch },
	});
	if (!response.ok()) throw new Error(await response.text());
}

/**
 * Astro caches getStaticPaths per route in dev and clears it when a project
 * JSON changes. Wait for the new slug to appear before the test navigates.
 */
export async function waitForProject(request: APIRequestContext, slug: string) {
	await expect
		.poll(async () => (await request.get(`/projects/${slug}`)).status(), {
			message: `Waiting for /projects/${slug}`,
			timeout: 5000,
		})
		.toBe(200);
}
