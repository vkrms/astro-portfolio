import { defineConfig, devices } from '@playwright/test';

// Phase 0b runs against `astro dev`, where login is skipped.
// Phase 1 auth tests need a production-mode server. Set E2E_BASE_URL and start
// that server yourself when those tests are enabled.
export default defineConfig({
	testDir: './tests',
	testMatch: '**/*.spec.ts',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: process.env.CI ? 'github' : 'list',
	use: {
		baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:4321',
		trace: 'on-first-retry',
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	// Do not start a server when an external one is provided.
	webServer: process.env.E2E_BASE_URL
		? undefined
		: {
				command: 'npm run dev',
				url: 'http://localhost:4321',
				reuseExistingServer: !process.env.CI,
				timeout: 120_000,
				env: {
					// Keep tests independent of the repo's real content.
					PROJECTS_DIR: 'tests/fixtures/projects-empty',
				},
			},
});
