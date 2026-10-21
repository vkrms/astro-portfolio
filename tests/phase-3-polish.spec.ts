import { test } from '@playwright/test';

test.describe('phase 3 - polish', () => {
	test.fixme('tag filter, RSS, view transitions, lightbox, per-project OG and autosave work', async ({ page }) => {
		await page.goto('/');
	});

	test.fixme('axe reports no serious or critical issues', async () => {
		// Add @axe-core/playwright when this test is enabled.
	});

	test.fixme('LCP is within budget on a throttled mobile profile', async () => {
		// Measure with a PerformanceObserver or Lighthouse CI.
	});
});
