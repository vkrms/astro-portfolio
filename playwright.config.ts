import { defineConfig, devices } from '@playwright/test';

// Manual dev runs on 1892. Tests start their own server on 1893 with an
// isolated content directory, so they never touch 1892 or src/content/projects.
export default defineConfig({
	testDir: './tests',
	testMatch: '**/*.spec.ts',
	fullyParallel: false,
	workers: 1,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? 'github' : 'list',
	use: {
		baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:1893',
		trace: 'on-first-retry',
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	// Set E2E_BASE_URL to use an already running server and skip the one below.
	webServer: process.env.E2E_BASE_URL
		? undefined
		: {
				command: 'npm run dev -- --port 1893',
				url: 'http://localhost:1893',
				reuseExistingServer: !process.env.CI,
				timeout: 120_000,
				env: {
					// Tests reset these directories before each test.
					PROJECTS_DIR: 'tmp/e2e-projects',
					UPLOADS_DIR: 'tmp/e2e-uploads',
					SETTINGS_DIR: 'tmp/e2e-settings',
					// Keep canonical and OG URLs on the test server.
					SITE_URL: 'http://localhost:1893',
				},
			},
});
