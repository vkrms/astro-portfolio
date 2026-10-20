/**
 * Replaces an embed facade with the provider iframe on click. Safe to call
 * repeatedly; already-initialized facades are skipped.
 */
export function initEmbeds(root: ParentNode = document) {
	root.querySelectorAll<HTMLButtonElement>('[data-embed]:not([data-ready])').forEach((button) => {
		button.dataset.ready = '';
		button.addEventListener('click', () => {
			const src = button.dataset.embedUrl;
			if (!src) return;

			const iframe = document.createElement('iframe');
			iframe.src = src;
			iframe.title = button.dataset.embedTitle || 'Embedded content';
			iframe.loading = 'lazy';
			iframe.allow =
				'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
			iframe.allowFullscreen = true;
			iframe.style.width = '100%';
			iframe.style.height = '100%';
			iframe.style.border = '0';

			button.replaceWith(iframe);
		});
	});
}

initEmbeds();
document.addEventListener('astro:after-swap', () => initEmbeds());
