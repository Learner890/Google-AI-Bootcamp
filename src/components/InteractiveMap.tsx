import React, { useEffect, useMemo, useRef, useState } from 'react';
import { geoGraticule10, geoMercator, geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { FeatureCollection, Geometry } from 'geojson';
import worldAtlas from 'world-atlas/countries-50m.json';
import { Compass, Globe, LocateFixed, MapPin, Minus, Plus, RefreshCw, Tag } from 'lucide-react';
import { AQIStandard, CityAQIData, MapScope } from '../types/aqi';
import { getAQICategory, NAQI_SCALE_TIERS, US_AQI_SCALE_TIERS } from '../utils/aqiCalculator';

interface InteractiveMapProps {
  cities: CityAQIData[];
  scope: MapScope;
  standard: AQIStandard;
  selectedCity: CityAQIData | null;
  loading: boolean;
  recenterNonce: number;
  onSelectCity: (city: CityAQIData) => void;
  onChangeScope: (scope: MapScope) => void;
  onRefreshData: () => void;
}

const SVG_WIDTH = 1000;
const SVG_HEIGHT = 620;

// Anchor labels shown at 1x zoom to avoid label collision while keeping geography legible
const INDIA_ANCHOR_IDS = new Set([
  'in-delhi',
  'in-mumbai',
  'in-bengaluru',
  'in-chennai',
  'in-kolkata',
  'in-hyderabad',
  'in-ahmedabad',
  'in-jaipur',
  'in-lucknow',
  'in-patna',
  'in-bhopal',
  'in-guwahati',
  'in-srinagar',
  'in-leh',
  'in-kochi',
  'in-bhubaneswar',
  'in-chandigarh',
  'in-visakhapatnam',
  'in-nagpur',
  'in-port-blair',
]);

const WORLD_ANCHOR_IDS = new Set([
  'in-delhi',
  'in-mumbai',
  'in-bengaluru',
  'wd-tokyo',
  'wd-beijing',
  'wd-singapore',
  'wd-dubai',
  'wd-london',
  'wd-paris',
  'wd-newyork',
  'wd-losangeles',
  'wd-mexicocity',
  'wd-saopaulo',
  'wd-cairo',
  'wd-nairobi',
  'wd-johannesburg',
  'wd-sydney',
  'wd-moscow',
]);

interface CountryProps {
  name?: string;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  cities,
  scope,
  standard,
  selectedCity,
  loading,
  recenterNonce,
  onSelectCity,
  onChangeScope,
  onRefreshData,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number; panX: number; panY: number } | null>(null);
  const didDragRef = useRef(false);

  const [hoveredCity, setHoveredCity] = useState<CityAQIData | null>(null);
  const [showLabels, setShowLabels] = useState(true);

  // Parse TopoJSON countries once
  const geoData = useMemo(() => {
    const topology = worldAtlas as unknown as Parameters<typeof feature>[0] & {
      objects: { countries: Parameters<typeof feature>[1] };
    };
    const countries = feature(topology, topology.objects.countries) as unknown as FeatureCollection<
      Geometry,
      CountryProps
    >;
    return countries;
  }, []);

  // Build active D3 projection
  const projection = useMemo(() => {
    if (scope === 'india') {
      return geoMercator()
        .center([82.5, 22.3])
        .scale(960)
        .translate([SVG_WIDTH / 2, SVG_HEIGHT / 2 + 8]);
    }
    return geoNaturalEarth1().fitExtent(
      [
        [16, 26],
        [SVG_WIDTH - 16, SVG_HEIGHT - 26],
      ],
      geoData
    );
  }, [scope, geoData]);

  // Precompute SVG paths whenever projection changes
  const { countryPaths, graticulePath } = useMemo(() => {
    const pathGen = geoPath(projection);
    const paths = geoData.features.map((feat, idx) => ({
      key: `${String(feat.id ?? 'country')}-${idx}`,
      id: String(feat.id ?? ''),
      name: feat.properties?.name ?? '',
      d: pathGen(feat) || '',
    }));
    const grat = pathGen(geoGraticule10()) || '';
    return { countryPaths: paths, graticulePath: grat };
  }, [projection, geoData]);

  // Reset pan/zoom when scope switches
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [scope]);

  // Center map on selected city when recenter button is triggered
  useEffect(() => {
    if (recenterNonce === 0 || !selectedCity) return;
    const coords = projection([selectedCity.lon, selectedCity.lat]);
    if (!coords) return;
    const targetZoom = scope === 'world' ? 3.2 : 2.4;
    setZoom(targetZoom);
    setPan({
      x: SVG_WIDTH / 2 - coords[0],
      y: SVG_HEIGHT / 2 - coords[1],
    });
  }, [recenterNonce, selectedCity, projection, scope]);

  // Visible cities in current scope, sorted so metro & selected markers render on top
  const projectedCities = useMemo(() => {
    const list = scope === 'india' ? cities.filter((c) => c.isIndia) : cities;
    const projected = list
      .map((city) => {
        const pt = projection([city.lon, city.lat]);
        if (!pt) return null;
        return {
          city,
          x: pt[0],
          y: pt[1],
        };
      })
      .filter((item): item is { city: CityAQIData; x: number; y: number } => item !== null);

    // Draw regional first, major next, metro next, hovered/selected last
    projected.sort((a, b) => {
      const weight = (c: CityAQIData) => {
        if (c.id === selectedCity?.id) return 100;
        if (c.id === hoveredCity?.id) return 90;
        if (c.tier === 'metro') return 30;
        if (c.tier === 'major') return 20;
        return 10;
      };
      return weight(a.city) - weight(b.city);
    });

    return projected;
  }, [cities, scope, projection, selectedCity?.id, hoveredCity?.id]);

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    setDragging(true);
    didDragRef.current = false;
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging || !dragStartRef.current || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = SVG_WIDTH / Math.max(1, rect.width);
    const scaleY = SVG_HEIGHT / Math.max(1, rect.height);
    const dxPx = e.clientX - dragStartRef.current.clientX;
    const dyPx = e.clientY - dragStartRef.current.clientY;

    if (Math.abs(dxPx) > 3 || Math.abs(dyPx) > 3) {
      didDragRef.current = true;
    }

    const dxSvg = (dxPx * scaleX) / zoom;
    const dySvg = (dyPx * scaleY) / zoom;

    setPan({
      x: Math.max(-480, Math.min(480, dragStartRef.current.panX + dxSvg)),
      y: Math.max(-320, Math.min(320, dragStartRef.current.panY + dySvg)),
    });
  };

  const handlePointerUp = () => {
    setDragging(false);
    dragStartRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.18 : 0.85;
    setZoom((z) => Math.max(1, Math.min(8, Number((z * factor).toFixed(2)))));
  };

  const resetCamera = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const scaleTiers = standard === 'NAQI' ? NAQI_SCALE_TIERS : US_AQI_SCALE_TIERS;

  const transformStr = `translate(${SVG_WIDTH / 2}, ${SVG_HEIGHT / 2}) scale(${zoom}) translate(${-SVG_WIDTH / 2 + pan.x}, ${-SVG_HEIGHT / 2 + pan.y})`;

  // Hover tooltip positioning in percentage of SVG
  const hoveredCoords = useMemo(() => {
    if (!hoveredCity) return null;
    const pt = projection([hoveredCity.lon, hoveredCity.lat]);
    if (!pt) return null;
    const tx = SVG_WIDTH / 2 + zoom * (pt[0] - SVG_WIDTH / 2 + pan.x);
    const ty = SVG_HEIGHT / 2 + zoom * (pt[1] - SVG_HEIGHT / 2 + pan.y);
    return {
      leftPct: Math.min(84, Math.max(16, (tx / SVG_WIDTH) * 100)),
      topPct: Math.min(80, Math.max(14, (ty / SVG_HEIGHT) * 100)),
    };
  }, [hoveredCity, projection, zoom, pan]);

  return (
    <div className="relative flex-1 bg-[#EBF1F6] overflow-hidden select-none min-h-[460px] lg:h-[calc(100vh-4rem)] flex flex-col">
      {/* Top-Left Map Scope HUD */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2">
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg px-3 py-2 shadow-xs flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
            {scope === 'india' ? (
              <MapPin className="w-3.5 h-3.5 text-sky-700" aria-hidden="true" />
            ) : (
              <Globe className="w-3.5 h-3.5 text-sky-700" aria-hidden="true" />
            )}
            <span>
              {scope === 'india'
                ? `India Network · ${cities.filter((c) => c.isIndia).length} Cities`
                : `Global Network · ${cities.length} Cities`}
            </span>
          </div>
          <span className="text-slate-300" aria-hidden="true">|</span>
          <button
            type="button"
            onClick={() => onChangeScope(scope === 'india' ? 'world' : 'india')}
            className="text-xs font-semibold text-sky-700 hover:text-sky-900 transition-colors whitespace-nowrap"
          >
            {scope === 'india' ? 'Expand to World Map' : 'Return to India'}
          </button>
        </div>

        <button
          type="button"
          onClick={onRefreshData}
          disabled={loading}
          title="Refresh live AQI measurements"
          className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg px-2.5 py-2 shadow-xs text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-white inline-flex items-center gap-1.5 transition-colors disabled:opacity-60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          <span className="hidden sm:inline">{loading ? 'Syncing' : 'Refresh'}</span>
        </button>
      </div>

      {/* Top-Right Zoom & Label Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5">
        <div className="bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg shadow-xs flex flex-col divide-y divide-slate-200">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(8, Number((z * 1.35).toFixed(2))))}
            aria-label="Zoom in"
            title="Zoom in"
            className="p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-t-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(1, Number((z / 1.35).toFixed(2))))}
            aria-label="Zoom out"
            title="Zoom out"
            className="p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={resetCamera}
            aria-label="Reset map view"
            title="Reset map view"
            className="p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors"
          >
            <LocateFixed className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setShowLabels((s) => !s)}
            aria-label="Toggle city labels"
            title={showLabels ? 'Hide city labels' : 'Show city labels'}
            className={`p-2 rounded-b-lg transition-colors ${
              showLabels ? 'text-sky-700 bg-sky-50/70' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Tag className="w-4 h-4" />
          </button>
        </div>
        <div className="bg-white/90 border border-slate-200 rounded-md px-2 py-1 text-[10px] font-mono text-slate-600 text-center tabular-nums">
          {zoom.toFixed(1)}×
        </div>
      </div>

      {/* Main Cartographic SVG */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
        className={`w-full h-full touch-none ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        role="img"
        aria-label={
          scope === 'india'
            ? 'Interactive Air Quality Index map of India'
            : 'Interactive global Air Quality Index world map'
        }
      >
        <rect x={0} y={0} width={SVG_WIDTH} height={SVG_HEIGHT} fill="#E9EFF5" />

        <g transform={transformStr}>
          {/* Graticule Lat/Lon Lines */}
          <path
            d={graticulePath}
            fill="none"
            stroke="#DCE5EE"
            strokeWidth={0.7 / zoom}
            strokeDasharray={scope === 'india' ? `${3 / zoom} ${3 / zoom}` : undefined}
          />

          {/* Countries Landmasses */}
          <g>
            {countryPaths.map((country) => {
              const isIndiaPolygon = country.id === '356' || country.name === 'India';
              const fillColor =
                scope === 'india'
                  ? isIndiaPolygon
                    ? '#FFFFFF'
                    : '#F3F6FA'
                  : isIndiaPolygon
                    ? '#F0F7FF'
                    : '#FFFFFF';
              const strokeColor = isIndiaPolygon ? '#64748B' : '#CBD5E1';
              const strokeW = isIndiaPolygon ? 1.1 / zoom : 0.65 / zoom;

              return (
                <path
                  key={country.key}
                  d={country.d}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={strokeW}
                  strokeLinejoin="round"
                />
              );
            })}
          </g>

          {/* City AQI Markers */}
          <g>
            {projectedCities.map(({ city, x, y }) => {
              const aqiVal = standard === 'NAQI' ? city.naqi : city.usAqi;
              const cat = getAQICategory(aqiVal, standard);
              const isSelected = city.id === selectedCity?.id;
              const isHovered = city.id === hoveredCity?.id;

              const baseRadius =
                city.tier === 'metro' ? 11.5 : city.tier === 'major' ? 9.5 : 7.2;
              const r = (isSelected ? baseRadius + 3 : isHovered ? baseRadius + 2 : baseRadius) / Math.pow(zoom, 0.55);

              const showNumericInside =
                city.tier === 'metro' ||
                (scope === 'india' && city.tier === 'major') ||
                zoom >= 1.75 ||
                isSelected ||
                isHovered;

              const isAnchor =
                scope === 'india' ? INDIA_ANCHOR_IDS.has(city.id) : WORLD_ANCHOR_IDS.has(city.id);
              const showTextLabel =
                showLabels && (isSelected || isHovered || isAnchor || zoom >= 2.1 || city.isCustom);

              return (
                <g
                  key={city.id}
                  transform={`translate(${x}, ${y})`}
                  className="cursor-pointer"
                  onPointerEnter={() => setHoveredCity(city)}
                  onPointerLeave={() => setHoveredCity((prev) => (prev?.id === city.id ? null : prev))}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!didDragRef.current) {
                      onSelectCity(city);
                    }
                  }}
                >
                  {/* Selection Reticle */}
                  {isSelected && (
                    <circle
                      r={r + 4.5 / Math.pow(zoom, 0.55)}
                      fill="none"
                      stroke="#0F172A"
                      strokeWidth={1.6 / Math.pow(zoom, 0.55)}
                      strokeDasharray={`${3 / Math.pow(zoom, 0.55)} ${2 / Math.pow(zoom, 0.55)}`}
                    />
                  )}

                  {/* Marker Circle */}
                  <circle
                    r={r}
                    fill={cat.color}
                    stroke="#FFFFFF"
                    strokeWidth={(isSelected ? 2 : 1.3) / Math.pow(zoom, 0.55)}
                  />

                  {/* Numeric AQI inside marker */}
                  {showNumericInside && (
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="#FFFFFF"
                      fontSize={Math.max(5.5, 8.2 / Math.pow(zoom, 0.55))}
                      fontWeight="700"
                      fontFamily="JetBrains Mono, monospace"
                      pointerEvents="none"
                    >
                      {aqiVal}
                    </text>
                  )}

                  {/* City Name Label */}
                  {showTextLabel && (
                    <text
                      y={r + 9 / Math.pow(zoom, 0.55)}
                      textAnchor="middle"
                      fill="#0F172A"
                      stroke="#FFFFFF"
                      strokeWidth={2.5 / Math.pow(zoom, 0.55)}
                      paintOrder="stroke"
                      fontSize={Math.max(5.5, (isSelected ? 10 : 8.5) / Math.pow(zoom, 0.55))}
                      fontWeight={isSelected ? '700' : '600'}
                      fontFamily="DM Sans, sans-serif"
                      pointerEvents="none"
                    >
                      {city.name}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      {/* Hover Tooltip */}
      {hoveredCity && hoveredCoords && (
        <div
          style={{
            left: `${hoveredCoords.leftPct}%`,
            top: `${hoveredCoords.topPct}%`,
          }}
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-[calc(100%+14px)] bg-white border border-slate-200 rounded-lg shadow-md px-3 py-2 min-w-[185px]"
        >
          {(() => {
            const val = standard === 'NAQI' ? hoveredCity.naqi : hoveredCity.usAqi;
            const cat = getAQICategory(val, standard);
            return (
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-slate-900">{hoveredCity.name}</span>
                  <span className="font-mono text-xs font-bold text-slate-900 tabular-nums">
                    {val}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  {hoveredCity.state} · {hoveredCity.country}
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                  <span className={`font-semibold ${cat.textClass}`}>{cat.label}</span>
                  <span className="font-mono text-slate-600 tabular-nums">
                    PM₂.₅ {hoveredCity.pollutants.pm2_5} µg/m³
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Bottom-Left AQI Scale Legend */}
      <div className="absolute bottom-4 left-4 right-4 sm:right-auto z-10 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-lg px-3 py-2 shadow-xs">
        <div className="flex items-center justify-between gap-4 mb-1.5">
          <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
            <span>{standard === 'NAQI' ? 'India CPCB NAQI Scale' : 'US EPA AQI Scale'}</span>
          </span>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Scroll to zoom · Drag to pan
          </span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {scaleTiers.map((tier) => (
            <div key={tier.label} className="flex items-center gap-1.5 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-xs shrink-0"
                style={{ backgroundColor: tier.color }}
                aria-hidden="true"
              />
              <div className="leading-tight min-w-0">
                <div className="text-[10px] font-semibold text-slate-800 truncate">{tier.label}</div>
                <div className="text-[10px] font-mono text-slate-500 tabular-nums">{tier.range}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
