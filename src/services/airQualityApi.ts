import { CityAQIData, CityCoord, HourlyPoint } from '../types/aqi';
import { calculateIndiaNAQI } from '../utils/aqiCalculator';

interface OpenMeteoAirQualityItem {
  latitude: number;
  longitude: number;
  timezone: string;
  current?: {
    time: string;
    us_aqi?: number | null;
    european_aqi?: number | null;
    pm10?: number | null;
    pm2_5?: number | null;
    carbon_monoxide?: number | null;
    nitrogen_dioxide?: number | null;
    sulphur_dioxide?: number | null;
    ozone?: number | null;
    dust?: number | null;
    aerosol_optical_depth?: number | null;
  };
  hourly?: {
    time: string[];
    us_aqi?: Array<number | null>;
    pm2_5?: Array<number | null>;
    pm10?: Array<number | null>;
  };
}

const AIR_QUALITY_ENDPOINT = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const GEOCODING_ENDPOINT = 'https://geocoding-api.open-meteo.com/v1/search';

function mapApiResponseToCity(city: CityCoord, item: OpenMeteoAirQualityItem): CityAQIData {
  const cur = item.current ?? { time: new Date().toISOString() };
  const pm2_5 = Math.max(0, Number(cur.pm2_5 ?? 0));
  const pm10 = Math.max(0, Number(cur.pm10 ?? 0));
  const nitrogen_dioxide = Math.max(0, Number(cur.nitrogen_dioxide ?? 0));
  const sulphur_dioxide = Math.max(0, Number(cur.sulphur_dioxide ?? 0));
  const ozone = Math.max(0, Number(cur.ozone ?? 0));
  const carbon_monoxide = Math.max(0, Number(cur.carbon_monoxide ?? 0));
  const dust = Math.max(0, Number(cur.dust ?? 0));
  const aerosol_optical_depth = Math.max(0, Number(cur.aerosol_optical_depth ?? 0));

  const { naqi, dominantPollutant } = calculateIndiaNAQI({
    pm2_5,
    pm10,
    nitrogen_dioxide,
    sulphur_dioxide,
    ozone,
    carbon_monoxide,
  });

  const usAqi = Math.max(1, Math.round(Number(cur.us_aqi ?? naqi)));
  const europeanAqi = Math.max(1, Math.round(Number(cur.european_aqi ?? 0)));

  const hourly: HourlyPoint[] = [];
  if (item.hourly?.time && item.hourly.time.length > 0) {
    const times = item.hourly.time;
    const usSeries = item.hourly.us_aqi ?? [];
    const pm25Series = item.hourly.pm2_5 ?? [];
    const pm10Series = item.hourly.pm10 ?? [];

    for (let i = 0; i < times.length; i++) {
      const hPm25 = Math.max(0, Number(pm25Series[i] ?? pm2_5));
      const hPm10 = Math.max(0, Number(pm10Series[i] ?? pm10));
      const hNaqi = calculateIndiaNAQI({
        pm2_5: hPm25,
        pm10: hPm10,
        nitrogen_dioxide,
        sulphur_dioxide,
        ozone,
        carbon_monoxide,
      }).naqi;

      hourly.push({
        time: times[i],
        us_aqi: Math.max(1, Math.round(Number(usSeries[i] ?? usAqi))),
        naqi: hNaqi,
        pm2_5: Number(hPm25.toFixed(1)),
        pm10: Number(hPm10.toFixed(1)),
      });
    }
  }

  return {
    ...city,
    usAqi,
    europeanAqi,
    naqi,
    dominantPollutant,
    pollutants: {
      pm2_5: Number(pm2_5.toFixed(1)),
      pm10: Number(pm10.toFixed(1)),
      nitrogen_dioxide: Number(nitrogen_dioxide.toFixed(1)),
      sulphur_dioxide: Number(sulphur_dioxide.toFixed(1)),
      ozone: Number(ozone.toFixed(1)),
      carbon_monoxide: Math.round(carbon_monoxide),
      dust: Number(dust.toFixed(1)),
      aerosol_optical_depth: Number(aerosol_optical_depth.toFixed(2)),
    },
    hourly,
    updatedAt: cur.time,
    timezone: item.timezone || 'UTC',
  };
}

export async function fetchBatchCityAQI(cities: CityCoord[]): Promise<CityAQIData[]> {
  if (cities.length === 0) return [];

  const CHUNK_SIZE = 30;
  const chunks: CityCoord[][] = [];
  for (let i = 0; i < cities.length; i += CHUNK_SIZE) {
    chunks.push(cities.slice(i, i + CHUNK_SIZE));
  }

  const results = await Promise.all(
    chunks.map(async (chunk) => {
      const lats = chunk.map((c) => c.lat.toFixed(4)).join(',');
      const lons = chunk.map((c) => c.lon.toFixed(4)).join(',');
      const params = new URLSearchParams({
        latitude: lats,
        longitude: lons,
        current:
          'us_aqi,european_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,dust,aerosol_optical_depth',
        hourly: 'us_aqi,pm2_5,pm10',
        forecast_days: '2',
        timezone: 'auto',
      });

      const response = await fetch(`${AIR_QUALITY_ENDPOINT}?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Air Quality API returned HTTP ${response.status}`);
      }
      const json = await response.json();
      const items: OpenMeteoAirQualityItem[] = Array.isArray(json) ? json : [json];

      return chunk.map((city, idx) => mapApiResponseToCity(city, items[idx] ?? items[0]));
    })
  );

  return results.flat();
}

export interface GeocodingMatch {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  country_code: string;
  admin1?: string;
}

export async function searchLiveCityLocation(query: string): Promise<CityCoord[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const params = new URLSearchParams({
    name: trimmed,
    count: '6',
    language: 'en',
    format: 'json',
  });

  const response = await fetch(`${GEOCODING_ENDPOINT}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Geocoding failed with HTTP ${response.status}`);
  }
  const data = await response.json();
  const matches: GeocodingMatch[] = data.results ?? [];

  return matches.map((m) => ({
    id: `custom-${m.id}`,
    name: m.name,
    state: m.admin1 || m.country,
    country: m.country || 'Unknown',
    countryCode: m.country_code || '',
    region: m.country_code === 'IN' ? 'India' : 'Global',
    isIndia: m.country_code === 'IN',
    lat: m.latitude,
    lon: m.longitude,
    tier: 'regional',
    isCustom: true,
  }));
}
