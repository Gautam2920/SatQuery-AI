import { Link } from 'react-router-dom';
import { LinkButton } from '@/components/ui/Button';
import { RegistrationMark } from '@/components/ui/RegistrationMark';

const NAV = [
  { href: '#technology', label: 'Technology' },
  { href: '#what', label: 'What it is' },
  { href: '#how', label: 'How it works' },
  { href: '#capabilities', label: 'Capabilities' },
];

export function LandingNav() {
  return (
    <nav className="sticky top-0 z-10 flex items-center gap-gutter border-b border-border bg-neutral px-[var(--margin)] py-gutter">
      <Link to="/" className="flex items-center gap-[10px]">
        <RegistrationMark size={18} color="var(--primary-ink)" />
        <span className="label-caps text-primary-ink">SatQuery AI</span>
      </Link>
      <span className="ml-auto flex items-center gap-lg max-[720px]:hidden">
        {NAV.map((n) => (
          <a
            key={n.href}
            href={n.href}
            className="label-caps text-secondary transition-colors duration-[var(--dur-state)] hover:text-primary-ink"
          >
            {n.label}
          </a>
        ))}
        <LinkButton to="/signin" size="sm" variant="secondary">
          Sign in
        </LinkButton>
      </span>
      <span className="ml-auto hidden max-[720px]:block">
        <LinkButton to="/signin" size="sm" variant="secondary">
          Sign in
        </LinkButton>
      </span>
    </nav>
  );
}

export function LandingFooter() {
  return (
    <footer className="mt-xxl flex flex-wrap items-center gap-gutter border-t border-border px-[var(--margin)] py-lg">
      <span className="flex items-center gap-[10px]">
        <RegistrationMark size={16} color="var(--primary-ink)" />
        <span className="label-caps text-primary-ink">SatQuery AI</span>
      </span>
      <span className="flex-1" />
      <span className="data-sm text-secondary">
        docs · status · security · contact — prototype build, not for operational decisions
      </span>
    </footer>
  );
}

/** Flush-left content wrap — 1200px cap, 32px margin (DESIGN.md landing grid). */
export function Wrap({
  id,
  children,
  className,
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`mx-auto w-full max-w-[calc(var(--content-max)+2*var(--margin))] px-[var(--margin)] ${className ?? ''}`}
      style={{ scrollMarginTop: '72px' }}
    >
      {children}
    </section>
  );
}
