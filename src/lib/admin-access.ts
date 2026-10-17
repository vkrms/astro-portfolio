/**
 * Admin routes are local tools, not part of the deployed site. They work on
 * localhost in dev, or on a locally-run build when LOCAL_ADMIN=1. The host
 * check applies even when the flag is set, so a deploy that leaks the flag
 * still cannot accept writes.
 */

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

const ADMIN_PREFIXES = ['/admin', '/api', '/uploads'];

export interface AdminAccessInput {
	hostname: string;
	dev: boolean;
	envFlag?: string;
}

export function isAdminRequestAllowed({ hostname, dev, envFlag }: AdminAccessInput): boolean {
	if (!LOCAL_HOSTS.has(hostname)) return false;
	return dev || envFlag === '1';
}

export function isAdminPath(pathname: string): boolean {
	return ADMIN_PREFIXES.some(
		(prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
	);
}
