// App shell: top header + main + bottom nav
import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';

export default function Layout({ title }) {
  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="px-4 py-3 flex items-center">
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
