import { Suspense } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import logoImage from '../../assets/Reelette_NAME_upscaled.png';
import reeletteLogo from '../../assets/Reelette_LOGO_upscaled.png';

type TabLink = {
  id: string;
  label: string;
  path: string;
  imageLogo?: string;
};

export function HomePage() {
  const tabs: TabLink[] = [
    { id: 'discover', label: 'Discover', path: '/home/discover' },
    { id: 'mystuff', label: 'My Stuff', path: '/home/mystuff' },
    {
      id: 'roulette',
      label: 'Reelette',
      path: '/home/roulette',
      imageLogo: reeletteLogo,
    },
    { id: 'social', label: 'Social', path: '/home/social' },
    { id: 'profile', label: 'Profile', path: '/home/profile' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="sticky top-0 z-50 overflow-visible border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div
              className="relative flex items-center"
              style={{ height: '4rem', minWidth: '20rem' }}
            >
              <img
                src={logoImage}
                alt="Reelette"
                className="absolute h-10 w-auto"
                style={{
                  top: '60%',
                  transform: 'translateY(-50%)',
                  left: -10,
                }}
              />
            </div>

            <div className="flex items-center gap-12">
              {tabs.map((tab) => (
                <NavLink
                  key={tab.id}
                  to={tab.path}
                  className={({ isActive }) =>
                    `group relative flex items-center transition-colors ${
                      isActive
                        ? 'text-red-600'
                        : 'text-foreground hover:text-muted-foreground'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {tab.imageLogo ? (
                        <img
                          src={tab.imageLogo}
                          alt={tab.label}
                          className="h-12 w-12"
                        />
                      ) : (
                        tab.label
                      )}

                      <div
                        className={`absolute bottom-0 left-0 right-0 h-0.5 bg-red-600 transition-opacity ${
                          isActive
                            ? 'opacity-100'
                            : 'opacity-0 group-hover:opacity-100'
                        }`}
                      />
                    </>
                  )}
                </NavLink>
              ))}
            </div>

            <div className="w-65" />
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-8">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-24 text-muted-foreground">
              Loading…
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}