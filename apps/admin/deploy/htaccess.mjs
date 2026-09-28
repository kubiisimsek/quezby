/**
 * The admin panel's `.htaccess`, written next to `index.html` at build time
 * (see `vite.config.ts`). Apache on shared hosting serves the panel as plain
 * files; this makes it an app:
 *
 * - every path that is not a file is a page of the panel (`index.html`),
 *   except under `assets/`, where a missing file is a 404 — never HTML
 *   parsed as JavaScript after a deploy;
 * - `index.html` is never cached and the hashed assets are cached for good;
 * - the Content-Security-Policy lets scripts come only from the panel itself,
 *   requests go only to the panel and the API it was built for, and images
 *   only from the panel and that API — players' profile photos are served
 *   by it (`/api/v1/media/avatars/…`).
 *
 * Styles allow 'unsafe-inline': Radix and Sonner insert small `<style>` tags.
 */

/**
 * @param {{ apiOrigin: string }} options
 * @returns {string}
 */
export function contentSecurityPolicy({ apiOrigin }) {
  const connect = ["'self'", apiOrigin].filter(Boolean).join(' ');
  const img = ["'self'", 'data:', apiOrigin].filter(Boolean).join(' ');

  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    `img-src ${img}`,
    "font-src 'self'",
    `connect-src ${connect}`,
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');
}

/**
 * @param {{ apiOrigin: string }} options
 * @returns {string}
 */
export function renderHtaccess({ apiOrigin }) {
  return `# Quezby admin panel — written by apps/admin/deploy/htaccess.mjs at build time.
# Edit that file, not this one.

Options -Indexes
DirectoryIndex index.html

<IfModule mod_rewrite.c>
  RewriteEngine On

  # Files and folders that exist are served as they are.
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # A missing asset is a 404, never the panel's HTML.
  RewriteRule ^assets/ - [R=404,L]

  # Every other path is a page of the panel.
  RewriteRule ^ index.html [L]
</IfModule>

<IfModule mod_headers.c>
  Header always set Content-Security-Policy "${contentSecurityPolicy({ apiOrigin })}"
  Header always set X-Frame-Options "DENY"
  Header always set X-Content-Type-Options "nosniff"
  Header always set Referrer-Policy "no-referrer"
  Header always set Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()"
  Header always set Strict-Transport-Security "max-age=31536000"
  Header always set X-Robots-Tag "noindex, nofollow"

  # The page is always asked for again, so a deploy is seen at once…
  <FilesMatch "\\.html$">
    Header set Cache-Control "no-cache"
  </FilesMatch>

  # …and the files it names change their name when they change.
  <FilesMatch "-[A-Za-z0-9_-]{8,}\\.(js|css|woff2?|svg)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
</IfModule>
`;
}
