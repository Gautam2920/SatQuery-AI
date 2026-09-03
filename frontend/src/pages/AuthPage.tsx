import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { RegistrationMark } from '@/components/ui/RegistrationMark';
import { TextInput } from '@/components/ui/TextInput';
import { PrototypeBadge } from '@/components/common/PrototypeBadge';

const WORKSPACES = [
  { name: 'Delta Flood Program', meta: '14 scenes · 62 runs · analyst', selected: true },
  { name: 'Crop Insurance — EU', meta: '8 scenes · 21 runs · viewer', selected: false },
];

/* Wireframe 1b — sign in, SSO, workspace/org pick. Mock form: no backend, no
   data is submitted. Role determines whether a run can be re-executed or only
   read; every export carries the signing user and the run id. */
export function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="gt-landing grid min-h-full grid-cols-2 bg-neutral text-on-surface max-[760px]:grid-cols-1">
      <div className="flex flex-col items-start gap-lg border-r border-border p-[40px_32px] max-[760px]:border-b max-[760px]:border-r-0">
        <span className="flex items-center gap-[10px]">
          <RegistrationMark size={18} color="var(--primary-ink)" />
          <span className="label-caps text-primary-ink">SatQuery AI</span>
        </span>
        <h1 className="headline-md">Sign in</h1>

        <form
          className="flex w-[320px] max-w-full flex-col gap-md"
          onSubmit={(e) => {
            e.preventDefault();
            navigate('/library');
          }}
        >
          <TextInput
            label="Work email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@org.example"
            autoComplete="username"
          />
          <TextInput
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
          />
          <Button type="submit" full>
            Sign in
          </Button>
        </form>

        <div className="flex w-[320px] max-w-full items-center gap-[10px] py-xs">
          <span className="h-px flex-1 bg-border" />
          <span className="data-sm text-secondary">or</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <button
          type="button"
          onClick={() => navigate('/library')}
          className="label-caps flex h-[38px] w-[320px] max-w-full items-center rounded-control border border-border px-md text-on-surface transition-colors duration-[var(--dur-state)] hover:border-primary-ink hover:text-primary-ink"
        >
          Continue with SAML SSO
        </button>
        <span className="body-sm text-secondary">Reset password · Request access</span>
      </div>

      <div className="flex flex-col items-start gap-lg p-[40px_32px]">
        <span className="label-caps text-secondary">After sign-in — pick a workspace</span>
        <div className="flex w-full max-w-[360px] flex-col gap-sm">
          {WORKSPACES.map((w) => (
            <Link
              key={w.name}
              to="/library"
              className={`block rounded-control border p-[10px_12px] transition-colors duration-[var(--dur-state)] hover:border-primary-ink ${
                w.selected ? 'border-primary-ink bg-surface-raised' : 'border-border'
              }`}
            >
              <div className="title-sm text-[length:var(--text-body-sm-size)]">{w.name}</div>
              <div className="data-sm text-secondary">{w.meta}</div>
            </Link>
          ))}
          <div className="label-caps rounded-control border border-dashed border-border p-[10px_12px] text-secondary">
            Create workspace
          </div>
        </div>
        <p className="body-sm max-w-[52ch] text-secondary">
          Role determines whether a run can be re-executed or only read. Every export carries the
          signing user and the run id.
        </p>
      </div>

      <PrototypeBadge />
    </div>
  );
}
