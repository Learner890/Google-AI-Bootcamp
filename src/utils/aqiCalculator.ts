import { AQICategoryInfo, AQIStandard, PollutantReadings } from '../types/aqi';

interface Breakpoint {
  cLow: number;
  cHigh: number;
  iLow: number;
  iHigh: number;
}

// Official India CPCB National Air Quality Index (NAQI) Breakpoints
const NAQI_PM25: Breakpoint[] = [
  { cLow: 0, cHigh: 30, iLow: 0, iHigh: 50 },
  { cLow: 30.1, cHigh: 60, iLow: 51, iHigh: 100 },
  { cLow: 60.1, cHigh: 90, iLow: 101, iHigh: 200 },
  { cLow: 90.1, cHigh: 120, iLow: 201, iHigh: 300 },
  { cLow: 120.1, cHigh: 250, iLow: 301, iHigh: 400 },
  { cLow: 250.1, cHigh: 500, iLow: 401, iHigh: 500 },
];

const NAQI_PM10: Breakpoint[] = [
  { cLow: 0, cHigh: 50, iLow: 0, iHigh: 50 },
  { cLow: 50.1, cHigh: 100, iLow: 51, iHigh: 100 },
  { cLow: 100.1, cHigh: 250, iLow: 101, iHigh: 200 },
  { cLow: 250.1, cHigh: 350, iLow: 201, iHigh: 300 },
  { cLow: 350.1, cHigh: 430, iLow: 301, iHigh: 400 },
  { cLow: 430.1, cHigh: 800, iLow: 401, iHigh: 500 },
];

const NAQI_NO2: Breakpoint[] = [
  { cLow: 0, cHigh: 40, iLow: 0, iHigh: 50 },
  { cLow: 40.1, cHigh: 80, iLow: 51, iHigh: 100 },
  { cLow: 80.1, cHigh: 180, iLow: 101, iHigh: 200 },
  { cLow: 180.1, cHigh: 280, iLow: 201, iHigh: 300 },
  { cLow: 280.1, cHigh: 400, iLow: 301, iHigh: 400 },
  { cLow: 400.1, cHigh: 800, iLow: 401, iHigh: 500 },
];

const NAQI_SO2: Breakpoint[] = [
  { cLow: 0, cHigh: 40, iLow: 0, iHigh: 50 },
  { cLow: 40.1, cHigh: 80, iLow: 51, iHigh: 100 },
  { cLow: 80.1, cHigh: 380, iLow: 101, iHigh: 200 },
  { cLow: 380.1, cHigh: 800, iLow: 201, iHigh: 300 },
  { cLow: 800.1, cHigh: 1600, iLow: 301, iHigh: 400 },
  { cLow: 1600.1, cHigh: 2400, iLow: 401, iHigh: 500 },
];

const NAQI_O3: Breakpoint[] = [
  { cLow: 0, cHigh: 50, iLow: 0, iHigh: 50 },
  { cLow: 50.1, cHigh: 100, iLow: 51, iHigh: 100 },
  { cLow: 100.1, cHigh: 168, iLow: 101, iHigh: 200 },
  { cLow: 168.1, cHigh: 208, iLow: 201, iHigh: 300 },
  { cLow: 208.1, cHigh: 748, iLow: 301, iHigh: 400 },
  { cLow: 748.1, cHigh: 1200, iLow: 401, iHigh: 500 },
];

// CO in mg/m³ for CPCB NAQI
const NAQI_CO_MG: Breakpoint[] = [
  { cLow: 0, cHigh: 1.0, iLow: 0, iHigh: 50 },
  { cLow: 1.01, cHigh: 2.0, iLow: 51, iHigh: 100 },
  { cLow: 2.01, cHigh: 10, iLow: 101, iHigh: 200 },
  { cLow: 10.01, cHigh: 17, iLow: 201, iHigh: 300 },
  { cLow: 17.01, cHigh: 34, iLow: 301, iHigh: 400 },
  { cLow: 34.01, cHigh: 60, iLow: 401, iHigh: 500 },
];

function linearSubIndex(conc: number, bps: Breakpoint[]): number {
  if (!Number.isFinite(conc) || conc <= 0) return 0;
  for (const bp of bps) {
    if (conc <= bp.cHigh) {
      const ratio = (bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow);
      return Math.round(bp.iLow + ratio * Math.max(0, conc - bp.cLow));
    }
  }
  return 500;
}

