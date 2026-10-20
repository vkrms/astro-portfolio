export type EmbedProvider = 'youtube' | 'vimeo' | 'figma' | 'codepen' | 'link';

export interface EmbedInfo {
	provider: EmbedProvider;
	embedUrl: string;
	thumbnail?: string;
	label: string;
}

function withProtocol(raw: string): string {
	return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

/**
 * Turns a pasted URL into an iframe URL and, where possible, a thumbnail for
 * the click-to-load facade. Unknown URLs fall back to a plain link card.
 */
export function parseEmbedUrl(raw: string): EmbedInfo | null {
	const value = raw.trim();
	if (!value) return null;

	let url: URL;
	try {
		url = new URL(withProtocol(value));
	} catch {
		return null;
	}

	const youtube =
		/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/.exec(value);
	if (youtube) {
		return {
			provider: 'youtube',
			embedUrl: `https://www.youtube.com/embed/${youtube[1]}`,
			thumbnail: `https://i.ytimg.com/vi/${youtube[1]}/hqdefault.jpg`,
			label: 'YouTube',
		};
	}

	const vimeo = /vimeo\.com\/(\d+)/.exec(value);
	if (vimeo) {
		return {
			provider: 'vimeo',
			embedUrl: `https://player.vimeo.com/video/${vimeo[1]}`,
			label: 'Vimeo',
		};
	}

	if (/(^|\.)figma\.com$/.test(url.hostname)) {
		return {
			provider: 'figma',
			embedUrl: `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url.toString())}`,
			label: 'Figma',
		};
	}

	const codepen = /codepen\.io\/([^/]+)\/pen\/([^/?#]+)/.exec(value);
	if (codepen) {
		return {
			provider: 'codepen',
			embedUrl: `https://codepen.io/${codepen[1]}/embed/${codepen[2]}?default-tab=result`,
			label: 'CodePen',
		};
	}

	return { provider: 'link', embedUrl: url.toString(), label: url.hostname };
}
