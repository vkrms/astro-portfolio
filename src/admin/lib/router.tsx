/**
 * Minimal stand-in for the parts of @tanstack/react-router that the
 * shadcn-admin code uses. Astro owns routing: a path change is a full page
 * load; a search-only change updates the URL in place.
 *
 * Search values follow TanStack's format: strings are stored as-is, other
 * values as JSON (`?page=2&status=["todo"]`).
 */
import {
	createContext,
	useContext,
	useMemo,
	useSyncExternalStore,
	type AnchorHTMLAttributes,
} from 'react';
import type { z } from 'zod';

type SearchRecord = Record<string, unknown>;
type SearchUpdate = true | SearchRecord | ((prev: SearchRecord) => SearchRecord);

export type NavigateOptions = {
	to?: string;
	search?: SearchUpdate;
	replace?: boolean;
};

export type LinkProps = { to?: string };

const CHANGE_EVENT = 'admin:locationchange';

/** The request URL (path + search), used while rendering on the server. */
const ServerHrefContext = createContext('/');
export const LocationProvider = ServerHrefContext.Provider;

function subscribe(onChange: () => void) {
	window.addEventListener('popstate', onChange);
	window.addEventListener(CHANGE_EVENT, onChange);
	return () => {
		window.removeEventListener('popstate', onChange);
		window.removeEventListener(CHANGE_EVENT, onChange);
	};
}

function useHref() {
	const serverHref = useContext(ServerHrefContext);
	return useSyncExternalStore(
		subscribe,
		() => window.location.pathname + window.location.search,
		() => serverHref,
	);
}

export function parseSearch(search: string): SearchRecord {
	const result: SearchRecord = {};
	for (const [key, value] of new URLSearchParams(search)) {
		try {
			result[key] = JSON.parse(value);
		} catch {
			result[key] = value;
		}
	}
	return result;
}

export function stringifySearch(search: SearchRecord): string {
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(search)) {
		if (value === undefined || value === null) continue;
		params.set(key, typeof value === 'string' ? value : JSON.stringify(value));
	}
	const query = params.toString();
	return query ? `?${query}` : '';
}

export function navigate({ to, search, replace }: NavigateOptions) {
	const current = parseSearch(window.location.search);
	const next =
		typeof search === 'function' ? search(current) : search === true ? current : (search ?? {});
	const path = to ?? window.location.pathname;
	const url = path + stringifySearch(next);

	if (path !== window.location.pathname) {
		window.location.assign(url);
		return;
	}
	window.history[replace ? 'replaceState' : 'pushState'](null, '', url);
	window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useNavigate() {
	return navigate;
}

type Location = { href: string; pathname: string; search: string };

export function useLocation(): Location;
export function useLocation<T>(opts: { select: (location: Location) => T }): T;
export function useLocation<T>(opts?: { select: (location: Location) => T }) {
	const href = useHref();
	const [pathname, query = ''] = href.split('?');
	const location = { href, pathname, search: query ? `?${query}` : '' };
	return opts ? opts.select(location) : location;
}

export function useSearch(): SearchRecord {
	const { search } = useLocation();
	return useMemo(() => parseSearch(search), [search]);
}

/**
 * The route id is ignored: each page has one route. Pass the route's search
 * schema (TanStack's `validateSearch`) to get typed, validated search params.
 */
export function getRouteApi<T extends z.ZodType>(_id: string, schema?: T) {
	return {
		useSearch: (): z.infer<T> => {
			const search = useSearch();
			return useMemo(
				() => (schema ? schema.parse(search) : (search as z.infer<T>)),
				[search],
			);
		},
		useNavigate,
	};
}

type AnchorProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> &
	LinkProps & { disabled?: boolean };

export function Link({ to, disabled, ...props }: AnchorProps) {
	return <a href={disabled ? undefined : to} aria-disabled={disabled || undefined} {...props} />;
}
