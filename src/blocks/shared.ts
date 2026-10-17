export interface CarouselItem {
	src: string;
	alt: string;
	caption: string;
}

export const ASPECT_RATIOS = ['16/9', '3/2', '4/3', '1/1'];

export function parseCarouselItems(value: unknown): CarouselItem[] {
	let items: unknown = value;

	if (typeof value === 'string') {
		try {
			items = JSON.parse(value);
		} catch {
			return [];
		}
	}

	if (!Array.isArray(items)) return [];

	return items
		.filter(
			(item): item is { src: string; alt?: string; caption?: string } =>
				typeof item === 'object' &&
				item !== null &&
				typeof (item as { src?: unknown }).src === 'string',
		)
		.map((item) => ({
			src: item.src,
			alt: typeof item.alt === 'string' ? item.alt : '',
			caption: typeof item.caption === 'string' ? item.caption : '',
		}));
}
