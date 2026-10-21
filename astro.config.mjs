// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import icon from 'astro-icon';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { codeInspectorPlugin } from 'code-inspector-plugin';
import { resolve } from 'node:path';

// Host-neutral: every content page prerenders to static HTML, and the admin
// routes (/admin, /api) run on demand, served by whichever host built the
// site. Each platform sets its own build env var automatically — nothing to
// configure — and any other host falls back to a portable Node server. Set
// DEPLOY_ADAPTER to force a specific adapter when no env var applies.
async function getAdapter() {
	const vercel = async () => (await import('@astrojs/vercel')).default();
	const cloudflare = async () => (await import('@astrojs/cloudflare')).default();
	const netlify = async () => (await import('@astrojs/netlify')).default();
	const nodeStandalone = async () =>
		(await import('@astrojs/node')).default({ mode: 'standalone' });

	switch (process.env.DEPLOY_ADAPTER) {
		case 'vercel': return vercel();
		case 'cloudflare': return cloudflare();
		case 'netlify': return netlify();
		case 'node': return nodeStandalone();
		case undefined: break; // no override -> auto-detect below
		default:
			console.warn(`[astro.config] Unknown DEPLOY_ADAPTER "${process.env.DEPLOY_ADAPTER}" - ignoring and auto-detecting.`);
	}
	if (process.env.VERCEL) return vercel();
	// CF_PAGES = Cloudflare Pages CI; WORKERS_CI = Cloudflare Workers Builds CI.
	if (process.env.WORKERS_CI || process.env.CF_PAGES) return cloudflare();
	if (process.env.NETLIFY) return netlify();

	return nodeStandalone();
}

// Prefer an explicit SITE_URL; otherwise use the URL the platform injects so
// zero-config deploys still emit absolute URLs (sitemap, RSS, OpenGraph).
// Cloudflare Workers exposes no such var — set SITE_URL there for correct
// canonicals. Local builds fall back to localhost.
function getSiteUrl() {
	if (process.env.SITE_URL) return process.env.SITE_URL;
	if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
	if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
	if (process.env.CF_PAGES_URL) return process.env.CF_PAGES_URL;
	if (process.env.NETLIFY && process.env.URL) return process.env.URL;

	return 'http://localhost:1892';
}

// Astro caches getStaticPaths per route and only clears that cache for its own
// content collections. Project JSON lives outside them, so a post created in
// /admin would otherwise 404 until the dev server restarts.
function projectContentRefresh() {
	const dir = resolve(process.env.PROJECTS_DIR ?? 'src/content/projects');

	/** @type {import('vite').Plugin} */
	const plugin = {
		name: 'project-content-refresh',
		apply: 'serve',
		/** @param {import('vite').ViteDevServer} server */
		configureServer(server) {
			server.watcher.add(dir);
			/** @param {string} file */
			const isProjectFile = (file) => file.startsWith(`${dir}/`) && file.endsWith('.json');
			/** @param {string} file */
			const refresh = (file) => {
				if (!isProjectFile(file)) return;
				server.environments.ssr.hot.send('astro:content-changed', {});
			};

			server.watcher.on('add', refresh);
			server.watcher.on('change', refresh);
			server.watcher.on('unlink', refresh);
		},
	};

	return plugin;
}

// https://astro.build/config
export default defineConfig({
	site: getSiteUrl(),
	output: 'static',
	adapter: await getAdapter(),
	server: { port: 1892 },
	// The project list lives on the home page; keep old /projects links working.
	redirects: { '/home': '/', '/projects': '/' },
	integrations: [
		mdx(),
		// The admin is local-only. Never advertise it (or its APIs/uploads) in
		// the generated sitemap.
		sitemap({
			filter: (page) => {
				const path = new URL(page).pathname;
				return !/^\/(admin|api|uploads)(\/|$)/.test(path) && !['/home', '/home/', '/projects', '/projects/'].includes(path);
			},
		}),
		icon(),
		react(),
	],
	build: {
		// Inline the (~10 KiB) bundled CSS into a <style> in <head> instead of a
		// separate render-blocking <link>. Astro's default ('auto') only inlines
		// stylesheets under ~4 KiB, leaving ours blocking first paint on mobile.
		inlineStylesheets: 'always',
	},
	image: {
		// Astro 6 responsive images: auto-emit srcset so the browser picks a
		// variant matched to the rendered box + DPR, not the full intrinsic size.
		layout: 'constrained',
	},
	vite: {
		// Each dev server needs its own dependency cache. Servers that share
		// node_modules/.vite overwrite each other's optimized deps, and the
		// older one then fails with "504 Outdated Optimize Dep" and React hook
		// errors. The e2e server sets this to stay clear of `npm run dev`.
		cacheDir: process.env.VITE_CACHE_DIR,
		plugins: [
			tailwindcss(),
			projectContentRefresh(),
			// Dev only: Option + Shift + click a DOM node to open its source in Zed.
			// Astro compiles <script> tags into `.astro?astro&type=script` modules,
			// which the plugin does not treat as JS. injectTo forces the client into
			// the dedicated module that DevInspector imports in dev.
			codeInspectorPlugin({
				bundler: 'vite',
				editor: 'zed',
				injectTo: resolve('src/scripts/inspector.ts'),
			}),
		],
		server: {
			watch: {
				// The admin writes uploads at runtime. Watching them invalidates
				// CmsImage's eager asset glob and forces a full page reload, which
				// discards unsaved editor state. Dev serves new files through
				// /uploads instead; the build still picks them up from disk.
				ignored: ['**/src/assets/uploads/**'],
			},
		},
	}
});
