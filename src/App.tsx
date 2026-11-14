import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { INDIA_CITIES, WORLD_CITIES } from './data/cities';
import { fetchBatchCityAQI } from './services/airQualityApi';
import { AQIStandard, CityAQIData, CityCoord, MapScope, ViewTab } from './types/aqi';
import { TopBar } from './components/TopBar';
import { CityDirectorySidebar } from './components/CityDirectorySidebar';
import { InteractiveMap } from './components/InteractiveMap';
import { CityInspector } from './components/CityInspector';
import { AllCitiesTable } from './components/AllCitiesTable';
import { CompareView } from './components/CompareView';
import { PollutantGuide } from './components/PollutantGuide';

const MOBILE_TABS: Array<{ id: ViewTab; label: string }> = [
  { id: 'map', label: 'Map' },
  { id: 'cities', label: 'Cities' },
  { id: 'compare', label: 'Compare' },
  { id: 'guide', label: 'Guide' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<ViewTab>('map');
  const [scope, setScope] = useState<MapScope>('india');
  const [standard, setStandard] = useState<AQIStandard>('NAQI');

  const [indiaData, setIndiaData] = useState<CityAQIData[]>([]);
  const [worldData, setWorldData] = useState<CityAQIData[]>([]);
  const [customCities, setCustomCities] = useState<CityAQIData[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCityId, setSelectedCityId] = useState<string | null>('in-delhi');
  const [comparedIds, setComparedIds] = useState<string[]>([
    'in-delhi',
    'in-mumbai',
    'in-bengaluru',
    'in-kolkata',
  ]);
  const [recenterNonce, setRecenterNonce] = useState(0);

  const allCities = useMemo(() => {
    const map = new Map<string, CityAQIData>();
    for (const c of indiaData) map.set(c.id, c);
    for (const c of worldData) map.set(c.id, c);
    for (const c of customCities) map.set(c.id, c);
    return Array.from(map.values());
  }, [indiaData, worldData, customCities]);

  const selectedCity = useMemo(() => {
    return allCities.find((c) => c.id === selectedCityId) ?? allCities[0] ?? null;
  }, [allCities, selectedCityId]);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Prioritize India stations first so India map hydrates immediately
      const indiaRes = await fetchBatchCityAQI(INDIA_CITIES);
      setIndiaData(indiaRes);

      // Hydrate global cities for instant World Map expansion
      const worldRes = await fetchBatchCityAQI(WORLD_CITIES);
      setWorldData(worldRes);

      // Refresh any user-added custom cities as well
      setCustomCities((prev) => {
        if (prev.length === 0) return prev;
        fetchBatchCityAQI(prev).then((updated) => setCustomCities(updated)).catch(() => {});
        return prev;
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? `Unable to sync live air quality data (${err.message}).`
          : 'Unable to sync live air quality data.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const handleSelectCity = useCallback((city: CityAQIData) => {
    setSelectedCityId(city.id);
    if (!city.isIndia) {
      setScope('world');
    }
  }, []);

  const handleInspectCityOnMap = useCallback((city: CityAQIData) => {
    setSelectedCityId(city.id);
    if (!city.isIndia) {
      setScope('world');
    }
    setActiveTab('map');
    setRecenterNonce((n) => n + 1);
  }, []);

  const handleToggleScope = useCallback(() => {
    setScope((prev) => {
      const next = prev === 'india' ? 'world' : 'india';
      if (next === 'india' && selectedCity && !selectedCity.isIndia) {
        setSelectedCityId('in-delhi');
      }
      return next;
    });
    if (activeTab !== 'map' && activeTab !== 'cities') {
      setActiveTab('map');
    }
  }, [activeTab, selectedCity]);

  const handleChangeScope = useCallback(
    (next: MapScope) => {
      setScope(next);
      if (next === 'india' && selectedCity && !selectedCity.isIndia) {
        setSelectedCityId('in-delhi');
      }
    },
    [selectedCity]
  );

  const handleAddCustomCity = useCallback(async (coord: CityCoord) => {
    const [fetched] = await fetchBatchCityAQI([coord]);
    if (!fetched) return;
    setCustomCities((prev) => {
      const exists = prev.some((c) => c.id === fetched.id);
      return exists ? prev.map((c) => (c.id === fetched.id ? fetched : c)) : [fetched, ...prev];
    });
    setSelectedCityId(fetched.id);
    if (!fetched.isIndia) {
      setScope('world');
    }
    setRecenterNonce((n) => n + 1);
  }, []);

  const handleToggleCompare = useCallback((cityId: string) => {
    setComparedIds((prev) => {
      if (prev.includes(cityId)) {
        return prev.filter((id) => id !== cityId);
      }
      if (prev.length >= 4) {
        return [...prev.slice(1), cityId];
      }
      return [...prev, cityId];
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        scope={scope}
        onToggleScope={handleToggleScope}
      />

      {/* Compact Mobile Navigation Strip */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-1 overflow-x-auto">
        {MOBILE_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
              activeTab === t.id
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Live Network Error Banner (if initial fetch failed) */}
      {error && (
        <div className="bg-rose-50 border-b border-rose-200 px-6 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-medium text-rose-800">
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={loadAllData}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-rose-700 text-white rounded-md hover:bg-rose-800 whitespace-nowrap shrink-0"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry Sync</span>
          </button>
        </div>
      )}

      {/* Active Workspace Viewport */}
      <main className="flex-1">
        {activeTab === 'map' && (
          <div className="flex flex-col lg:flex-row">
            <CityDirectorySidebar
              cities={allCities}
              scope={scope}
              standard={standard}
              selectedCityId={selectedCity?.id ?? null}
              loading={loading}
              onSelectCity={handleSelectCity}
              onChangeScope={handleChangeScope}
              onChangeStandard={setStandard}
              onAddCustomCity={handleAddCustomCity}
            />

            <InteractiveMap
              cities={allCities}
              scope={scope}
              standard={standard}
              selectedCity={selectedCity}
              loading={loading}
              recenterNonce={recenterNonce}
              onSelectCity={handleSelectCity}
              onChangeScope={handleChangeScope}
              onRefreshData={loadAllData}
            />

            <CityInspector
              city={selectedCity}
              standard={standard}
              comparedIds={comparedIds}
              onToggleCompare={handleToggleCompare}
              onRecenterMap={() => setRecenterNonce((n) => n + 1)}
            />
          </div>
        )}

        {activeTab === 'cities' && (
          <AllCitiesTable
            cities={allCities}
            scope={scope}
            standard={standard}
            onChangeScope={handleChangeScope}
            onChangeStandard={setStandard}
            onInspectCityOnMap={handleInspectCityOnMap}
          />
        )}

        {activeTab === 'compare' && (
          <CompareView
            allCities={allCities}
            comparedIds={comparedIds}
            standard={standard}
            onAddCompareCity={(id) =>
              setComparedIds((prev) => (prev.length < 4 && !prev.includes(id) ? [...prev, id] : prev))
            }
            onRemoveCompareCity={(id) =>
              setComparedIds((prev) => prev.filter((item) => item !== id))
            }
            onChangeStandard={setStandard}
          />
        )}

        {activeTab === 'guide' && <PollutantGuide />}
      </main>
    </div>
  );
}
