import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { LinkButton } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { RegistrationMark } from '@/components/ui/RegistrationMark';
import { useAuth } from '@/hooks/useAuth';

const SECTION_LINKS = [
  { id: 'technology', label: 'Technology' },
  { id: 'what', label: 'What it is' },
  { id: 'how', label: 'How it works' },
  { id: 'capabilities', label: 'Capabilities' },
];

/** A visitor with a confirmed session has no reason to be sent to a sign-in
 *  form, so the same control carries them into the application instead. */
function ApplicationEntryButton() {
  const { status } = useAuth();

  if (status === 'authenticated') {
    return (
      <LinkButton to="/library" size="sm" variant="secondary">
        Open SatQuery
      </LinkButton>
    );
  }

  return (
    <LinkButton to="/signin" size="sm" variant="secondary">
      Sign in
    </LinkButton>
  );
}

/** Marks the section the reader is actually in, so the nav reports position
 *  instead of being four inert links. */
function useActiveSection(sectionIds: string[]): string | null {
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((section): section is HTMLElement => section !== null);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        const topmost = visible[0];
        if (topmost) setActiveSectionId(topmost.target.id);
      },
      { rootMargin: '-72px 0px -55% 0px', threshold: 0 },
    );

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, [sectionIds]);

  return activeSectionId;
}

/** The nav sits on the same paper ground as the page, so it needs a scrolled
 *  state to stay readable once content passes beneath it. */
function usePageIsScrolled(): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const syncScrolledState = () => setScrolled(window.scrollY > 8);

    syncScrolledState();
    window.addEventListener('scroll', syncScrolledState, { passive: true });

    return () => window.removeEventListener('scroll', syncScrolledState);
  }, []);

  return scrolled;
}

const SECTION_IDS = SECTION_LINKS.map((link) => link.id);

export function LandingNav() {
  const activeSectionId = useActiveSection(SECTION_IDS);
  const scrolled = usePageIsScrolled();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    window.addEventListener('keydown', closeOnEscape);

    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  return (
    <nav
      aria-label="Primary"
      className={cn(
        'sticky top-0 z-10 border-b bg-neutral px-[var(--margin)] transition-[box-shadow,border-color,padding] duration-[var(--dur-surface)]',
        scrolled
          ? 'border-border py-sm shadow-[var(--shadow-float-light)]'
          : 'border-transparent py-gutter',
      )}
    >
      <div className="flex items-center gap-gutter">
        <Link
          to="/"
          className="group flex items-center gap-[10px]"
          onClick={() => setMenuOpen(false)}
        >
          <RegistrationMark size={18} color="var(--primary-ink)" />
          <span className="label-caps text-primary-ink">SatQuery AI</span>
        </Link>

        <span className="ml-auto flex items-center gap-lg max-[720px]:hidden">
          {SECTION_LINKS.map((link) => {
            const active = activeSectionId === link.id;

            return (
              <a
                key={link.id}
                href={`#${link.id}`}
                aria-current={active ? 'true' : undefined}
                className={cn(
                  'label-caps border-b-2 pb-[3px] transition-colors duration-[var(--dur-state)]',
                  active
                    ? 'border-primary-ink text-primary-ink'
                    : 'border-transparent text-secondary hover:border-border hover:text-primary-ink',
                )}
              >
                {link.label}
              </a>
            );
          })}
          <ApplicationEntryButton />
        </span>

        <span className="ml-auto hidden items-center gap-sm max-[720px]:flex">
          <ApplicationEntryButton />
          <button
            type="button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="landing-nav-menu"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-[30px] w-[30px] items-center justify-center rounded-control border border-border text-secondary transition-colors duration-[var(--dur-state)] hover:border-primary-ink hover:text-primary-ink"
          >
            <Icon name={menuOpen ? 'x' : 'list'} size={14} />
          </button>
        </span>
      </div>

      {menuOpen && (
        <div
          id="landing-nav-menu"
          className="hidden flex-col gap-xs border-t border-border pt-sm max-[720px]:flex"
        >
          {SECTION_LINKS.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              onClick={() => setMenuOpen(false)}
              aria-current={activeSectionId === link.id ? 'true' : undefined}
              className={cn(
                'label-caps border-l-2 py-[6px] pl-sm transition-colors duration-[var(--dur-state)]',
                activeSectionId === link.id
                  ? 'border-primary-ink text-primary-ink'
                  : 'border-transparent text-secondary hover:text-primary-ink',
              )}
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
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
