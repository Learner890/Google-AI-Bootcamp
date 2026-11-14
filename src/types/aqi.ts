export type AQIStandard = 'NAQI' | 'US_AQI';

export type MapScope = 'india' | 'world';

export type ViewTab = 'map' | 'cities' | 'compare' | 'guide';

export interface CityCoord {
  id: string;
  name: string;
  state: string;
  country: string;
  countryCode: string;
  region: string;
  isIndia: boolean;
  lat: number;
  lon: number;
  tier?: 'metro' | 'major' | 'regional';
  isCustom?: boolean;
}

export interface PollutantReadings {
  pm2_5: number; // µg/m³
  pm10: number; // µg/m³
  nitrogen_dioxide: number; // µg/m³
  sulphur_dioxide: number; // µg/m³
  ozone: number; // µg/m³
  carbon_monoxide: number; // µg/m³ (displayed in mg/m³ for NAQI where appropriate)
  dust: number; // µg/m³
  aerosol_optical_depth: number;
}

export interface HourlyPoint {
  time: string;
  us_aqi: number;
  naqi: number;
  pm2_5: number;
  pm10: number;
}

export interface CityAQIData extends CityCoord {
  usAqi: number;
  europeanAqi: number;
  naqi: number;
  dominantPollutant: 'PM2.5' | 'PM10' | 'NO₂' | 'SO₂' | 'O₃' | 'CO';
  pollutants: PollutantReadings;
  hourly: HourlyPoint[];
  updatedAt: string;
  timezone: string;
}

export interface AQICategoryInfo {
  label: string;
  shortLabel: string;
  rangeLabel: string;
  color: string; // Hex color for markers/charts
  bgClass: string;
  textClass: string;
  borderClass: string;
  advisory: string;
  sensitiveGroupNote: string;
}
