import { LinkButton } from '@/components/ui/Button';
import { RegistrationMark } from '@/components/ui/RegistrationMark';

export function NotFoundPage() {
  return (
    <div className="flex min-h-full flex-col items-start gap-lg bg-neutral p-[var(--margin)] text-on-surface">
      <RegistrationMark size={24} />
      <span className="data-sm text-secondary">404 · no run at this address</span>
      <h1 className="headline-lg max-w-[20ch]">This screen is not part of the workspace.</h1>
      <p className="body-lg max-w-[60ch] text-secondary">
        Every run is addressable — but this path isn&rsquo;t one of them. Head back to the landing
        or open the scene library.
      </p>
      <div className="flex flex-wrap gap-md">
        <LinkButton to="/">Landing</LinkButton>
        <LinkButton to="/library" variant="secondary">
          Scene library
        </LinkButton>
      </div>
    </div>
  );
}
