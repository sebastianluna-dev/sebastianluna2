# Improvements

## Dependencies

- **`npm audit` reports 3 high and 3 moderate advisories** (priority: low). All come from build-time dependencies of `@astrojs/vercel@11.0.20` (`@vercel/routing-utils` → `path-to-regexp`, `@vercel/nft` → `glob`, `minimatch`); nothing reaches the browser or the chat function. The suggested `npm audit fix --force` downgrades the adapter to 8.x, which does not support Astro 7. Approach: update the adapter when a release bumps those packages.
