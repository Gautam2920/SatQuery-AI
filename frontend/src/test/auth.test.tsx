import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '@/App';
import { clearStoredSession, readStoredToken } from '@/lib/session';
import { signInForTest } from './session';
import { requestUrl } from './http';

const ACCOUNT = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'analyst@example.com',
  is_verified: true,
  created_at: '2026-01-01T00:00:00Z',
};

const SESSION = {
  access_token: 'issued-token',
  token_type: 'bearer',
  expires_in: 43200,
  user: ACCOUNT,
};

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status < 400,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

beforeEach(() => clearStoredSession());
afterEach(() => vi.unstubAllGlobals());

describe('protected routes', () => {
  it('sends an anonymous visitor to sign in', async () => {
    renderAt('/workspace');

    expect(await screen.findByLabelText('Work email')).toBeInTheDocument();
  });

  it.each(['/library', '/history', '/compare'])('guards %s', async (path) => {
    renderAt(path);

    expect(await screen.findByLabelText('Work email')).toBeInTheDocument();
  });

  it('does not authenticate from a cached account alone', async () => {
    signInForTest();
    // The backend never answers, so the token is never confirmed.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('fetch failed'))),
    );

    renderAt('/workspace');

    expect(await screen.findByLabelText('Work email')).toBeInTheDocument();
    expect(screen.queryByText(/No run yet/)).not.toBeInTheDocument();
  });

  it('discards a token the backend rejects', async () => {
    signInForTest();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => jsonResponse({ detail: 'Not authenticated' }, 401)),
    );

    renderAt('/workspace');

    expect(await screen.findByLabelText('Work email')).toBeInTheDocument();
    expect(readStoredToken()).toBeNull();
  });

  it('lets a signed-in visitor through to the workspace', async () => {
    signInForTest();
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = requestUrl(input);
        if (url.endsWith('/auth/me')) return jsonResponse(ACCOUNT);
        return jsonResponse([]);
      }),
    );

    renderAt('/workspace');

    expect(await screen.findByText(/No run yet/)).toBeInTheDocument();
  });
});

describe('the sign-in page', () => {
  it('does not redirect on a stored token until the backend confirms it', async () => {
    signInForTest();

    let confirmAccount: ((value: Response) => void) | null = null;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            confirmAccount = resolve;
          }),
      ),
    );

    renderAt('/signin');

    expect(await screen.findByText(/Confirming your session/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('Work email')).not.toBeInTheDocument();

    confirmAccount!({
      ok: true,
      status: 200,
      json: () => Promise.resolve(ACCOUNT),
    } as Response);

    expect(await screen.findByText('Scene library')).toBeInTheDocument();
  });

  it('explains where an anonymous visitor was headed', async () => {
    renderAt('/workspace');

    expect(await screen.findByText(/Sign in to continue/i)).toBeInTheDocument();
    expect(screen.getByText('/workspace')).toBeInTheDocument();
  });
});

describe('signing in', () => {
  it('stores the session and continues to the library', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = requestUrl(input);
      if (url.endsWith('/auth/login')) return jsonResponse(SESSION);
      if (url.endsWith('/auth/me')) return jsonResponse(ACCOUNT);
      return jsonResponse([]);
    });
    vi.stubGlobal('fetch', fetchMock);

    renderAt('/signin');

    await user.type(screen.getByLabelText('Work email'), 'analyst@example.com');
    await user.type(screen.getByLabelText('Password'), 'correct-horse-battery');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Scene library')).toBeInTheDocument();
    expect(readStoredToken()).toBe('issued-token');
  });

  it('shows the backend message when the credentials are wrong', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => jsonResponse({ detail: 'Incorrect email or password' }, 401)),
    );

    renderAt('/signin');

    await user.type(screen.getByLabelText('Work email'), 'analyst@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/sign in again|Incorrect/i);
    expect(readStoredToken()).toBeNull();
  });

  it('rejects a malformed email before contacting the backend', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(() => jsonResponse(SESSION));
    vi.stubGlobal('fetch', fetchMock);

    renderAt('/signin');

    await user.type(screen.getByLabelText('Work email'), 'not-an-email');
    await user.type(screen.getByLabelText('Password'), 'correct-horse-battery');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText(/does not look like an email/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('registering', () => {
  it('requires a password of at least eight characters', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(() => jsonResponse(SESSION));
    vi.stubGlobal('fetch', fetchMock);

    renderAt('/signin');

    await user.click(screen.getByRole('tab', { name: 'Register' }));
    await user.type(screen.getByLabelText('Work email'), 'new@example.com');
    await user.type(screen.getByLabelText('Password'), 'short');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('surfaces a duplicate account without storing a session', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        jsonResponse({ detail: 'An account with this email already exists' }, 409),
      ),
    );

    renderAt('/signin');

    await user.click(screen.getByRole('tab', { name: 'Register' }));
    await user.type(screen.getByLabelText('Work email'), 'taken@example.com');
    await user.type(screen.getByLabelText('Password'), 'correct-horse-battery');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/already exists/i);
    expect(readStoredToken()).toBeNull();
  });
});
