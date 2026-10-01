import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig, loadEnv, type Plugin } from 'vite';

import { adminBaseFor, apiOriginFor } from './deploy/environments.mjs';
import { renderHtaccess } from './deploy/htaccess.mjs';

/**
 * The admin panel: a static single-page app for shared hosting.
 *
 * - `pnpm dev:admin` serves it on :5180 and proxies `/api` to the Laravel dev
 *   server on :8000, so the panel and the API share an origin locally.
 * - `vite build` builds for production (served at quezby.com/panel/),
 *   `vite build --mode staging` for staging (`deploy/environments.mjs`);
 *   `scripts/package-admin.mjs` zips it.
 */

/** Writes the panel's `.htaccess` next to `index.html`, naming the API in its CSP and the folder it sits in. */
function htaccess(apiOrigin: string, base: string): Plugin {
  return {
    name: 'quezby-admin-htaccess',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: '.htaccess', source: renderHtaccess({ apiOrigin, base }) });
    },
  };
}

export default defineConfig(({ mode }) => {
  const here = import.meta.dirname;
  const apiOrigin = apiOriginFor(mode, loadEnv(mode, here, 'VITE_'));
  const base = adminBaseFor(mode);
  const server = {
    port: 5180,
    // A taken port is an error, not a quiet move to the next one.
    strictPort: true,
    proxy: { '/api': { target: 'http://localhost:8000', changeOrigin: true } },
  };

  return {
    base,
    plugins: [react(), tailwindcss(), htaccess(apiOrigin, base)],
    resolve: { alias: { '@': path.resolve(here, 'src') } },
    // The release scripts/deploy.mjs gives this build; empty when built by hand.
    define: { __API_ORIGIN__: JSON.stringify(apiOrigin), __PANEL_VERSION__: JSON.stringify(process.env.QUEZBY_RELEASE ?? '') },
    server,
    preview: server,
    build: { outDir: 'dist', emptyOutDir: true },
  };
});
