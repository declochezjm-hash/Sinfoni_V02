import { getErrorMessage } from './formatApiError';

/** Extrait le code HTTP PostgREST / Supabase si présent sur l'erreur. */
export function getSupabaseHttpStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;
  const obj = error as Record<string, unknown>;
  if (typeof obj.status === 'number') return obj.status;
  if (typeof obj.statusCode === 'number') return obj.statusCode;
  return null;
}

export function logSupabaseError(
  context: string,
  error: unknown,
  status?: number | null,
): void {
  const httpStatus = status ?? getSupabaseHttpStatus(error);
  const payload = {
    context,
    httpStatus,
    message: getErrorMessage(error),
    error,
  };

  if (httpStatus === 401 || httpStatus === 403) {
    console.error(`[Supabase] ${httpStatus} ${context}`, payload);
  } else {
    console.error(`[Supabase] ${context}`, payload);
  }
}

export function isAuthHttpStatus(status: number | null): boolean {
  return status === 401 || status === 403;
}