export function calculateIndiaNAQI(p: Pick<PollutantReadings, 'pm2_5' | 'pm10' | 'nitrogen_dioxide' | 'sulphur_dioxide' | 'ozone' | 'carbon_monoxide'>): {
  naqi: number;
  dominantPollutant: 'PM2.5' | 'PM10' | 'NO₂' | 'SO₂' | 'O₃' | 'CO';
} {
  const candidates: Array<{ key: 'PM2.5' | 'PM10' | 'NO₂' | 'SO₂' | 'O₃' | 'CO'; val: number }> = [
    { key: 'PM2.5', val: linearSubIndex(p.pm2_5, NAQI_PM25) },
    { key: 'PM10', val: linearSubIndex(p.pm10, NAQI_PM10) },
    { key: 'NO₂', val: linearSubIndex(p.nitrogen_dioxide, NAQI_NO2) },
    { key: 'SO₂', val: linearSubIndex(p.sulphur_dioxide, NAQI_SO2) },
    { key: 'O₃', val: linearSubIndex(p.ozone, NAQI_O3) },
    { key: 'CO', val: linearSubIndex(p.carbon_monoxide / 1000, NAQI_CO_MG) },
  ];

  candidates.sort((a, b) => b.val - a.val);
  return {
    naqi: Math.max(1, candidates[0].val),
    dominantPollutant: candidates[0].key,
  };
}

export function getAQICategory(value: number, standard: AQIStandard): AQICategoryInfo {
  if (standard === 'NAQI') {
    if (value <= 50) {
      return {
        label: 'Good',
        shortLabel: 'Good',
        rangeLabel: '0–50',
        color: '#16A34A',
        bgClass: 'bg-emerald-50',
        textClass: 'text-emerald-700',
        borderClass: 'border-emerald-200',
        advisory: 'Minimal impact. Ideal conditions for outdoor exercise and open-window ventilation.',
        sensitiveGroupNote: 'Safe for all populations.',
      };
    }
    if (value <= 100) {
      return {
        label: 'Satisfactory',
        shortLabel: 'Satisfactory',
        rangeLabel: '51–100',
        color: '#65A30D',
        bgClass: 'bg-lime-50',
        textClass: 'text-lime-700',
        borderClass: 'border-lime-200',
        advisory: 'Acceptable air quality. Minor breathing discomfort possible for unusually sensitive people.',
        sensitiveGroupNote: 'Asthma patients should keep rescue inhalers handy during sustained exertion.',
      };
    }
    if (value <= 200) {
      return {
        label: 'Moderate',
        shortLabel: 'Moderate',
        rangeLabel: '101–200',
        color: '#D97706',
        bgClass: 'bg-amber-50',
        textClass: 'text-amber-700',
        borderClass: 'border-amber-200',
        advisory: 'Breathing discomfort to people with lung, asthma, and heart conditions.',
        sensitiveGroupNote: 'Children, older adults, and respiratory patients should limit prolonged outdoor exertion.',
      };
    }
    if (value <= 300) {
      return {
        label: 'Poor',
        shortLabel: 'Poor',
        rangeLabel: '201–300',
        color: '#EA580C',
        bgClass: 'bg-orange-50',
        textClass: 'text-orange-700',
        borderClass: 'border-orange-200',
        advisory: 'Breathing discomfort to most people on prolonged exposure. Wear an N95 mask outdoors.',
        sensitiveGroupNote: 'Avoid vigorous outdoor activity; run indoor HEPA filtration if available.',
      };
    }
    if (value <= 400) {
      return {
        label: 'Very Poor',
        shortLabel: 'Very Poor',
        rangeLabel: '301–400',
        color: '#DC2626',
        bgClass: 'bg-red-50',
        textClass: 'text-red-700',
        borderClass: 'border-red-200',
        advisory: 'Respiratory illness risk on prolonged exposure. Keep windows sealed and minimize transit.',
        sensitiveGroupNote: 'Sensitive groups should remain indoors and avoid all physical exertion.',
      };
    }
    return {
      label: 'Severe',
      shortLabel: 'Severe',
      rangeLabel: '401–500',
      color: '#7E22CE',
      bgClass: 'bg-purple-50',
      textClass: 'text-purple-800',
      borderClass: 'border-purple-200',
      advisory: 'Affects healthy people and seriously impacts those with existing respiratory or cardiac conditions.',
      sensitiveGroupNote: 'Emergency-grade air quality. Strictly avoid outdoor exposure.',
    };
  }

  // US EPA AQI Standard
  if (value <= 50) {
    return {
      label: 'Good',
      shortLabel: 'Good',
      rangeLabel: '0–50',
      color: '#16A34A',
      bgClass: 'bg-emerald-50',
      textClass: 'text-emerald-700',
      borderClass: 'border-emerald-200',
      advisory: 'Air quality is satisfactory and poses little or no health risk.',
      sensitiveGroupNote: 'Safe for all groups.',
    };
  }
  if (value <= 100) {
    return {
      label: 'Moderate',
      shortLabel: 'Moderate',
      rangeLabel: '51–100',
      color: '#CA8A04',
      bgClass: 'bg-yellow-50',
      textClass: 'text-yellow-800',
      borderClass: 'border-yellow-200',
      advisory: 'Acceptable air quality; moderate health concern for a very small number of sensitive individuals.',
      sensitiveGroupNote: 'Unusually sensitive individuals should consider reducing prolonged exertion.',
    };
  }
  if (value <= 150) {
    return {
      label: 'Unhealthy (Sensitive)',
      shortLabel: 'USG',
      rangeLabel: '101–150',
      color: '#EA580C',
      bgClass: 'bg-orange-50',
      textClass: 'text-orange-700',
      borderClass: 'border-orange-200',
      advisory: 'Members of sensitive groups may experience health effects; general public is less likely to be affected.',
      sensitiveGroupNote: 'Active children, seniors, and people with respiratory disease should limit outdoor exertion.',
    };
  }
  if (value <= 200) {
    return {
      label: 'Unhealthy',
      shortLabel: 'Unhealthy',
      rangeLabel: '151–200',
      color: '#DC2626',
      bgClass: 'bg-red-50',
      textClass: 'text-red-700',
      borderClass: 'border-red-200',
      advisory: 'Everyone may begin to experience health effects; sensitive groups may experience more serious effects.',
      sensitiveGroupNote: 'Everyone should reduce prolonged or heavy outdoor exertion.',
    };
  }
  if (value <= 300) {
    return {
      label: 'Very Unhealthy',
      shortLabel: 'Very Unhealthy',
      rangeLabel: '201–300',
      color: '#9333EA',
      bgClass: 'bg-purple-50',
      textClass: 'text-purple-800',
      borderClass: 'border-purple-200',
      advisory: 'Health alert: the risk of health effects is increased for everyone.',
      sensitiveGroupNote: 'Avoid all outdoor physical activities; keep indoor air filtered.',
    };
  }
  return {
    label: 'Hazardous',
    shortLabel: 'Hazardous',
    rangeLabel: '301+',
    color: '#881337',
    bgClass: 'bg-rose-50',
    textClass: 'text-rose-900',
    borderClass: 'border-rose-200',
    advisory: 'Health warning of emergency conditions: everyone is more likely to be affected.',
    sensitiveGroupNote: 'Remain indoors with windows closed and air purifiers running.',
  };
}

