/**
 * Client-side tag filter for the static /projects page. A prerendered page
 * cannot read ?tag= on the server, so the cards carry their tags and this
 * script hides the ones that do not match. No framework, no network.
 */
function currentTag(): string {
	return new URLSearchParams(window.location.search).get('tag') ?? '';
}

function applyTag(tag: string) {
	document.querySelectorAll<HTMLElement>('[data-project-card]').forEach((card) => {
		const tags = (card.dataset.tags ?? '').split(' ').filter(Boolean);
		card.hidden = tag !== '' && !tags.includes(tag);
	});

	document.querySelectorAll<HTMLElement>('[data-tag-filter]').forEach((button) => {
		button.setAttribute('aria-pressed', String((button.dataset.tagFilter ?? '') === tag));
	});

	const empty = document.querySelector<HTMLElement>('[data-tag-empty]');
	if (empty) {
		empty.hidden = Array.from(
			document.querySelectorAll<HTMLElement>('[data-project-card]'),
		).some((card) => !card.hidden);
	}
}

const flags = window as Window & { __tagFilterBound?: boolean };

if (!flags.__tagFilterBound) {
	flags.__tagFilterBound = true;

	document.addEventListener('click', (event) => {
		const button = (event.target as Element).closest<HTMLElement>('[data-tag-filter]');
		if (!button) return;

		const tag = button.dataset.tagFilter ?? '';
		applyTag(tag);

		const url = new URL(window.location.href);
		if (tag) url.searchParams.set('tag', tag);
		else url.searchParams.delete('tag');
		window.history.replaceState({}, '', url);
	});

	document.addEventListener('astro:page-load', () => applyTag(currentTag()));
}

applyTag(currentTag());
