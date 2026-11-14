import React from 'react';
import { NAQI_SCALE_TIERS, US_AQI_SCALE_TIERS, WHO_GUIDELINES } from '../utils/aqiCalculator';

export const PollutantGuide: React.FC = () => {
  const pollutantDetails = [
    {
      ...WHO_GUIDELINES.pm2_5,
      sources: 'Vehicular exhaust, biomass burning, thermal power plants, secondary atmospheric reactions.',
      impact: 'Penetrates deep into lung alveoli and enters the bloodstream, elevating cardiovascular and respiratory risk.',
    },
    {
      ...WHO_GUIDELINES.pm10,
      sources: 'Road dust resuspension, construction activity, desert dust storms, industrial grinding.',
      impact: 'Irritates upper airways, nasal passages, and triggers asthma exacerbations.',
    },
    {
      ...WHO_GUIDELINES.nitrogen_dioxide,
      sources: 'Internal combustion engines, diesel traffic corridors, industrial boilers.',
      impact: 'Inflames airway linings and increases susceptibility to respiratory infections.',
    },
    {
      ...WHO_GUIDELINES.sulphur_dioxide,
      sources: 'Coal-fired power generation, oil refining, metal smelting.',
      impact: 'Causes rapid bronchoconstriction in people with asthma even on short exposure.',
    },
    {
      ...WHO_GUIDELINES.ozone,
      sources: 'Photochemical reaction of NOₓ and volatile organic compounds under strong sunlight.',
      impact: 'Reduces lung capacity, causes chest tightness, and damages lung tissue during afternoon peaks.',
    },
    {
      ...WHO_GUIDELINES.carbon_monoxide,
      sources: 'Incomplete fuel combustion in traffic congestion, indoor solid-fuel stoves, generators.',
      impact: 'Reduces oxygen delivery to vital organs by binding to hemoglobin.',
    },
  ];

  return (
    <div className="max-w-[1180px] mx-auto px-6 py-8 space-y-10">
      <div className="max-w-2xl space-y-2">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Air Quality Index Methodology &amp; Pollutant Reference
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          VayuAtlas computes India&apos;s official Central Pollution Control Board (CPCB) National Air Quality Index alongside US EPA AQI using live hourly pollutant concentrations.
        </p>
      </div>

      {/* Dual Scale Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">India CPCB NAQI Scale</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              &ldquo;One Number, One Colour, One Description&rdquo; based on maximum sub-index across criteria pollutants.
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {NAQI_SCALE_TIERS.map((tier) => (
              <div key={tier.label} className="py-2.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-xs shrink-0" style={{ backgroundColor: tier.color }} />
                  <span className="text-sm font-semibold text-slate-900">{tier.label}</span>
                </div>
                <span className="font-mono text-xs font-semibold text-slate-600 tabular-nums">
                  {tier.range}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">US EPA AQI Scale</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Widely used international benchmark enabling direct comparison between Indian and global cities.
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {US_AQI_SCALE_TIERS.map((tier) => (
              <div key={tier.label} className="py-2.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-xs shrink-0" style={{ backgroundColor: tier.color }} />
                  <span className="text-sm font-semibold text-slate-900">{tier.label}</span>
                </div>
                <span className="font-mono text-xs font-semibold text-slate-600 tabular-nums">
                  {tier.range}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Criteria Pollutants */}
      <section className="space-y-4">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900">Criteria Atmospheric Pollutants</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Measured concentrations compared against World Health Organization (WHO) 2021 24-hour guideline thresholds.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pollutantDetails.map((p) => (
            <div key={p.label} className="bg-white border border-slate-200 rounded-xl p-5 space-y-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-display text-base font-bold text-slate-900">
                  {p.label} · {p.fullName}
                </h3>
                <span className="font-mono text-xs text-slate-500 whitespace-nowrap">
                  WHO {p.limit24h} {p.unit}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong className="text-slate-800">Sources:</strong> {p.sources}
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                <strong className="text-slate-800">Health Effect:</strong> {p.impact}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
