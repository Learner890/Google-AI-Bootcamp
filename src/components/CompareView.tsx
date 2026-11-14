import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { AQIStandard, CityAQIData } from '../types/aqi';
import { getAQICategory } from '../utils/aqiCalculator';

interface CompareViewProps {
  allCities: CityAQIData[];
  comparedIds: string[];
  standard: AQIStandard;
  onAddCompareCity: (cityId: string) => void;
  onRemoveCompareCity: (cityId: string) => void;
  onChangeStandard: (std: AQIStandard) => void;
}

const LINE_COLORS = ['#0284C7', '#DC2626', '#16A34A', '#9333EA'];

export const CompareView: React.FC<CompareViewProps> = ({
  allCities,
  comparedIds,
  standard,
  onAddCompareCity,
  onRemoveCompareCity,
  onChangeStandard,
}) => {
  const comparedCities = comparedIds
    .map((id) => allCities.find((c) => c.id === id))
    .filter((c): c is CityAQIData => Boolean(c));

  const availableCities = allCities.filter((c) => !comparedIds.includes(c.id));

  // Chart dimensions
  const w = 720;
  const h = 220;
  const padL = 40;
  const padR = 16;
  const padT = 16;
  const padB = 26;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  const maxSeriesVal = Math.max(
    120,
    ...comparedCities.flatMap((c) =>
      c.hourly.slice(0, 36).map((pt) => (standard === 'NAQI' ? pt.naqi : pt.us_aqi))
    )
  );

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Multi-City Air Quality Comparison
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Compare Indian hubs side-by-side or benchmark against major global cities (up to 4 stations).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex p-0.5 bg-slate-200/70 rounded-lg">
            <button
              type="button"
              onClick={() => onChangeStandard('NAQI')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                standard === 'NAQI' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              India NAQI
            </button>
            <button
              type="button"
              onClick={() => onChangeStandard('US_AQI')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                standard === 'US_AQI' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              US AQI
            </button>
          </div>

          {comparedCities.length < 4 && availableCities.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-slate-500" />
              <select
                aria-label="Add city to comparison"
                value=""
                onChange={(e) => {
                  if (e.target.value) onAddCompareCity(e.target.value);
                }}
                className="text-xs font-medium bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-slate-400"
              >
                <option value="">Add city to compare...</option>
                <optgroup label="India">
                  {availableCities
                    .filter((c) => c.isIndia)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.state})
                      </option>
                    ))}
                </optgroup>
                <optgroup label="World">
                  {availableCities
                    .filter((c) => !c.isIndia)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.country})
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>
          )}
        </div>
      </div>

      {comparedCities.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
          <p className="text-base font-semibold text-slate-900">No cities selected for comparison</p>
          <p className="text-sm text-slate-500">
            Choose cities from the dropdown above or click &ldquo;Add to Compare&rdquo; from any city inspector.
          </p>
        </div>
      ) : (
        <>
          {/* City Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {comparedCities.map((city, idx) => {
              const val = standard === 'NAQI' ? city.naqi : city.usAqi;
              const cat = getAQICategory(val, standard);
              const lineColor = LINE_COLORS[idx % LINE_COLORS.length];

              return (
                <div key={city.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: lineColor }}
                        />
                        <h3 className="font-display font-bold text-slate-900 truncate">{city.name}</h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {city.state} · {city.country}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveCompareCity(city.id)}
                      aria-label={`Remove ${city.name}`}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-baseline justify-between pt-1">
                    <span className="font-mono text-3xl font-bold text-slate-900 tabular-nums">
                      {val}
                    </span>
                    <span className={`text-xs font-semibold ${cat.textClass}`}>{cat.label}</span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">PM₂.₅</span>
                      <span className="font-mono font-medium text-slate-800 tabular-nums">
                        {city.pollutants.pm2_5} µg/m³
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">PM₁₀</span>
                      <span className="font-mono font-medium text-slate-800 tabular-nums">
                        {city.pollutants.pm10} µg/m³
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">NO₂</span>
                      <span className="font-mono font-medium text-slate-800 tabular-nums">
                        {city.pollutants.nitrogen_dioxide} µg/m³
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">O₃</span>
                      <span className="font-mono font-medium text-slate-800 tabular-nums">
                        {city.pollutants.ozone} µg/m³
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 36-Hour Overlay Trajectory Chart */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900">
                  36-Hour Comparative AQI Trajectory
                </h2>
                <p className="text-xs text-slate-500">
                  Forecasted {standard === 'NAQI' ? 'India NAQI' : 'US EPA AQI'} across selected stations
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                {comparedCities.map((c, idx) => (
                  <div key={c.id} className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                    <span
                      className="w-3 h-1 rounded-full"
                      style={{ backgroundColor: LINE_COLORS[idx % LINE_COLORS.length] }}
                    />
                    <span>{c.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-56 overflow-visible">
              {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
                const y = padT + innerH * (1 - frac);
                const val = Math.round(maxSeriesVal * frac);
                return (
                  <g key={i}>
                    <line
                      x1={padL}
                      x2={padL + innerW}
                      y1={y}
                      y2={y}
                      stroke="#E2E8F0"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={padL - 8}
                      y={y + 3}
                      textAnchor="end"
                      fontSize="10"
                      fontFamily="JetBrains Mono, monospace"
                      fill="#64748B"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {comparedCities.map((city, cIdx) => {
                const series = city.hourly.slice(0, 36);
                if (series.length < 2) return null;
                const pts = series
                  .map((pt, i) => {
                    const x = padL + (i / (series.length - 1)) * innerW;
                    const v = standard === 'NAQI' ? pt.naqi : pt.us_aqi;
                    const y = padT + innerH - (v / maxSeriesVal) * innerH;
                    return `${x.toFixed(1)},${y.toFixed(1)}`;
                  })
                  .join(' ');
                return (
                  <polyline
                    key={city.id}
                    fill="none"
                    stroke={LINE_COLORS[cIdx % LINE_COLORS.length]}
                    strokeWidth="2.2"
                    strokeLinejoin="round"
                    points={pts}
                  />
                );
              })}

              {comparedCities[0]?.hourly.slice(0, 36).length > 1 &&
                [0, 11, 23, 35].map((idx) => {
                  const pt = comparedCities[0].hourly[idx];
                  if (!pt) return null;
                  const x = padL + (idx / 35) * innerW;
                  const label = new Date(pt.time).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  return (
                    <text
                      key={idx}
                      x={x}
                      y={h - 6}
                      textAnchor={idx === 0 ? 'start' : idx === 35 ? 'end' : 'middle'}
                      fontSize="10"
                      fontFamily="JetBrains Mono, monospace"
                      fill="#64748B"
                    >
                      {label}
                    </text>
                  );
                })}
            </svg>
          </div>
        </>
      )}
    </div>
  );
};
