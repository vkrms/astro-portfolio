import { describe, expect, it } from 'vitest';
import { isAdminPath, isAdminRequestAllowed } from '../../src/lib/admin-access';

describe('isAdminPath', () => {
	it.each(['/admin', '/admin/edit/post', '/api', '/api/save', '/uploads/a.jpg'])(
		'treats %s as an admin path',
		(pathname) => {
			expect(isAdminPath(pathname)).toBe(true);
		},
	);

	it.each(['/', '/projects', '/projects/a-post', '/apiary'])(
		'leaves %s alone',
		(pathname) => {
			expect(isAdminPath(pathname)).toBe(false);
		},
	);
});

describe('isAdminRequestAllowed', () => {
	it('allows localhost in dev without a flag', () => {
		expect(isAdminRequestAllowed({ hostname: 'localhost', dev: true })).toBe(true);
	});

	it('allows the loopback address in dev', () => {
		expect(isAdminRequestAllowed({ hostname: '127.0.0.1', dev: true })).toBe(true);
		expect(isAdminRequestAllowed({ hostname: '::1', dev: true })).toBe(true);
	});

	it('allows a local production server only with LOCAL_ADMIN=1', () => {
		expect(isAdminRequestAllowed({ hostname: 'localhost', dev: false, envFlag: '1' })).toBe(
			true,
		);
	});

	it('blocks a local production server without the flag', () => {
		expect(isAdminRequestAllowed({ hostname: 'localhost', dev: false })).toBe(false);
		expect(isAdminRequestAllowed({ hostname: 'localhost', dev: false, envFlag: '0' })).toBe(
			false,
		);
	});

	it('blocks a deployed host even when the flag is set', () => {
		expect(
			isAdminRequestAllowed({ hostname: 'portfolio.example.com', dev: false, envFlag: '1' }),
		).toBe(false);
	});
});
