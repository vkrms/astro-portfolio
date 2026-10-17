export interface CarouselItem {
	src: string;
	alt: string;
	caption: string;
}

export const ASPECT_RATIOS = ['16/9', '3/2', '4/3', '1/1'];

interface BlockLike {
	type?: string;
	props?: Record<string, unknown>;
	children?: unknown[];
}

/** True when any image block, including nested ones, has no alt text. */
export function findImageWithoutAlt(blocks: unknown[]): boolean {
	return blocks.some((block) => {
		const current = block as BlockLike;
		if (current.type === 'image' && !String(current.props?.alt ?? '').trim()) return true;
		return Array.isArray(current.children) && findImageWithoutAlt(current.children);
	});
}

/**
 * Fills in defaults for image blocks saved before the custom Image block
 * existed: BlockNote's default image block stored the file in `url`.
 */
export function normalizeBlocks(blocks: unknown[]): unknown[] {
	return blocks.map((block) => {
		const current = block as BlockLike;
		const next: BlockLike = { ...current };

		if (current.type === 'image') {
			const props = { ...(current.props ?? {}) };
			if (typeof props.src !== 'string') {
				props.src = typeof props.url === 'string' ? props.url : '';
			}
			if (typeof props.alt !== 'string') props.alt = '';
			if (typeof props.caption !== 'string') props.caption = '';
			next.props = props;
		}

		if (Array.isArray(current.children)) {
			next.children = normalizeBlocks(current.children);
		}

		return next;
	});
}

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
