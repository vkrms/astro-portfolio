/**
 * Wires prev/next, the counter and keyboard arrows. Safe to call repeatedly;
 * already-initialized carousels are skipped. Never autoplays.
 */
export function initCarousels(root: ParentNode = document) {
	root.querySelectorAll<HTMLElement>('[data-carousel]:not([data-ready])').forEach((carousel) => {
		carousel.dataset.ready = '';
		const track = carousel.querySelector<HTMLElement>('.carousel-track');
		const current = carousel.querySelector<HTMLElement>('[data-current]');
		if (!track) return;

		const count = track.children.length;
		// Slide width, not track width: the track has side padding (see carousel.css).
		const pitch = () => track.children[0].clientWidth;
		const index = () => Math.round(track.scrollLeft / pitch());
		// Track the intended slide so rapid clicks don't read a mid-animation position.
		let target = 0;
		let settle: number | undefined;
		const go = (delta: number) => {
			target = (target + delta + count) % count;
			if (current) current.textContent = String(target + 1);
			track.scrollTo({ left: target * pitch() });
		};

		carousel.querySelector('[data-prev]')?.addEventListener('click', () => go(-1));
		carousel.querySelector('[data-next]')?.addEventListener('click', () => go(1));
		track.addEventListener('keydown', (event) => {
			if (event.key === 'ArrowLeft') {
				event.preventDefault();
				go(-1);
			}
			if (event.key === 'ArrowRight') {
				event.preventDefault();
				go(1);
			}
		});
		// Swipes and trackpad scrolls: resync once scrolling settles.
		track.addEventListener(
			'scroll',
			() => {
				clearTimeout(settle);
				settle = window.setTimeout(() => {
					target = index();
					if (current) current.textContent = String(target + 1);
				}, 120);
			},
			{ passive: true },
		);
	});
}
