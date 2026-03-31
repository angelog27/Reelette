import { useState } from 'react';
import { Check } from 'lucide-react';
import { updateUserStreaming, saveServices } from '../services/api';

const SERVICES = [
  { key: 'netflix',     label: 'Netflix',      bg: '#E50914' },
  { key: 'hulu',        label: 'Hulu',         bg: '#1CE783' },
  { key: 'disneyPlus',  label: 'Disney+',      bg: '#113CCF' },
  { key: 'hboMax',      label: 'Max',          bg: '#6B2FF1' },
  { key: 'amazonPrime', label: 'Prime Video',  bg: '#00A8E1' },
  { key: 'appleTV',     label: 'Apple TV+',    bg: '#555555' },
  { key: 'paramount',   label: 'Paramount+',   bg: '#0064FF' },
  { key: 'peacock',     label: 'Peacock',      bg: '#FF6E30' },
];

interface Props {
  userId: string;
  initialServices?: Record<string, boolean>;
  onDone: () => void;
  onSkip?: () => void;
}

export function StreamingSetup({ userId, initialServices, onDone, onSkip }: Props) {
  const blank = Object.fromEntries(SERVICES.map((s) => [s.key, false]));
  const [selected, setSelected] = useState<Record<string, boolean>>(
    initialServices ?? blank
  );
  const [saving, setSaving] = useState(false);

  const toggle = (key: string) =>
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleSave = async () => {
    setSaving(true);
    await updateUserStreaming(userId, selected);
    saveServices(selected);
    setSaving(false);
    onDone();
  };

  return (
    <div className="w-full bg-black/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 shadow-2xl">
      <h2 className="text-white text-2xl font-semibold text-center mb-2">
        Your Streaming Services
      </h2>
      <p className="text-gray-400 text-sm text-center mb-8">
        Select the services you subscribe to so we can filter your recommendations.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-8">
        {SERVICES.map((s) => {
          const on = selected[s.key];
          return (
            <button
              key={s.key}
              onClick={() => toggle(s.key)}
              className={`relative flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                on
                  ? 'border-white/30 bg-white/10'
                  : 'border-gray-800 bg-gray-900/50 hover:border-gray-600'
              }`}
            >
              {/* Colored dot */}
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ background: s.bg }}
              />
              <span className="text-white font-medium text-sm">{s.label}</span>
              {on && (
                <span className="ml-auto">
                  <Check className="w-4 h-4 text-green-400" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex gap-3">
        {onSkip && (
          <button
            onClick={onSkip}
            className="flex-1 bg-transparent border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white px-6 py-3 rounded-lg transition-colors font-medium"
          >
            Skip for now
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-3 rounded-lg transition-all font-medium disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}
