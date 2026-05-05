// App shell: top header + main + bottom nav
import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';

export default function Layout({ title }) {
  return (
    <div className="min-h-full flex flex-col bg-slate-50">
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
