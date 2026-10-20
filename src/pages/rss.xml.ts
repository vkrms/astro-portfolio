import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { readSiteSettings } from '../lib/settings';
import { listPosts } from '../lib/storage';

export async function GET(context: APIContext) {
	const [site, posts] = await Promise.all([
		readSiteSettings(),
		listPosts({ publishedOnly: true }),
	]);

	return rss({
		title: site.seo.title,
		description: site.seo.description,
		site: context.site ?? 'http://localhost:1892',
		items: posts
			.filter((post) => post.date)
			.map((post) => ({
				title: post.title,
				description: post.summary ?? '',
				pubDate: new Date(post.date as string),
				link: `/projects/${post.slug}`,
			})),
	});
}
