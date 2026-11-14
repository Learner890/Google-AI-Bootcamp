import React, { useMemo, useState } from 'react';
import { Crosshair, GitCompareArrows, ShieldAlert, X } from 'lucide-react';
import { AQIStandard, CityAQIData } from '../types/aqi';
import { getAQICategory, WHO_GUIDELINES } from '../utils/aqiCalculator';

interface CityInspectorProps {
  city: CityAQIData | null;
  standard: AQIStandard;
  comparedIds: string[];
  onToggleCompare: (cityId: string) => void;
  onRecenterMap: () => void;
  onCloseMobile?: () => void;
}

export const CityInspector: React.FC<CityInspectorProps> = ({
  city,
  standard,
  comparedIds,
  onToggleCompare,
  onRecenterMap,
  onCloseMobile,
}) => {
  const [hoverHourIndex, setHoverHourIndex] = useState<number | null>(null);

  const chartData = useMemo(() => {
    if (!city || city.hourly.length === 0) return [];
    // Slice next 36 hours for crisp trajectory readability
    return city.hourly.slice(0, 36);
  }, [city]);

  if (!city) {
    return (
      <aside className="w-full xl:w-[390px] shrink-0 bg-white border-t xl:border-t-0 xl:border-l border-slate-200 p-6 flex items-center justify-center text-center">
        <div className="space-y-2 max-w-xs">
          <p className="text-sm font-semibold text-slate-900">Select a city station</p>
          <p className="text-xs text-slate-500">
            Click any marker on the map or choose a city from the directory to inspect live pollutants and 36-hour forecasts.
          </p>
        </div>
      </aside>
    );
  }

  const primaryVal = standard === 'NAQI' ? city.naqi : city.usAqi;
  const secondaryVal = standard === 'NAQI' ? city.usAqi : city.naqi;
  const secondaryLabel = standard === 'NAQI' ? 'US AQI' : 'India NAQI';
  const cat = getAQICategory(primaryVal, standard);
  const isCompared = comparedIds.includes(city.id);

  const pollutantCards = [
    { key: 'pm2_5' as const, value: city.pollutants.pm2_5, ...WHO_GUIDELINES.pm2_5 },
    { key: 'pm10' as const, value: city.pollutants.pm10, ...WHO_GUIDELINES.pm10 },
    { key: 'nitrogen_dioxide' as const, value: city.pollutants.nitrogen_dioxide, ...WHO_GUIDELINES.nitrogen_dioxide },
    { key: 'sulphur_dioxide' as const, value: city.pollutants.sulphur_dioxide, ...WHO_GUIDELINES.sulphur_dioxide },
    { key: 'ozone' as const, value: city.pollutants.ozone, ...WHO_GUIDELINES.ozone },
    { key: 'carbon_monoxide' as const, value: city.pollutants.carbon_monoxide, ...WHO_GUIDELINES.carbon_monoxide },
  ];

  // SVG Chart Geometry
  const chartW = 330;
  const chartH = 110;
  const padL = 28;
  const padR = 8;
  const padT = 10;
  const padB = 20;
  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;

  const seriesValues = chartData.map((pt) => (standard === 'NAQI' ? pt.naqi : pt.us_aqi));
  const maxY = Math.max(100, ...seriesValues) * 1.12;
  const minY = 0;

  const polylinePoints = chartData
    .map((pt, i) => {
      const x = padL + (i / Math.max(1, chartData.length - 1)) * innerW;
      const val = standard === 'NAQI' ? pt.naqi : pt.us_aqi;
      const y = padT + innerH - ((val - minY) / (maxY - minY)) * innerH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const areaPath =
    chartData.length > 1
      ? `M ${padL},${padT + innerH} L ${polylinePoints} L ${padL + innerW},${padT + innerH} Z`
      : '';

  const hoveredPoint = hoverHourIndex !== null ? chartData[hoverHourIndex] : null;
  const hoveredX =
    hoverHourIndex !== null && chartData.length > 1
      ? padL + (hoverHourIndex / (chartData.length - 1)) * innerW
      : 0;
  const hoveredVal = hoveredPoint
    ? standard === 'NAQI'
      ? hoveredPoint.naqi
      : hoveredPoint.us_aqi
    : 0;
  const hoveredY =
    hoveredPoint && chartData.length > 1
      ? padT + innerH - ((hoveredVal - minY) / (maxY - minY)) * innerH
      : 0;

  const formattedUpdatedTime = (() => {
    try {
      const d = new Date(city.updatedAt);
      if (Number.isNaN(d.getTime())) return city.updatedAt;
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return city.updatedAt;
    }
  })();

  return (
    <aside className="w-full xl:w-[395px] shrink-0 bg-white border-t xl:border-t-0 xl:border-l border-slate-200 flex flex-col xl:h-[calc(100vh-4rem)] overflow-y-auto">
      {/* City Header */}
      <div className="p-5 border-b border-slate-200">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-bold text-slate-900 truncate">
              {city.name}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {city.state} · {city.country} ·{' '}
              <span className="font-mono tabular-nums">
                {city.lat.toFixed(2)}°, {city.lon.toFixed(2)}°
              </span>
            </p>
          </div>
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close city panel"
              className="xl:hidden p-1.5 text-slate-400 hover:text-slate-700 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Action Row */}
        <div className="flex items-center gap-2 mt-3.5">
          <button
            type="button"
            onClick={onRecenterMap}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-md transition-colors whitespace-nowrap"
          >
            <Crosshair className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Focus on Map</span>
          </button>
          <button
            type="button"
            onClick={() => onToggleCompare(city.id)}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              isCompared
                ? 'bg-slate-900 text-white hover:bg-slate-800'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
            }`}
          >
            <GitCompareArrows className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{isCompared ? 'In Comparison' : 'Add to Compare'}</span>
          </button>
        </div>
      </div>

      {/* Primary AQI Telemetry Readout */}
      <div className="p-5 border-b border-slate-200 space-y-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-xs font-medium text-slate-500">
              {standard === 'NAQI' ? 'India CPCB NAQI' : 'US EPA AQI'}
            </div>
            <div className="flex items-baseline gap-2.5 mt-1">
              <span className="font-mono text-4xl font-bold tracking-tight text-slate-900 tabular-nums">
                {primaryVal}
              </span>
              <span className={`text-sm font-semibold ${cat.textClass} flex items-center gap-1.5`}>
                <span
                  className="w-2.5 h-2.5 rounded-xs inline-block"
                  style={{ backgroundColor: cat.color }}
                  aria-hidden="true"
                />
                {cat.label}
              </span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[11px] text-slate-500">{secondaryLabel}</div>
            <div className="font-mono text-base font-semibold text-slate-800 tabular-nums">
              {secondaryVal}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span>
            Dominant: <strong className="text-slate-800 font-semibold">{city.dominantPollutant}</strong>
          </span>
          <span className="font-mono tabular-nums">Updated {formattedUpdatedTime}</span>
        </div>

        {/* Health Advisory */}
        <div className={`rounded-lg border p-3 ${cat.bgClass} ${cat.borderClass}`}>
          <div className="flex items-start gap-2">
            <ShieldAlert className={`w-4 h-4 shrink-0 mt-0.5 ${cat.textClass}`} aria-hidden="true" />
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-800 leading-relaxed">{cat.advisory}</p>
              <p className="text-[11px] text-slate-600">{cat.sensitiveGroupNote}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 6-Pollutant Telemetry Grid */}
      <div className="p-5 border-b border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-900">Criteria Pollutants</h3>
          <span className="text-[11px] text-slate-500">vs. WHO 24h Guideline</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {pollutantCards.map((p) => {
            const ratio = Math.min(100, Math.round((p.value / p.limit24h) * 100));
            const exceeds = p.value > p.limit24h;
            return (
              <div
                key={p.key}
                className="border border-slate-200 rounded-lg p-2.5 bg-slate-50/50 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">{p.label}</span>
                  <span className="text-[10px] font-mono text-slate-400">
                    WHO {p.limit24h}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-mono text-base font-bold text-slate-900 tabular-nums">
                    {p.value}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">{p.unit}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      exceeds ? 'bg-orange-500' : 'bg-emerald-600'
                    }`}
                    style={{ width: `${Math.max(4, ratio)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 36-Hour Forecast Trajectory Chart */}
      <div className="p-5 space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-900">36-Hour AQI Trajectory</h3>
          {hoveredPoint ? (
            <span className="font-mono text-[11px] font-semibold text-sky-700 tabular-nums">
              {new Date(hoveredPoint.time).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              · AQI {hoveredVal} · PM₂.₅ {hoveredPoint.pm2_5}
            </span>
          ) : (
            <span className="text-[11px] text-slate-400">Hover chart to inspect</span>
          )}
        </div>

        {chartData.length > 1 ? (
          <div className="border border-slate-200 rounded-lg p-2 bg-slate-50/40">
            <svg
              viewBox={`0 0 ${chartW} ${chartH}`}
              className="w-full h-28 overflow-visible"
              onMouseLeave={() => setHoverHourIndex(null)}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const relX = ((e.clientX - rect.left) / rect.width) * chartW;
                const clamped = Math.max(padL, Math.min(padL + innerW, relX));
                const idx = Math.round(((clamped - padL) / innerW) * (chartData.length - 1));
                setHoverHourIndex(idx);
              }}
            >
              {/* Horizontal reference lines */}
              {[0, 0.5, 1].map((frac, i) => {
                const y = padT + innerH * (1 - frac);
                const labelVal = Math.round(minY + (maxY - minY) * frac);
                return (
                  <g key={i}>
                    <line
                      x1={padL}
                      x2={padL + innerW}
                      y1={y}
                      y2={y}
                      stroke="#E2E8F0"
                      strokeDasharray="2 2"
                    />
                    <text
                      x={padL - 4}
                      y={y + 3}
                      textAnchor="end"
                      fontSize="8.5"
                      fontFamily="JetBrains Mono, monospace"
                      fill="#64748B"
                    >
                      {labelVal}
                    </text>
                  </g>
                );
              })}

              {/* Area Fill */}
              <path d={areaPath} fill={cat.color} fillOpacity={0.14} />

              {/* Line */}
              <polyline
                fill="none"
                stroke={cat.color}
                strokeWidth="2"
                strokeLinejoin="round"
                points={polylinePoints}
              />

              {/* Crosshair */}
              {hoveredPoint && (
                <g>
                  <line
                    x1={hoveredX}
                    x2={hoveredX}
                    y1={padT}
                    y2={padT + innerH}
                    stroke="#0F172A"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                  <circle
                    cx={hoveredX}
                    cy={hoveredY}
                    r="3.5"
                    fill={cat.color}
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                  />
                </g>
              )}

              {/* X-axis start/mid/end labels */}
              {[0, Math.floor(chartData.length / 2), chartData.length - 1].map((idx) => {
                const pt = chartData[idx];
                if (!pt) return null;
                const x = padL + (idx / Math.max(1, chartData.length - 1)) * innerW;
                const d = new Date(pt.time);
                const lbl = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return (
                  <text
                    key={idx}
                    x={x}
                    y={chartH - 4}
                    textAnchor={idx === 0 ? 'start' : idx === chartData.length - 1 ? 'end' : 'middle'}
                    fontSize="8.5"
                    fontFamily="JetBrains Mono, monospace"
                    fill="#64748B"
                  >
                    {lbl}
                  </text>
                );
              })}
            </svg>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg p-4 text-center text-xs text-slate-500">
            Hourly forecast unavailable for this station.
          </div>
        )}
      </div>
    </aside>
  );
};
