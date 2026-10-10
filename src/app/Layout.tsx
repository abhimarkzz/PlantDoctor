import { Outlet } from 'react-router-dom';
import { NavBar } from '../components/NavBar';
import { ConnectionBanner } from '../components/ConnectionBanner';

export function Layout() {
  return (
    <div className="flex min-h-screen">
      <NavBar />
      <div className="flex-1 flex flex-col min-h-screen">
        <ConnectionBanner />
        <main className="flex-1 px-4 md:px-8 py-6 pb-24 md:pb-6 max-w-4xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
