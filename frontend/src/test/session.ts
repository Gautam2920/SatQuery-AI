import { storeSession } from '@/lib/session';

/** Put a signed-in session in storage so guarded routes render.
 *  The token is never validated locally — the backend is the authority — so any
 *  non-empty string stands in for one in a component test. */
export function signInForTest(email = 'analyst@example.com'): void {
  storeSession('test-access-token', {
    id: '00000000-0000-0000-0000-000000000001',
    email,
    is_verified: true,
    created_at: '2026-01-01T00:00:00Z',
  });
}
