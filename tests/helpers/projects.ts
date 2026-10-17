import { expect, type APIRequestContext } from '@playwright/test';
import { mkdir, rm } from 'node:fs/promises';

export const PROJECTS_DIR = 'tmp/e2e-projects';
export const UPLOADS_DIR = 'tmp/e2e-uploads';

export async function resetProjects() {
	await rm(PROJECTS_DIR, { recursive: true, force: true });
	await mkdir(PROJECTS_DIR, { recursive: true });
}

export async function resetUploads() {
	await rm(UPLOADS_DIR, { recursive: true, force: true });
	await mkdir(UPLOADS_DIR, { recursive: true });
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
