// App shell: top header + main + bottom nav
import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import BottomNav from './BottomNav';

// Root tabs — pressing back here shows "press again to exit" instead of going back
const ROOT_PATHS = new Set(['/', '/monitores', '/inventario', '/alertas', '/mas']);

function useAndroidBack() {
  const navigate = useNavigate();
  const location = useLocation();
  const [exitToast, setExitToast] = useState(false);
  const exitTimer = useRef(null);

  useEffect(() => {
    // Ensure there is always a history entry so the first back press stays in-app
    window.history.pushState({ ccc: true }, '');

    function onPopState() {
      const isRoot = ROOT_PATHS.has(location.pathname);

      if (isRoot) {
        if (exitToast) {
          // Second press within 2 s → let the browser handle it (exit)
          return;
        }
        // First press → push state again to stay, show toast
        window.history.pushState({ ccc: true }, '');
        setExitToast(true);
        clearTimeout(exitTimer.current);
        exitTimer.current = setTimeout(() => setExitToast(false), 2000);
      } else {
        navigate(-1);
      }
    }

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      clearTimeout(exitTimer.current);
    };
  }, [location.pathname, exitToast, navigate]);

  return exitToast;
}

export default function Layout({ title }) {
  const exitToast = useAndroidBack();

  return (
    <div className="min-h-full flex flex-col bg-slate-50">
      {/* Exit toast — appears when back is pressed on a root tab */}
      {exitToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg pointer-events-none">
          Presiona atrás de nuevo para salir
        </div>
      )}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-100 shadow-[0_1px_3px_rgba(27,115,232,0.07)]">
        <div className="px-4 py-3 flex items-center gap-2.5">
          <span className="w-1 h-5 rounded-full bg-brand-500 shrink-0" aria-hidden />
          <h1 className="text-base font-semibold text-slate-800">
            {title || 'Cold Chain Control'}
          </h1>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 pb-24">
        <Outlet />
      </main>

      <BottomNav />
    </div>
  );
}
