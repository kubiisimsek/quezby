import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  define: { __API_ORIGIN__: JSON.stringify(''), __PANEL_VERSION__: JSON.stringify('1.00.00.04') },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'deploy/**/*.test.ts'],
    setupFiles: ['./src/test/setup.ts'],
    // A page's first test pays for its lazy chunk; beside the app's Jest in
    // `pnpm test` that can take longer than the default five seconds.
    testTimeout: 15_000,
    server: {
      deps: {
        // The workspace packages are linked builds, not published deps: let
        // Vite transform them the way the app does, rather than handing their
        // ESM output to Node's loader, which does not resolve an extensionless
        // relative import.
        inline: [/packages\/(sdk|config|types)\/dist/],
      },
    },
  },
});
