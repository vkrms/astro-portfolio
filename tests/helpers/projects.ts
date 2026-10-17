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
