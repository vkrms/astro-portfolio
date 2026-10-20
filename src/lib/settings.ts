/**
 * Settings singletons. Three JSON files under src/content/settings hold the
 * site shell, the home intro/featured list and the about page. Missing files
 * fall back to defaults; malformed files throw so the build fails loudly.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { defaultSiteConfig, type SiteConfig } from './config';
import {
	aboutSettingsSchema,
	formatZodError,
	homeSettingsSchema,
	siteSettingsSchema,
	type AboutSettings,
	type HomeSettings,
	type SiteSettings,
} from './schema';

export const SETTINGS_DIR = 'src/content/settings';

export const defaultHomeSettings: HomeSettings = {
	intro: 'Selected work and experiments in design and engineering.',
	featured: [],
};

export const defaultAboutSettings: AboutSettings = {
	body: [],
	portrait: undefined,
	portraitAlt: undefined,
};

function settingsDir(): string {
	return process.env.SETTINGS_DIR ?? SETTINGS_DIR;
}

async function readJson(name: string): Promise<unknown | null> {
	try {
		return JSON.parse(await readFile(join(settingsDir(), `${name}.json`), 'utf8'));
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
		throw error;
	}
}

async function writeJson(name: string, value: unknown): Promise<void> {
	const dir = settingsDir();
	await mkdir(dir, { recursive: true });
	await writeFile(join(dir, `${name}.json`), `${JSON.stringify(value, null, '\t')}\n`, 'utf8');
}

export async function readSiteSettings(): Promise<SiteSettings> {
	const data = await readJson('site');
	if (data === null) return defaultSiteConfig;

	const result = siteSettingsSchema.safeParse(data);
	if (!result.success) throw new Error(`Invalid site settings: ${formatZodError(result.error)}`);
	return result.data;
}

export async function writeSiteSettings(value: unknown): Promise<SiteSettings> {
	const result = siteSettingsSchema.safeParse(value);
	if (!result.success) throw new Error(formatZodError(result.error));
	await writeJson('site', result.data);
	return result.data;
}

export async function readHomeSettings(): Promise<HomeSettings> {
	const data = await readJson('home');
	if (data === null) return defaultHomeSettings;

	const result = homeSettingsSchema.safeParse(data);
	if (!result.success) throw new Error(`Invalid home settings: ${formatZodError(result.error)}`);
	return result.data;
}

export async function writeHomeSettings(value: unknown): Promise<HomeSettings> {
	const result = homeSettingsSchema.safeParse(value);
	if (!result.success) throw new Error(formatZodError(result.error));
	await writeJson('home', result.data);
	return result.data;
}

export async function readAboutSettings(): Promise<AboutSettings> {
	const data = await readJson('about');
	if (data === null) return defaultAboutSettings;

	const result = aboutSettingsSchema.safeParse(data);
	if (!result.success) throw new Error(`Invalid about settings: ${formatZodError(result.error)}`);
	return result.data;
}

export async function writeAboutSettings(value: unknown): Promise<AboutSettings> {
	const result = aboutSettingsSchema.safeParse(value);
	if (!result.success) throw new Error(formatZodError(result.error));
	await writeJson('about', result.data);
	return result.data;
}

export type { AboutSettings, HomeSettings, SiteConfig, SiteSettings };
