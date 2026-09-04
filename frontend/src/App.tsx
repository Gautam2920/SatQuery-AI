import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { LandingPage } from '@/pages/LandingPage';
import { AuthPage } from '@/pages/AuthPage';
import { SceneLibraryPage } from '@/pages/SceneLibraryPage';
import { WorkspacePage } from '@/pages/WorkspacePage';
import { RunHistoryPage } from '@/pages/RunHistoryPage';
import { ComparePage } from '@/pages/ComparePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { AuthProvider, useAuth } from '@/hooks/useAuth';

/** Reset scroll on route change (never animate on scroll — DESIGN.md). */
function ScrollReset() {
  const { pathname } = useLocation();
  useEffect(() => {
    try {
      window.scrollTo(0, 0);
    } catch {
      /* jsdom / non-browser environments */
    }
  }, [pathname]);
  return null;
}

/** Sends an anonymous visitor to sign in, remembering where they were headed.
 *  While a stored token is being confirmed nothing is rendered, so a guarded
 *  page never flashes before the session is known. */
function RequireAccount({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'restoring') {
    return (
      <div className="label-caps flex h-full items-center justify-center p-xl text-secondary">
        Restoring session…
      </div>
    );
  }

  if (status === 'anonymous') {
    return <Navigate to="/signin" replace state={{ from: location.pathname + location.search }} />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <ScrollReset />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signin" element={<AuthPage />} />
        <Route
          path="/library"
          element={
            <RequireAccount>
              <SceneLibraryPage />
            </RequireAccount>
          }
        />
        <Route
          path="/workspace"
          element={
            <RequireAccount>
              <WorkspacePage />
            </RequireAccount>
          }
        />
        <Route
          path="/history"
          element={
            <RequireAccount>
              <RunHistoryPage />
            </RequireAccount>
          }
        />
        <Route
          path="/compare"
          element={
            <RequireAccount>
              <ComparePage />
            </RequireAccount>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  );
}
