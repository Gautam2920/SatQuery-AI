import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ApiError,
  UnauthorizedError,
  fetchCurrentAccount,
  login as requestLogin,
  register as requestRegister,
} from '@/lib/api';
import {
  clearStoredSession,
  readStoredAccount,
  readStoredToken,
  storeSession,
  type AuthenticatedAccount,
} from '@/lib/session';

type AuthStatus = 'restoring' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  status: AuthStatus;
  account: AuthenticatedAccount | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/* A stored token is a claim, not a session. The cached account is restored only
   so the app can paint the signed-in chrome the instant the backend confirms the
   token; it never decides whether the visitor is authenticated. */
function restoreCachedSession(): { status: AuthStatus; account: AuthenticatedAccount | null } {
  const token = readStoredToken();

  if (!token) return { status: 'anonymous', account: null };

  return { status: 'restoring', account: readStoredAccount() };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [restored] = useState(restoreCachedSession);
  const [account, setAccount] = useState(restored.account);
  const [status, setStatus] = useState<AuthStatus>(restored.status);

  const signOut = useCallback(() => {
    // The token is stateless, so signing out is discarding it.
    clearStoredSession();
    setAccount(null);
    setStatus('anonymous');
  }, []);

  // A stored token may have been revoked or expired while the tab was closed, so
  // the session is only granted once the backend confirms it. A rejected token is
  // discarded; an unreachable backend leaves the token in place so the session
  // returns when the backend does, but access is still withheld until then.
  useEffect(() => {
    if (status === 'anonymous') return;

    let cancelled = false;

    fetchCurrentAccount()
      .then((confirmed) => {
        if (cancelled) return;

        const token = readStoredToken();
        if (token) storeSession(token, confirmed);

        setAccount(confirmed);
        setStatus('authenticated');
      })
      .catch((cause) => {
        if (cancelled) return;

        if (cause instanceof UnauthorizedError) {
          signOut();
          return;
        }

        setAccount(null);
        setStatus('anonymous');
      });

    return () => {
      cancelled = true;
    };
    // Runs once on mount: revalidation is about the token the app booted with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startSession = useCallback(
    async (request: () => ReturnType<typeof requestLogin>) => {
      const session = await request();

      storeSession(session.access_token, session.user);
      setAccount(session.user);
      setStatus('authenticated');
    },
    [],
  );

  const signIn = useCallback(
    (email: string, password: string) => startSession(() => requestLogin(email, password)),
    [startSession],
  );

  const signUp = useCallback(
    (email: string, password: string) => startSession(() => requestRegister(email, password)),
    [startSession],
  );

  const value = useMemo(
    () => ({ status, account, signIn, signUp, signOut }),
    [status, account, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) throw new Error('useAuth must be used inside an AuthProvider');

  return context;
}

export function describeAuthError(cause: unknown): string {
  if (cause instanceof ApiError) return cause.message;

  return cause instanceof Error ? cause.message : String(cause);
}
