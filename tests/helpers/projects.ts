import { mkdir, rm } from 'node:fs/promises';

export const PROJECTS_DIR = 'tmp/e2e-projects';

export async function resetProjects() {
	await rm(PROJECTS_DIR, { recursive: true, force: true });
	await mkdir(PROJECTS_DIR, { recursive: true });
}
