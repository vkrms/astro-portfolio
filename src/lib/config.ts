/**
 * Site-wide settings shape (nav, SEO defaults, contact links) used by the
 * shell (Header/Footer) and the Base layout.
 *
 * Phase 1 will source this from the `site` settings singleton
 * (`src/content/settings/site.json`) edited in the admin. Until that exists,
 * `defaultSiteConfig` keeps the shell rendering without a CMS.
 */
export interface SiteNavItem {
	title: string;
	link: string;
}

export interface SiteContactLink {
	title: string;
	link: string;
	icon: string;
}

export interface SiteSeo {
	title: string;
	description: string;
	siteOwner?: string;
	logo?: string;
}

export interface SiteConfig {
	seo: SiteSeo;
	nav: SiteNavItem[];
	contactLinks: SiteContactLink[];
	/** Set to false to render the footer without its starfield. */
	footerStarfield?: boolean;
}

export const defaultSiteConfig: SiteConfig = {
	seo: {
		title: 'Portfolio',
		description: 'A personal portfolio built with Astro.',
	},
	nav: [
		{ title: 'Home', link: '/' },
		{ title: 'Projects', link: '/projects' },
		{ title: 'About', link: '/about' },
	],
	contactLinks: [],
};
