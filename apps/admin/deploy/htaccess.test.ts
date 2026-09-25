import { describe, expect, it } from 'vitest';

import { apiOriginFor, environmentFor, ENVIRONMENTS } from './environments.mjs';
import { contentSecurityPolicy, renderHtaccess } from './htaccess.mjs';

describe('renderHtaccess', () => {
  const file = renderHtaccess({ apiOrigin: 'https://api.quezby.com' });

  it('sends every path that is not a file to the panel, but never a missing asset', () => {
    expect(file).toContain('RewriteRule ^assets/ - [R=404,L]');
    expect(file).toContain('RewriteRule ^ index.html [L]');
    expect(file.indexOf('^assets/')).toBeLessThan(file.indexOf('^ index.html'));
  });

  it('never caches the page and caches the hashed files for good', () => {
    expect(file).toMatch(/<FilesMatch "\\\.html\$">\s+Header set Cache-Control "no-cache"/);
    expect(file).toContain('max-age=31536000, immutable');
  });

  it('keeps the panel out of frames, search engines and referrers', () => {
    expect(file).toContain('X-Frame-Options "DENY"');
    expect(file).toContain('Referrer-Policy "no-referrer"');
    expect(file).toContain('X-Robots-Tag "noindex, nofollow"');
    expect(file).toContain('Options -Indexes');
  });

  it('lets the panel talk to its own API and nothing else', () => {
    expect(file).toContain("connect-src 'self' https://api.quezby.com;");
  });
});

describe('contentSecurityPolicy', () => {
  it('runs only the panel\'s own scripts', () => {
    const policy = contentSecurityPolicy({ apiOrigin: 'https://staging-api.quezby.com' });

    expect(policy).toContain("script-src 'self';");
    expect(policy).not.toMatch(/script-src[^;]*unsafe/);
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
  });

  it('talks to its own origin only when the API sits behind the dev proxy', () => {
    expect(contentSecurityPolicy({ apiOrigin: '' })).toContain("connect-src 'self';");
  });
});

describe('environments', () => {
  it('builds for staging and production by mode, and everything else is local', () => {
    expect(environmentFor('staging')).toBe('staging');
    expect(environmentFor('production')).toBe('production');
    expect(environmentFor('development')).toBe('local');
    expect(environmentFor('test')).toBe('local');
  });

  it('points each environment at its API', () => {
    expect(apiOriginFor('production')).toBe('https://api.quezby.com');
    expect(apiOriginFor('staging')).toBe('https://staging-api.quezby.com');
    expect(apiOriginFor('development')).toBe('');
  });

  it('lets VITE_API_ORIGIN point a panel elsewhere', () => {
    expect(apiOriginFor('development', { VITE_API_ORIGIN: 'https://staging-api.quezby.com/' })).toBe(
      'https://staging-api.quezby.com',
    );
    expect(apiOriginFor('production', { VITE_API_ORIGIN: '  ' })).toBe(ENVIRONMENTS.production.apiOrigin);
  });
});
