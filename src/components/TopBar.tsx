import React from 'react';
import { Globe, MapPin } from 'lucide-react';
import { MapScope, ViewTab } from '../types/aqi';

interface TopBarProps {
  activeTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  scope: MapScope;
  onToggleScope: () => void;
}

const NAV_ITEMS: Array<{ id: ViewTab; label: string }> = [
  { id: 'map', label: 'Map Explorer' },
  { id: 'cities', label: 'All Cities' },
  { id: 'compare', label: 'Compare' },
  { id: 'guide', label: 'Pollutant Guide' },
];

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onSelectTab,
  scope,
  onToggleScope,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-6 h-16 flex items-center justify-between gap-8">
      {/* Zone 1: Single text element wordmark */}
      <button
        type="button"
        onClick={() => onSelectTab('map')}
        className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 rounded"
      >
        VayuAtlas
      </button>

      {/* Zone 2: Clean single-line text navigation links */}
      <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-7 h-full">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`h-full inline-flex items-center text-sm font-medium transition-colors whitespace-nowrap shrink-0 border-b-2 -mb-[1px] focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
                isActive
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={onToggleScope}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950 transition-colors whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
        >
          {scope === 'india' ? (
            <>
              <Globe className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Expand to World Map</span>
            </>
          ) : (
            <>
              <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Focus on India</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
