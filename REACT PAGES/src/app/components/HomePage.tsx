import { NavLink, Outlet } from 'react-router-dom';
import logoImage from '../../assets/305e4436a31f76065263b76232b095b9e319fc67.png';

type TabLink = {
  id: string;
  label: string;
  path: string;
};

export function HomePage() {
  const tabs: TabLink[] = [
    { id: 'discover', label: 'Discover', path: '/home/discover' },
    { id: 'search', label: 'Search', path: '/home/search' },
    { id: 'roulette', label: 'Roulette', path: '/home/roulette' },
    { id: 'social', label: 'Social', path: '/home/social' },
    { id: 'profile', label: 'Profile', path: '/home/profile' },
    { id: 'settings', label: 'Settings', path: '/home/settings' },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <nav className="bg-black border-b border-[#C0392B]/30 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logoImage} alt="Reelette" className="h-16 w-auto" />
            </div>

            <div className="flex gap-12">
              {tabs.map((tab) => (
                <NavLink
                  key={tab.id}
                  to={tab.path}
                  className={({ isActive }) =>
                    `relative pb-1 transition-colors ${isActive
                      ? 'text-[#C0392B]'
                      : 'text-white hover:text-gray-300'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {tab.label}
                      {isActive && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C0392B]" />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>

            <div className="w-32" />
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}