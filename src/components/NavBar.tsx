import { NavLink } from 'react-router-dom';
import { Home, MessageCircleQuestion, BookOpen, Info, Leaf } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/ask', label: 'Ask', icon: MessageCircleQuestion },
  { to: '/library', label: 'Library', icon: BookOpen },
  { to: '/about', label: 'About', icon: Info },
] as const;

export function NavBar() {
  return (
    <>
      {/* Desktop sidebar */}
      <nav
        aria-label="Main navigation"
        className="hidden md:flex flex-col w-64 shrink-0 border-r border-border bg-card min-h-screen"
      >
        <div className="flex items-center gap-2.5 px-6 py-5 border-b border-border">
          <Leaf size={28} className="text-primary" aria-hidden="true" />
          <span className="font-heading text-xl font-bold text-foreground">Plant Doctor</span>
        </div>

        <div className="flex flex-col gap-1 px-3 py-4 flex-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`
              }
            >
              <Icon size={20} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-border text-xs text-muted-foreground">
          v0.1.0 — Frontend only
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <nav
        aria-label="Main navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border bg-card/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]"
      >
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2.5 px-3 text-[11px] font-medium transition-colors duration-150 cursor-pointer min-w-[64px] ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`
            }
          >
            <Icon size={22} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
