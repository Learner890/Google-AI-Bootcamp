import React, { useMemo, useState } from 'react';
import { ArrowUpDown, Globe, Loader2, MapPin, Plus, Search, X } from 'lucide-react';
import { AQIStandard, CityAQIData, CityCoord, MapScope } from '../types/aqi';
import { getAQICategory } from '../utils/aqiCalculator';
import { searchLiveCityLocation } from '../services/airQualityApi';

interface CityDirectorySidebarProps {
  cities: CityAQIData[];
  scope: MapScope;
  standard: AQIStandard;
  selectedCityId: string | null;
  loading: boolean;
  onSelectCity: (city: CityAQIData) => void;
  onChangeScope: (scope: MapScope) => void;
  onChangeStandard: (std: AQIStandard) => void;
  onAddCustomCity: (coord: CityCoord) => Promise<void>;
}

type CategoryFilter = 'all' | 'clean' | 'moderate' | 'poor';
type SortMode = 'desc' | 'asc' | 'name';

export const CityDirectorySidebar: React.FC<CityDirectorySidebarProps> = ({
  cities,
  scope,
  standard,
  selectedCityId,
  loading,
  onSelectCity,
  onChangeScope,
  onChangeStandard,
  onAddCustomCity,
}) => {
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('desc');
  const [globalMatches, setGlobalMatches] = useState<CityCoord[]>([]);
  const [searchingGlobal, setSearchingGlobal] = useState(false);
  const [addingCityId, setAddingCityId] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const scopedCities = useMemo(() => {
    return scope === 'india' ? cities.filter((c) => c.isIndia) : cities;
  }, [cities, scope]);

  const filteredCities = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = scopedCities.filter((c) => {
      const matchesText =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.state.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q) ||
        c.region.toLowerCase().includes(q);
      if (!matchesText) return false;

      const val = standard === 'NAQI' ? c.naqi : c.usAqi;
      if (categoryFilter === 'clean') return val <= 100;
      if (categoryFilter === 'moderate') return val > 100 && val <= 200;
      if (categoryFilter === 'poor') return val > 200;
      return true;
    });

    list.sort((a, b) => {
      const va = standard === 'NAQI' ? a.naqi : a.usAqi;
      const vb = standard === 'NAQI' ? b.naqi : b.usAqi;
      if (sortMode === 'desc') return vb - va;
      if (sortMode === 'asc') return va - vb;
      return a.name.localeCompare(b.name);
    });

    return list;
  }, [scopedCities, query, categoryFilter, sortMode, standard]);

  const handleGlobalSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length < 2) return;
    setSearchingGlobal(true);
    setSearchError(null);
    try {
      const matches = await searchLiveCityLocation(query);
      setGlobalMatches(matches);
      if (matches.length === 0) {
        setSearchError('No matching global cities found.');
      }
    } catch {
      setSearchError('Unable to reach location lookup.');
    } finally {
      setSearchingGlobal(false);
    }
  };

  const handlePickGlobalMatch = async (match: CityCoord) => {
    setAddingCityId(match.id);
    try {
      await onAddCustomCity(match);
      setGlobalMatches([]);
      setQuery('');
    } finally {
      setAddingCityId(null);
    }
  };

  return (
    <aside className="w-full lg:w-[340px] xl:w-[360px] shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col lg:h-[calc(100vh-4rem)]">
      {/* Scope & Standard Controls */}
      <div className="p-4 border-b border-slate-200 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="grid grid-cols-2 p-0.5 bg-slate-100 rounded-lg flex-1">
            <button
              type="button"
              onClick={() => onChangeScope('india')}
              className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                scope === 'india'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
              <span>India ({cities.filter((c) => c.isIndia).length})</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeScope('world')}
              className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                scope === 'world'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Globe className="w-3.5 h-3.5" aria-hidden="true" />
              <span>World ({cities.length})</span>
            </button>
          </div>
        </div>

        {/* Standard Toggle */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Index Scale</span>
          <div className="inline-flex p-0.5 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => onChangeStandard('NAQI')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                standard === 'NAQI'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              India NAQI
            </button>
            <button
              type="button"
              onClick={() => onChangeStandard('US_AQI')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                standard === 'US_AQI'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              US EPA AQI
            </button>
          </div>
        </div>

        {/* Search Input + Live Global Lookup */}
        <form onSubmit={handleGlobalSearch} className="relative">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (globalMatches.length > 0) setGlobalMatches([]);
              if (searchError) setSearchError(null);
            }}
            placeholder={scope === 'india' ? 'Filter Indian city or press Enter...' : 'Filter or lookup any city...'}
            aria-label="Search cities"
            className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-400"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setGlobalMatches([]);
                setSearchError(null);
              }}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </form>

        {/* Live Global Lookup Prompt when typing */}
        {query.trim().length >= 2 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">
              {filteredCities.length} matching in directory
            </span>
            <button
              type="button"
              onClick={handleGlobalSearch}
              disabled={searchingGlobal}
              className="text-sky-700 hover:text-sky-900 font-medium inline-flex items-center gap-1 whitespace-nowrap"
            >
              {searchingGlobal ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <span>Lookup &ldquo;{query.trim()}&rdquo; live</span>
              )}
            </button>
          </div>
        )}

        {searchError && (
          <p className="text-xs text-rose-600">{searchError}</p>
        )}

        {globalMatches.length > 0 && (
          <div className="border border-slate-200 rounded-lg bg-slate-50 divide-y divide-slate-200 max-h-48 overflow-y-auto">
            <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-500 flex items-center justify-between">
              <span>Add City from Live Geocoder</span>
              <button
                type="button"
                onClick={() => setGlobalMatches([])}
                className="text-slate-400 hover:text-slate-700"
              >
                Close
              </button>
            </div>
            {globalMatches.map((m) => (
              <button
                key={m.id}
                type="button"
                disabled={addingCityId === m.id}
                onClick={() => handlePickGlobalMatch(m)}
                className="w-full px-3 py-2 text-left hover:bg-white transition-colors flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-900 truncate">{m.name}</div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {m.state} · {m.country}
                  </div>
                </div>
                {addingCityId === m.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500 shrink-0" />
                ) : (
                  <Plus className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Category Filter Tabs & Sort */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg overflow-x-auto">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'clean', label: '0–100' },
                { id: 'moderate', label: '101–200' },
                { id: 'poor', label: '201+' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategoryFilter(tab.id)}
                className={`px-2 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap ${
                  categoryFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              setSortMode((prev) => (prev === 'desc' ? 'asc' : prev === 'asc' ? 'name' : 'desc'))
            }
            title="Cycle sort order"
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 rounded-md whitespace-nowrap shrink-0"
          >
            <ArrowUpDown className="w-3 h-3" aria-hidden="true" />
            <span>{sortMode === 'desc' ? 'High' : sortMode === 'asc' ? 'Low' : 'A–Z'}</span>
          </button>
        </div>
      </div>

      {/* City List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[340px] lg:max-h-none">
        {loading && cities.length === 0 ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2 animate-pulse">
                <div className="space-y-1.5">
                  <div className="h-3.5 w-28 bg-slate-200 rounded" />
                  <div className="h-2.5 w-36 bg-slate-100 rounded" />
                </div>
                <div className="h-6 w-12 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        ) : filteredCities.length === 0 ? (
          <div className="p-6 text-center space-y-2">
            <p className="text-sm font-medium text-slate-700">No cities match your filter</p>
            <p className="text-xs text-slate-500">
              Try clearing filters or search any global city above.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setCategoryFilter('all');
              }}
              className="mt-2 px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredCities.map((city) => {
            const val = standard === 'NAQI' ? city.naqi : city.usAqi;
            const cat = getAQICategory(val, standard);
            const isSelected = city.id === selectedCityId;

            return (
              <button
                key={city.id}
                type="button"
                onClick={() => onSelectCity(city)}
                className={`w-full px-4 py-2.5 text-left transition-colors flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-sky-50/90'
                    : 'hover:bg-slate-50'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-sm font-semibold truncate ${
                        isSelected ? 'text-sky-950' : 'text-slate-900'
                      }`}
                    >
                      {city.name}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {city.state} · {city.isIndia ? city.region : city.country}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="flex items-center justify-end gap-1.5">
                    <span
                      className="w-2 h-2 rounded-xs shrink-0"
                      style={{ backgroundColor: cat.color }}
                      aria-hidden="true"
                    />
                    <span className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                      {val}
                    </span>
                  </div>
                  <div className={`text-[11px] font-medium ${cat.textClass}`}>
                    {cat.shortLabel}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
};
