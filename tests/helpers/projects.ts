import { expect, type APIRequestContext, type Page } from '@playwright/test';
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

/** Updates one settings singleton, keeping the other from the server. */
export async function updateSettings(
	request: APIRequestContext,
	patch: { site?: unknown; home?: unknown },
) {
	const current = (await (await request.get('/api/settings')).json()) as {
		site: unknown;
		home: unknown;
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

/** Waits until every server-rendered Astro island on the page has hydrated. */
export async function waitForHydration(page: Page) {
	await page.waitForFunction(() => !document.querySelector('astro-island[ssr]'));
}

/** Opens the row actions menu for a post in the Posts table. */
export async function openPostActions(page: Page, title: string) {
	await waitForHydration(page);
	await page.getByRole('table').getByRole('button', { name: `Actions for ${title}` }).click();
	return page.getByRole('menu');
}
