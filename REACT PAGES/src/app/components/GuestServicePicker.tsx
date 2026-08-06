import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { saveServices, getServices } from '../services/api';

import netflixLogo    from '../../assets/netflix-logo.png';
import huluLogo       from '../../assets/hulu.webp';
import disneyLogo     from '../../assets/disney-plus.jpg';
import hboLogo        from '../../assets/hbo-max.png';
import primeLogo      from '../../assets/prime-video.jpg';
import appleLogo      from '../../assets/apple-tv.png';
import paramountLogo  from '../../assets/paramount-plus.jpg';
import peacockLogo    from '../../assets/peacock.webp';

const SERVICES = [
  { key: 'netflix',     label: 'Netflix',      logo: netflixLogo,   color: '#E50914' },
  { key: 'hulu',        label: 'Hulu',         logo: huluLogo,      color: '#1CE783' },
  { key: 'disneyPlus',  label: 'Disney+',      logo: disneyLogo,    color: '#113CCF' },
  { key: 'hboMax',      label: 'Max',          logo: hboLogo,       color: '#6B2FF1' },
  { key: 'amazonPrime', label: 'Prime Video',  logo: primeLogo,     color: '#00A8E1' },
  { key: 'appleTV',     label: 'Apple TV+',    logo: appleLogo,     color: '#999999' },
  { key: 'paramount',   label: 'Paramount+',   logo: paramountLogo, color: '#0064FF' },
  { key: 'peacock',     label: 'Peacock',      logo: peacockLogo,   color: '#FF6E30' },
];

interface Props {
  onServicesChange: () => void;
}

export function GuestServicePicker({ onServicesChange }: Props) {
  const [selected, setSelected] = useState<Record<string, boolean>>(() => getServices());
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    saveServices(selected);
    onServicesChange();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const toggle = (key: string) => {
    setSelected(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const activeCount = Object.values(selected).filter(Boolean).length;

  return (
    <div className="bg-[#0e0e0e] border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        {/* Header row */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full flex items-center justify-between py-3 text-left"
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-white/60">
              Filter by services
            </span>
            {activeCount > 0 && (
              <span className="text-xs text-[#D4A843] font-medium">
                {activeCount} selected
              </span>
            )}
          </div>
          <span className="text-white/30 text-xs">{expanded ? 'Hide' : 'Show'}</span>
        </button>

        {/* Service grid */}
        {expanded && (
          <div className="pb-3 grid grid-cols-4 sm:grid-cols-8 gap-2">
            {SERVICES.map(s => {
              const on = !!selected[s.key];
              return (
                <button
                  key={s.key}
                  onClick={() => toggle(s.key)}
                  className={`relative flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all duration-150 ${
                    on
                      ? 'border-white/25 bg-white/8'
                      : 'border-white/5 bg-transparent hover:border-white/12 hover:bg-white/4'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center bg-black/40">
                    <img src={s.logo} alt={s.label} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <span className="text-[10px] text-white/50 leading-tight text-center">{s.label}</span>
                  {on && (
                    <span
                      className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                      style={{ background: s.color }}
                    >
                      <Check size={8} strokeWidth={3} className="text-white" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
