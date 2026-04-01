import { useState } from 'react';
import { Film } from 'lucide-react';
import logoImage from '../../assets/305e4436a31f76065263b76232b095b9e319fc67.png';
import { DiscoverTab } from './DiscoverTab';
import { SearchTab } from './SearchTab';
import { SocialTab } from './SocialTab';
import { RouletteTab } from './RouletteTab';

type Tab = 'discover' | 'search' | 'roulette' | 'social';

export function HomePage() {
  const [activeTab, setActiveTab] = useState<Tab>('discover');

  const tabs = [
    { id: 'discover' as Tab, label: 'Discover' },
    { id: 'search' as Tab, label: 'Search' },
    { id: 'roulette' as Tab, label: 'Roulette' },
    { id: 'social' as Tab, label: 'Social' },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Navigation Bar */}
      <nav className="bg-black border-b border-[#C0392B]/30 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <img src={logoImage} alt="Reelette" className="h-16 w-auto" />
            </div>

            {/* Tabs */}
            <div className="flex gap-12">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative pb-1 transition-colors ${
                    activeTab === tab.id
                      ? 'text-[#C0392B]'
                      : 'text-white hover:text-gray-300'
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C0392B]" />
                  )}
                </button>
              ))}
            </div>

            {/* Spacer for balance */}
            <div className="w-32" />
          </div>
        </div>
      </nav>

      {/* Tab Content */}
      <main className="container mx-auto px-6 py-8">
        {activeTab === 'discover' && <DiscoverTab />}
        {activeTab === 'search' && <SearchTab />}
        {activeTab === 'roulette' && <RouletteTab />}
        {activeTab === 'social' && <SocialTab />}
      </main>
    </div>
  );
}