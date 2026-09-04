import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { RegistrationMark } from '@/components/ui/RegistrationMark';
import { TextInput } from '@/components/ui/TextInput';
import { describeAuthError, useAuth } from '@/hooks/useAuth';

const PASSWORD_MIN_LENGTH = 8;

type AuthMode = 'signin' | 'register';

interface FieldErrors {
  email?: string;
  password?: string;
}

/** Mirrors the backend's own rules so the obvious mistakes are caught without a
 *  round trip. The backend remains the authority. */
function validate(email: string, password: string, mode: AuthMode): FieldErrors {
  const errors: FieldErrors = {};

  if (!email.trim()) errors.email = 'Enter your email address.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    errors.email = 'That does not look like an email address.';

  if (!password) errors.password = 'Enter your password.';
  else if (mode === 'register' && password.length < PASSWORD_MIN_LENGTH)
    errors.password = `Use at least ${PASSWORD_MIN_LENGTH} characters.`;

  return errors;
}

export function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { status, signIn, signUp } = useAuth();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/library';

  useEffect(() => {
    if (status === 'authenticated') navigate(redirectTo, { replace: true });
  }, [status, navigate, redirectTo]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const errors = validate(email, password, mode);
    setFieldErrors(errors);
    setSubmitError(null);

    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);

    try {
      if (mode === 'register') await signUp(email.trim(), password);
      else await signIn(email.trim(), password);

      navigate(redirectTo, { replace: true });
    } catch (cause) {
      setSubmitError(describeAuthError(cause));
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setFieldErrors({});
    setSubmitError(null);
  };

  return (
    <div className="gt-landing grid min-h-full grid-cols-2 bg-neutral text-on-surface max-[760px]:grid-cols-1">
      <div className="flex flex-col items-start gap-lg border-r border-border p-[40px_32px] max-[760px]:border-b max-[760px]:border-r-0">
        <Link to="/" className="flex items-center gap-[10px]">
          <RegistrationMark size={18} color="var(--primary-ink)" />
          <span className="label-caps text-primary-ink">SatQuery AI</span>
        </Link>

        <h1 className="headline-md">{mode === 'signin' ? 'Sign in' : 'Create an account'}</h1>

        <div
          role="tablist"
          aria-label="Authentication mode"
          className="flex w-[320px] max-w-full gap-0 rounded-control border border-border p-[2px]"
        >
          {(['signin', 'register'] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              aria-selected={mode === option}
              onClick={() => switchMode(option)}
              className={`label-caps flex-1 rounded-control py-[7px] transition-colors duration-[var(--dur-state)] ${
                mode === option
                  ? 'bg-surface-raised text-primary-ink'
                  : 'text-secondary hover:text-primary-ink'
              }`}
            >
              {option === 'signin' ? 'Sign in' : 'Register'}
            </button>
          ))}
        </div>

        <form className="flex w-[320px] max-w-full flex-col gap-md" onSubmit={handleSubmit} noValidate>
          <TextInput
            label="Work email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@org.example"
            autoComplete="username"
            error={fieldErrors.email}
          />
          <TextInput
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            error={fieldErrors.password}
            hint={
              mode === 'register' && !fieldErrors.password
                ? `At least ${PASSWORD_MIN_LENGTH} characters.`
                : undefined
            }
          />

          {submitError && (
            <div
              role="alert"
              className="body-sm flex items-start gap-xs border border-tertiary bg-[var(--tertiary-subtle)] p-sm text-tertiary-strong"
            >
              <Icon name="alert" size={13} />
              <span>{submitError}</span>
            </div>
          )}

          <Button type="submit" full disabled={submitting}>
            {submitting
              ? mode === 'signin'
                ? 'Signing in…'
                : 'Creating account…'
              : mode === 'signin'
                ? 'Sign in'
                : 'Create account'}
          </Button>
        </form>

        <span className="body-sm text-secondary">
          {mode === 'signin' ? (
            <>
              No account yet?{' '}
              <button
                type="button"
                onClick={() => switchMode('register')}
                className="text-primary-ink underline"
              >
                Register
              </button>
            </>
          ) : (
            <>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="text-primary-ink underline"
              >
                Sign in
              </button>
            </>
          )}
        </span>
      </div>

      <div className="flex flex-col items-start gap-lg p-[40px_32px]">
        <span className="label-caps text-secondary">What an account gives you</span>
        <p className="body-md max-w-[46ch]">
          Scenes you upload and every run you execute belong to your account alone. Areas,
          coordinates and confidence are measured from the raster, never authored.
        </p>
        <p className="body-sm max-w-[52ch] text-secondary">
          Every export carries the signing user and the run id. Prototype build — not for
          operational decisions.
        </p>
      </div>
    </div>
  );
}
