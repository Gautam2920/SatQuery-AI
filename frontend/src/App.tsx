import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { LandingPage } from '@/pages/LandingPage';
import { AuthPage } from '@/pages/AuthPage';
import { SceneLibraryPage } from '@/pages/SceneLibraryPage';
import { WorkspacePage } from '@/pages/WorkspacePage';
import { RunHistoryPage } from '@/pages/RunHistoryPage';
import { ComparePage } from '@/pages/ComparePage';
import { NotFoundPage } from '@/pages/NotFoundPage';

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

export default function App() {
  return (
    <>
      <ScrollReset />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signin" element={<AuthPage />} />
        <Route path="/library" element={<SceneLibraryPage />} />
        <Route path="/workspace" element={<WorkspacePage />} />
        <Route path="/history" element={<RunHistoryPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