export const WHO_GUIDELINES = {
  pm2_5: { label: 'PM₂.₅', limit24h: 15, unit: 'µg/m³', fullName: 'Fine Particulate Matter' },
  pm10: { label: 'PM₁₀', limit24h: 45, unit: 'µg/m³', fullName: 'Coarse Particulate Matter' },
  nitrogen_dioxide: { label: 'NO₂', limit24h: 25, unit: 'µg/m³', fullName: 'Nitrogen Dioxide' },
  sulphur_dioxide: { label: 'SO₂', limit24h: 40, unit: 'µg/m³', fullName: 'Sulphur Dioxide' },
  ozone: { label: 'O₃', limit24h: 100, unit: 'µg/m³', fullName: 'Ground-Level Ozone' },
  carbon_monoxide: { label: 'CO', limit24h: 4000, unit: 'µg/m³', fullName: 'Carbon Monoxide' },
};

export const NAQI_SCALE_TIERS = [
  { label: 'Good', range: '0–50', color: '#16A34A' },
  { label: 'Satisfactory', range: '51–100', color: '#65A30D' },
  { label: 'Moderate', range: '101–200', color: '#D97706' },
  { label: 'Poor', range: '201–300', color: '#EA580C' },
  { label: 'Very Poor', range: '301–400', color: '#DC2626' },
  { label: 'Severe', range: '401–500', color: '#7E22CE' },
];

export const US_AQI_SCALE_TIERS = [
  { label: 'Good', range: '0–50', color: '#16A34A' },
  { label: 'Moderate', range: '51–100', color: '#CA8A04' },
  { label: 'USG', range: '101–150', color: '#EA580C' },
  { label: 'Unhealthy', range: '151–200', color: '#DC2626' },
  { label: 'Very Unhealthy', range: '201–300', color: '#9333EA' },
  { label: 'Hazardous', range: '301+', color: '#881337' },
];
