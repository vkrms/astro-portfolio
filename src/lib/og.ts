import type { ImageMetadata } from 'astro';
import { getImage } from 'astro:assets';

/**
 * Resolves a stored upload path to a generated 1200x630 JPEG for social cards.
 * Remote URLs pass through; an unknown local path falls back to the original.
 */
const uploads = import.meta.glob<{ default: ImageMetadata }>(
	'/src/assets/uploads/**/*.{jpg,jpeg,png,webp,avif,gif}',
	{ eager: true },
);

export async function ogImageUrl(src: string | undefined): Promise<string | undefined> {
	if (!src) return undefined;

	const asset = uploads[`/src/assets${src}`]?.default;
	if (!asset) return src;

	const image = await getImage({
		src: asset,
		width: 1200,
		height: 630,
		fit: 'cover',
		format: 'jpg',
	});

	return image.src;
}
