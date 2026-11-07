/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

// Node environment only: Astro components cannot render in jsdom.
export default getViteConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
  },
});
