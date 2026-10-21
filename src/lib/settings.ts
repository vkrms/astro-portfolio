/**
 * Settings singletons. Two JSON files under src/content/settings hold the
 * site shell and the home intro/featured list. Missing files
 * fall back to defaults; malformed files throw so the build fails loudly.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { defaultSiteConfig, type SiteConfig } from './config';
import {
	formatZodError,
	homeSettingsSchema,
	siteSettingsSchema,
	type HomeSettings,
	type SiteSettings,
} from './schema';

export const SETTINGS_DIR = 'src/content/settings';

export const defaultHomeSettings: HomeSettings = {
	eyebrow: '',
	headline: '',
	highlight: '',
	ctaLabel: '',
	ctaLink: '',
	intro: 'Selected work and experiments in design and engineering.',
	featured: [],
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

export type { HomeSettings, SiteConfig, SiteSettings };
