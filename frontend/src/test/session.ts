import { vi } from 'vitest';
import { storeSession, type AuthenticatedAccount } from '@/lib/session';
import { requestUrl } from './http';

export const TEST_ACCOUNT: AuthenticatedAccount = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'analyst@example.com',
  is_verified: true,
  created_at: '2026-01-01T00:00:00Z',
};

/** Put a token and a cached account in storage. This alone does not authenticate
 *  anyone — the backend still has to confirm the token — so a test that needs a
 *  guarded page rendered also needs /auth/me answered. */
export function signInForTest(email = TEST_ACCOUNT.email): void {
  storeSession('test-access-token', { ...TEST_ACCOUNT, email });
}

export function accountResponse(email = TEST_ACCOUNT.email): Promise<Response> {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ ...TEST_ACCOUNT, email }),
  } as Response);
}

/** A backend that confirms the session and serves nothing else, so guarded pages
 *  render their signed-in shell in the backend-unavailable state. */
export function stubSessionOnlyBackend(email = TEST_ACCOUNT.email): void {
  signInForTest(email);

  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      if (requestUrl(input).endsWith('/auth/me')) return accountResponse(email);

      return Promise.reject(new TypeError('fetch failed'));
    }),
  );
}
