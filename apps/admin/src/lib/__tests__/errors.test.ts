import { ApiError } from '@quezby/sdk/admin';
import { describe, expect, it } from 'vitest';

import { errorMessage, fieldErrors, isApiError } from '@/lib/errors';

describe('errorMessage', () => {
  it('shows the API\'s own Turkish message', () => {
    expect(errorMessage(new ApiError(403, 'forbidden', 'Bu işlem için yetkin yok.'))).toBe('Bu işlem için yetkin yok.');
  });

  it('says the network is down or slow in the panel\'s words', () => {
    expect(errorMessage(new ApiError(0, 'network', 'The API could not be reached.'))).toBe('Sunucuya ulaşılamadı. Bağlantını kontrol et.');
    expect(errorMessage(new ApiError(0, 'timeout', 'The request timed out.'))).toBe('Sunucu zamanında yanıt vermedi, tekrar dene.');
  });

  it('never shows an English fallback from a bare 5xx', () => {
    expect(errorMessage(new ApiError(502, 'server_error', 'The API answered 502.'), 'Liste yüklenemedi.')).toBe('Liste yüklenemedi.');
    expect(errorMessage(new Error('boom'), 'Liste yüklenemedi.')).toBe('Liste yüklenemedi.');
  });
});

describe('fieldErrors', () => {
  it('takes each field\'s first message', () => {
    const error = new ApiError(422, 'validation_failed', 'x', { password: ['Kısa.', 'Aynı.'], name: [] });
    expect(fieldErrors(error)).toEqual({ password: 'Kısa.' });
    expect(fieldErrors(new ApiError(422, 'invalid_credentials', 'x'))).toEqual({});
  });

  it('tells codes apart', () => {
    expect(isApiError(new ApiError(429, 'too_many_requests', 'x'), 'too_many_requests')).toBe(true);
    expect(isApiError(new Error('x'), 'too_many_requests')).toBe(false);
  });
});
