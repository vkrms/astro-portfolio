// Dev-only hook for code-inspector-plugin. The Vite plugin appends its client
// to this module's output, which Astro's .astro pipeline does not do on its
// own. Production builds drop the import in Base.astro, so this file emits
// nothing.
export {};
