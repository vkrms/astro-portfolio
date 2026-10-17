import { defineMiddleware } from 'astro:middleware';
import { isAdminPath, isAdminRequestAllowed } from './lib/admin-access';

/**
 * The admin and its APIs only exist on localhost. Deployed builds serve the
 * prerendered public site; admin paths return 404 instead of exposing a write
 * surface over an ephemeral filesystem.
 */
export const onRequest = defineMiddleware((context, next) => {
	if (!isAdminPath(context.url.pathname)) return next();

	const allowed = isAdminRequestAllowed({
		hostname: context.url.hostname,
		dev: import.meta.env.DEV,
		envFlag: process.env.LOCAL_ADMIN,
	});

	return allowed ? next() : new Response('Not Found', { status: 404 });
});
