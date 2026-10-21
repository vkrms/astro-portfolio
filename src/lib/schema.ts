import { z } from 'zod';

/**
 * Validation shared by the storage layer, the save API and the build. Invalid
 * post or settings JSON throws with a readable message, so a bad file fails the
 * build instead of rendering an empty page.
 */
export const postLinkSchema = z.object({
	label: z.string().min(1),
	url: z.string().min(1),
});

export const postFileSchema = z.object({
	title: z.string().min(1).max(128),
	// Reads tolerate a legacy file without a summary; the admin still refuses
	// to save one.
	summary: z.string().max(280).default(''),
	date: z.string().min(1),
	draft: z.boolean().default(true),
	cover: z.string().optional(),
	coverAlt: z.string().optional(),
	tags: z.array(z.string().min(1)).optional(),
	role: z.string().optional(),
	client: z.string().optional(),
	links: z.array(postLinkSchema).optional(),
	featured: z.boolean().default(false),
	body: z.array(z.unknown()).default([]),
	schemaVersion: z.number().int().positive().default(1),
});

export type PostFile = z.infer<typeof postFileSchema>;

export const siteSettingsSchema = z.object({
	seo: z.object({
		title: z.string().min(1),
		description: z.string(),
		siteOwner: z.string().optional(),
		logo: z.string().optional(),
	}),
	nav: z.array(z.object({ title: z.string().min(1), link: z.string().min(1) })).default([]),
	contactLinks: z
		.array(
			z.object({
				title: z.string().min(1),
				link: z.string().min(1),
				icon: z.string().min(1),
			}),
		)
		.default([]),
	footerStarfield: z.boolean().optional(),
});

export const homeSettingsSchema = z.object({
	intro: z.string().default(''),
	featured: z.array(z.string().min(1)).default([]),
});

export type SiteSettings = z.infer<typeof siteSettingsSchema>;
export type HomeSettings = z.infer<typeof homeSettingsSchema>;

export function formatZodError(error: z.ZodError): string {
	return error.issues
		.map((issue) => `${issue.path.join('.') || 'value'}: ${issue.message}`)
		.join('; ');
}
