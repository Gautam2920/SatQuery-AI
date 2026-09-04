/* The session lives in localStorage so a reload keeps it. Reading it through
   these helpers means one place knows the keys and one place copes with storage
   being unavailable (private windows, blocked site data).

   The account is cached next to the token so a reload can render immediately
   instead of waiting on a round trip; useAuth revalidates it against the backend
   and drops the session if the token turns out to be rejected. */

const TOKEN_STORAGE_KEY = 'satquery.access-token';
const ACCOUNT_STORAGE_KEY = 'satquery.account';

export interface AuthenticatedAccount {
  id: string;
  email: string;
  is_verified: boolean;
  created_at: string;
}

export interface Session {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: AuthenticatedAccount;
}

export function readStoredToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function readStoredAccount(): AuthenticatedAccount | null {
  try {
    const cached = window.localStorage.getItem(ACCOUNT_STORAGE_KEY);

    return cached ? (JSON.parse(cached) as AuthenticatedAccount) : null;
  } catch {
    return null;
  }
}

export function storeSession(token: string, account: AuthenticatedAccount): void {
  try {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    window.localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(account));
  } catch {
    /* the session simply will not survive a reload */
  }
}

export function clearStoredSession(): void {
  try {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(ACCOUNT_STORAGE_KEY);
  } catch {
    /* nothing to clear */
  }
}
