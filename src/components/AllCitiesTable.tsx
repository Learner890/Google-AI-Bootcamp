import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Globe, MapPin, Search } from 'lucide-react';
import { AQIStandard, CityAQIData, MapScope } from '../types/aqi';
import { getAQICategory } from '../utils/aqiCalculator';

interface AllCitiesTableProps {
  cities: CityAQIData[];
  scope: MapScope;
  standard: AQIStandard;
  onChangeScope: (scope: MapScope) => void;
  onChangeStandard: (std: AQIStandard) => void;
  onInspectCityOnMap: (city: CityAQIData) => void;
}

type SortField = 'name' | 'naqi' | 'usAqi' | 'pm2_5' | 'pm10' | 'nitrogen_dioxide' | 'ozone';

export const AllCitiesTable: React.FC<AllCitiesTableProps> = ({
  cities,
  scope,
  standard,
  onChangeScope,
  onChangeStandard,
  onInspectCityOnMap,
}) => {
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('All');
  const [sortField, setSortField] = useState<SortField>(standard === 'NAQI' ? 'naqi' : 'usAqi');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const scopedCities = useMemo(() => {
    return scope === 'india' ? cities.filter((c) => c.isIndia) : cities;
  }, [cities, scope]);

  const regions = useMemo(() => {
    const set = new Set<string>();
    scopedCities.forEach((c) => set.add(c.region));
    return ['All', ...Array.from(set).sort()];
  }, [scopedCities]);

  const filteredAndSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = scopedCities.filter((c) => {
      if (regionFilter !== 'All' && c.region !== regionFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.state.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q)
      );
    });

    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else if (sortField === 'naqi') {
        cmp = a.naqi - b.naqi;
      } else if (sortField === 'usAqi') {
        cmp = a.usAqi - b.usAqi;
      } else {
        cmp = a.pollutants[sortField] - b.pollutants[sortField];
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return filtered;
  }, [scopedCities, search, regionFilter, sortField, sortDir]);

  // Live summary stats computed strictly from active dataset
  const stats = useMemo(() => {
    if (scopedCities.length === 0) {
      return { count: 0, mean: 0, cleanest: null as CityAQIData | null, worst: null as CityAQIData | null };
    }
    const getVal = (c: CityAQIData) => (standard === 'NAQI' ? c.naqi : c.usAqi);
    let sum = 0;
    let cleanest = scopedCities[0];
    let worst = scopedCities[0];

    for (const c of scopedCities) {
      const v = getVal(c);
      sum += v;
      if (v < getVal(cleanest)) cleanest = c;
      if (v > getVal(worst)) worst = c;
    }

    return {
      count: scopedCities.length,
      mean: Math.round(sum / scopedCities.length),
      cleanest,
      worst,
    };
  }, [scopedCities, standard]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortDir(field === 'name' ? 'asc' : 'desc');
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-slate-400" />;
    return sortDir === 'desc' ? (
      <ArrowDown className="w-3 h-3 text-slate-900" />
    ) : (
      <ArrowUp className="w-3 h-3 text-slate-900" />
    );
  };

  return (
    <div className="max-w-[1380px] mx-auto px-6 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {scope === 'india' ? 'All Monitored Cities Across India' : 'India & Global City Air Quality Directory'}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Live hourly atmospheric readings across {stats.count} stations · Click any city to focus on the map.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-0.5 bg-slate-200/70 rounded-lg">
            <button
              type="button"
              onClick={() => {
                onChangeScope('india');
                setRegionFilter('All');
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                scope === 'india' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>India Only</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onChangeScope('world');
                setRegionFilter('All');
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                scope === 'world' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>India + World</span>
            </button>
          </div>

          <div className="inline-flex p-0.5 bg-slate-200/70 rounded-lg">
            <button
              type="button"
              onClick={() => onChangeStandard('NAQI')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                standard === 'NAQI' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              India NAQI
            </button>
            <button
              type="button"
              onClick={() => onChangeStandard('US_AQI')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                standard === 'US_AQI' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              US AQI
            </button>
          </div>
        </div>
      </div>

      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">Active Stations</div>
          <div className="font-mono text-2xl font-bold text-slate-900 tabular-nums mt-1">
            {stats.count}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {scope === 'india' ? 'Across Indian states & UTs' : 'India & 6 continents'}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">
            Network Mean ({standard === 'NAQI' ? 'NAQI' : 'US AQI'})
          </div>
          <div className="font-mono text-2xl font-bold text-slate-900 tabular-nums mt-1">
            {stats.mean}
          </div>
          <div className={`text-xs font-medium mt-1 ${getAQICategory(stats.mean, standard).textClass}`}>
            {getAQICategory(stats.mean, standard).label} average
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">Cleanest Air</div>
          <div className="flex items-baseline justify-between gap-2 mt-1">
            <span className="font-display text-lg font-bold text-slate-900 truncate">
              {stats.cleanest ? stats.cleanest.name : '—'}
            </span>
            <span className="font-mono text-xl font-bold text-emerald-700 tabular-nums">
              {stats.cleanest ? (standard === 'NAQI' ? stats.cleanest.naqi : stats.cleanest.usAqi) : '—'}
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-1 truncate">
            {stats.cleanest ? `${stats.cleanest.state} · ${stats.cleanest.country}` : ''}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-medium text-slate-500">Highest Pollution</div>
          <div className="flex items-baseline justify-between gap-2 mt-1">
            <span className="font-display text-lg font-bold text-slate-900 truncate">
              {stats.worst ? stats.worst.name : '—'}
            </span>
            <span className="font-mono text-xl font-bold text-rose-700 tabular-nums">
              {stats.worst ? (standard === 'NAQI' ? stats.worst.naqi : stats.worst.usAqi) : '—'}
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-1 truncate">
            {stats.worst ? `${stats.worst.state} · ${stats.worst.country}` : ''}
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by city, state, or country..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-slate-400"
            />
          </div>

          <div className="flex items-center gap-3">
            <label htmlFor="region-select" className="text-xs font-medium text-slate-500 whitespace-nowrap">
              Region
            </label>
            <select
              id="region-select"
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-slate-400"
            >
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Data Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                <th className="py-3 pl-4 pr-3 w-10 text-right">#</th>
                <th className="py-3 px-3">
                  <button
                    type="button"
                    onClick={() => handleSort('name')}
                    className="inline-flex items-center gap-1 hover:text-slate-900"
                  >
                    <span>City &amp; Region</span>
                    {renderSortIcon('name')}
                  </button>
                </th>
                <th className="py-3 px-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('naqi')}
                    className="inline-flex items-center justify-end gap-1 hover:text-slate-900 ml-auto"
                  >
                    <span>India NAQI</span>
                    {renderSortIcon('naqi')}
                  </button>
                </th>
                <th className="py-3 px-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('usAqi')}
                    className="inline-flex items-center justify-end gap-1 hover:text-slate-900 ml-auto"
                  >
                    <span>US AQI</span>
                    {renderSortIcon('usAqi')}
                  </button>
                </th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('pm2_5')}
                    className="inline-flex items-center justify-end gap-1 hover:text-slate-900 ml-auto"
                  >
                    <span>PM₂.₅ (µg/m³)</span>
                    {renderSortIcon('pm2_5')}
                  </button>
                </th>
                <th className="py-3 px-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('pm10')}
                    className="inline-flex items-center justify-end gap-1 hover:text-slate-900 ml-auto"
                  >
                    <span>PM₁₀ (µg/m³)</span>
                    {renderSortIcon('pm10')}
                  </button>
                </th>
                <th className="py-3 px-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('nitrogen_dioxide')}
                    className="inline-flex items-center justify-end gap-1 hover:text-slate-900 ml-auto"
                  >
                    <span>NO₂</span>
                    {renderSortIcon('nitrogen_dioxide')}
                  </button>
                </th>
                <th className="py-3 pl-3 pr-4 text-right">
                  <button
                    type="button"
                    onClick={() => handleSort('ozone')}
                    className="inline-flex items-center justify-end gap-1 hover:text-slate-900 ml-auto"
                  >
                    <span>O₃</span>
                    {renderSortIcon('ozone')}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredAndSorted.map((city, idx) => {
                const activeVal = standard === 'NAQI' ? city.naqi : city.usAqi;
                const cat = getAQICategory(activeVal, standard);
                return (
                  <tr
                    key={city.id}
                    onClick={() => onInspectCityOnMap(city)}
                    className="hover:bg-sky-50/50 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 pl-4 pr-3 font-mono text-xs text-slate-400 text-right tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900">{city.name}</div>
                      <div className="text-xs text-slate-500">
                        {city.state} · {city.country}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                      {city.naqi}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-700 tabular-nums">
                      {city.usAqi}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${cat.textClass}`}>
                        <span
                          className="w-2 h-2 rounded-xs shrink-0"
                          style={{ backgroundColor: cat.color }}
                          aria-hidden="true"
                        />
                        <span>{cat.label}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700 tabular-nums">
                      {city.pollutants.pm2_5.toFixed(1)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700 tabular-nums">
                      {city.pollutants.pm10.toFixed(1)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-600 tabular-nums">
                      {city.pollutants.nitrogen_dioxide.toFixed(1)}
                    </td>
                    <td className="py-2.5 pl-3 pr-4 text-right font-mono text-slate-600 tabular-nums">
                      {city.pollutants.ozone.toFixed(1)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
