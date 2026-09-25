import { ApiError } from '@quezby/sdk/admin';

/**
 * What to tell an admin when a call fails. The API's own messages are
 * Turkish and safe to show; the network and the clock get the panel's.
 */
export function errorMessage(error: unknown, fallback = 'Bir şeyler ters gitti, birazdan tekrar dene.'): string {
  if (error instanceof ApiError) {
    if (error.code === 'network') return 'Sunucuya ulaşılamadı. Bağlantını kontrol et.';
    if (error.code === 'timeout') return 'Sunucu zamanında yanıt vermedi, tekrar dene.';
    if (error.code === 'server_error') return error.message.startsWith('The API') ? fallback : error.message;
    return error.message || fallback;
  }
  return fallback;
}

/** The first message the API gave for each field of a form, for the fields to show. */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || error.code !== 'validation_failed') return {};
  return Object.fromEntries(
    Object.entries(error.fields).flatMap(([field, messages]) => (messages[0] ? [[field, messages[0]]] : [])),
  );
}

export function isApiError(error: unknown, code: ApiError['code']): boolean {
  return error instanceof ApiError && error.code === code;
}
