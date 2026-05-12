import { Region } from '@/types/project';
import { 
  WeatherData, 
  WeatherForecast, 
  WeatherCondition, 
  WeatherRiskLevel, 
  WorkSuitability,
  WeatherWarning,
  CITY_COORDINATES 
} from '@/types/weather';
import { addDays, format, parseISO } from 'date-fns';

// Open-Meteo (replaces SMHI which decommissioned the public pmp3g endpoint)
const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const OPEN_METEO_GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';

// Cache geocoded city coordinates per session to avoid extra calls
const cityCoordCache = new Map<string, { lat: number; lon: number }>();

async function geocodeCity(city: string): Promise<{ lat: number; lon: number } | null> {
  const key = city.toLowerCase();
  if (cityCoordCache.has(key)) return cityCoordCache.get(key)!;
  try {
    const url = `${OPEN_METEO_GEOCODE_URL}?name=${encodeURIComponent(city)}&count=1&language=sv&country=SE`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const hit = data?.results?.[0];
    if (!hit) return null;
    const coords = { lat: hit.latitude, lon: hit.longitude };
    cityCoordCache.set(key, coords);
    return coords;
  } catch {
    return null;
  }
}

// Function to extract city from address
function extractCityFromAddress(address: string): string {
  console.log('WEATHER DEBUG: Extracting city from address:', address);
  
  // Split by common delimiters and look for postal code pattern
  const parts = address.split(/[,\s]+/);
  console.log('WEATHER DEBUG: Address parts:', parts);
  
  // Look for 5-digit postal code followed by city name
  for (let i = 0; i < parts.length - 1; i++) {
    if (/^\d{3}\s?\d{2}$/.test(parts[i])) {
      // Found postal code, next part should be city
      const city = parts[i + 1];
      if (city && city.length > 1) {
        const extractedCity = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
        console.log('WEATHER DEBUG: Found city after postal code:', extractedCity);
        return extractedCity;
      }
    }
  }
  
  // Alternative: look for city name at the end without postal code
  const lastPart = parts[parts.length - 1];
  if (lastPart && lastPart.length > 2 && !(/^\d+$/.test(lastPart))) {
    const extractedCity = lastPart.charAt(0).toUpperCase() + lastPart.slice(1).toLowerCase();
    console.log('WEATHER DEBUG: Found city as last part:', extractedCity);
    return extractedCity;
  }
  
  // More aggressive parsing: look for any word that could be a city
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    if (part && part.length > 2 && !(/^\d+$/.test(part)) && !(/^(gatan|vägen|torget)$/i.test(part))) {
      const extractedCity = part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
      console.log('WEATHER DEBUG: Found city via aggressive parsing:', extractedCity);
      return extractedCity;
    }
  }
  
  console.log('WEATHER DEBUG: No city found, using Stockholm fallback');
  return 'Stockholm'; // Default fallback
}

// Function to find closest city coordinates
function findCityCoordinates(city: string): { lat: number; lon: number; actualCity: string } {
  // Direct match
  if (CITY_COORDINATES[city as keyof typeof CITY_COORDINATES]) {
    return {
      ...CITY_COORDINATES[city as keyof typeof CITY_COORDINATES],
      actualCity: city
    };
  }
  
  // Case insensitive search
  const cityLower = city.toLowerCase();
  for (const [knownCity, coords] of Object.entries(CITY_COORDINATES)) {
    if (knownCity.toLowerCase() === cityLower) {
      return { ...coords, actualCity: knownCity };
    }
  }
  
  // Partial match search
  for (const [knownCity, coords] of Object.entries(CITY_COORDINATES)) {
    if (knownCity.toLowerCase().includes(cityLower) || cityLower.includes(knownCity.toLowerCase())) {
      return { ...coords, actualCity: knownCity };
    }
  }
  
  // Fallback to Stockholm
  console.warn(`City '${city}' not found, using Stockholm as fallback`);
  return {
    ...CITY_COORDINATES['Stockholm'],
    actualCity: 'Stockholm (fallback)'
  };
}

export async function fetchWeatherForProject(
  regionOrAddress: Region | string, 
  startWeek?: string
): Promise<WeatherForecast | null> {
  console.log('WEATHER DEBUG: fetchWeatherForProject called with:', { regionOrAddress, startWeek });
  
  try {
    // Determine if it's an address or region
    let city: string;
    
    if (typeof regionOrAddress === 'string' && regionOrAddress.includes(' ')) {
      // It's an address, extract city
      console.log('WEATHER DEBUG: Treating as address');
      city = extractCityFromAddress(regionOrAddress);
    } else {
      // It's a region
      console.log('WEATHER DEBUG: Treating as region');
      city = regionOrAddress as string;
    }
    
    console.log('WEATHER DEBUG: Final city determined:', city);
    
    // Get coordinates: try built-in city map first, then Open-Meteo geocoding
    let { lat, lon, actualCity } = findCityCoordinates(city);
    if (actualCity.includes('(fallback)')) {
      const geo = await geocodeCity(city);
      if (geo) {
        lat = geo.lat;
        lon = geo.lon;
        actualCity = city;
        console.log('WEATHER DEBUG: Geocoded coordinates via Open-Meteo:', geo);
      }
    }
    console.log('WEATHER DEBUG: Coordinates found:', { lat, lon, actualCity });

    // Check if the requested week is in the past
    const isHistoricalWeek = isWeekInPast(startWeek);
    console.log('WEATHER DEBUG: Is historical week?', isHistoricalWeek);

    if (isHistoricalWeek) {
      return createHistoricalWeatherData(actualCity, { lat, lon }, startWeek);
    }

    // Determine date window: target week if provided & in forecast range, else next 7 days
    const targetDates = getTargetDates(startWeek);
    const start = targetDates[0];
    const end = targetDates[targetDates.length - 1];
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const maxDate = format(addDays(new Date(), 15), 'yyyy-MM-dd');
    const useTarget = start >= todayStr && end <= maxDate;

    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weathercode,relative_humidity_2m_mean',
      current: 'temperature_2m,wind_speed_10m,precipitation,relative_humidity_2m,weathercode',
      wind_speed_unit: 'ms',
      timezone: 'Europe/Stockholm',
    });
    if (useTarget) {
      params.set('start_date', start);
      params.set('end_date', end);
    } else {
      params.set('forecast_days', '7');
    }

    const url = `${OPEN_METEO_FORECAST_URL}?${params.toString()}`;
    console.log('WEATHER DEBUG: Fetching from URL:', url);

    const response = await fetch(url);
    if (!response.ok) {
      console.error('WEATHER DEBUG: Open-Meteo API error:', response.status);
      return null;
    }

    const data = await response.json();
    console.log('WEATHER DEBUG: Successfully fetched weather data');
    return processOpenMeteoData(data, actualCity, { lat, lon });
  } catch (error) {
    console.error('WEATHER DEBUG: Error fetching weather data:', error);
    return null;
  }
}

// Function to check if a week is in the past
function isWeekInPast(startWeek?: string): boolean {
  if (!startWeek) return false;
  
  let year: number;
  let week: number;
  
  if (startWeek.startsWith('v') || startWeek.startsWith('V')) {
    year = new Date().getFullYear();
    week = parseInt(startWeek.substring(1));
  } else if (startWeek.includes('-W')) {
    [year, week] = startWeek.split('-W').map(Number);
  } else {
    year = new Date().getFullYear();
    week = parseInt(startWeek);
  }
  
  const now = new Date();
  const currentWeek = getWeekNumber(now);
  const currentYear = now.getFullYear();
  
  return (year < currentYear) || (year === currentYear && week < currentWeek);
}

// Function to get current week number
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Function to create historical weather data
function createHistoricalWeatherData(
  city: string, 
  coordinates: { lat: number; lon: number }, 
  startWeek?: string
): WeatherForecast {
  const targetDates = getTargetDates(startWeek);
  
  // Create historical weather data (simplified approach)
  const forecast: WeatherData[] = targetDates.map(date => ({
    date,
    temperature: { min: 15, max: 22 }, // Generic historical temperatures
    precipitation: 0.2,
    windSpeed: 3.5,
    humidity: 65,
    conditions: 'partly-cloudy' as WeatherCondition,
    riskLevel: 'low' as WeatherRiskLevel,
    workSuitability: 'excellent' as WorkSuitability
  }));
  
  return {
    location: `${city} (historisk)`,
    region: city as any,
    coordinates,
    current: forecast[0],
    forecast,
    warnings: [],
    lastUpdated: new Date().toISOString()
  };
}

// WMO weather code → internal condition
function wmoToCondition(code: number): WeatherCondition {
  if (code === 0) return 'clear';
  if (code <= 2) return 'partly-cloudy';
  if (code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 57) return 'light-rain';
  if (code >= 61 && code <= 65) return code >= 65 ? 'heavy-rain' : 'rain';
  if (code >= 66 && code <= 67) return 'rain';
  if (code >= 71 && code <= 77) return 'snow';
  if (code >= 80 && code <= 82) return code === 82 ? 'heavy-rain' : 'rain';
  if (code >= 85 && code <= 86) return 'snow';
  if (code >= 95) return 'thunderstorm';
  return 'partly-cloudy';
}

function processOpenMeteoData(
  data: any,
  city: string,
  coordinates: { lat: number; lon: number }
): WeatherForecast {
  const daily = data?.daily ?? {};
  const dates: string[] = daily.time ?? [];
  const tMax: number[] = daily.temperature_2m_max ?? [];
  const tMin: number[] = daily.temperature_2m_min ?? [];
  const precip: number[] = daily.precipitation_sum ?? [];
  const wind: number[] = daily.wind_speed_10m_max ?? [];
  const codes: number[] = daily.weathercode ?? [];
  const hum: number[] = daily.relative_humidity_2m_mean ?? [];

  const forecast: WeatherData[] = dates.map((date, i) => {
    const conditions = wmoToCondition(codes[i] ?? 0);
    const riskLevel = calculateRiskLevel(tMax[i] ?? 0, wind[i] ?? 0, precip[i] ?? 0);
    const workSuitability = determineWorkSuitability(riskLevel, conditions);
    return {
      date,
      temperature: { min: Math.round(tMin[i] ?? 0), max: Math.round(tMax[i] ?? 0) },
      precipitation: Math.round((precip[i] ?? 0) * 10) / 10,
      windSpeed: Math.round((wind[i] ?? 0) * 10) / 10,
      humidity: Math.round(hum[i] ?? 0),
      conditions,
      riskLevel,
      workSuitability,
    };
  });

  // Current weather: use API current if today's date is within range, else first forecast day
  const cur = data?.current;
  let current: WeatherData;
  if (cur) {
    const conditions = wmoToCondition(cur.weathercode ?? 0);
    const riskLevel = calculateRiskLevel(cur.temperature_2m ?? 0, cur.wind_speed_10m ?? 0, cur.precipitation ?? 0);
    current = {
      date: (cur.time ?? '').split('T')[0] || format(new Date(), 'yyyy-MM-dd'),
      temperature: {
        min: Math.round((cur.temperature_2m ?? 0) - 2),
        max: Math.round((cur.temperature_2m ?? 0) + 2),
      },
      precipitation: Math.round((cur.precipitation ?? 0) * 10) / 10,
      windSpeed: Math.round((cur.wind_speed_10m ?? 0) * 10) / 10,
      humidity: Math.round(cur.relative_humidity_2m ?? 0),
      conditions,
      riskLevel,
      workSuitability: determineWorkSuitability(riskLevel, conditions),
    };
  } else {
    current = forecast[0];
  }

  const warnings = generateWeatherWarnings(forecast);

  return {
    location: city,
    region: city as any,
    coordinates,
    current,
    forecast: forecast.slice(0, 7),
    warnings,
    lastUpdated: new Date().toISOString(),
  };
}

function determineWeatherCondition(
  precipitationCategory: number, 
  precipitationIntensity: number,
  temperature: number
): WeatherCondition {
  if (precipitationCategory === 0) {
    return 'clear';
  }
  
  if (precipitationCategory === 1 || precipitationCategory === 2) { // Snow or sleet
    return 'snow';
  }
  
  if (precipitationCategory === 3 || precipitationCategory === 4) { // Rain
    if (precipitationIntensity < 0.5) return 'light-rain';
    if (precipitationIntensity < 2.0) return 'rain';
    return 'heavy-rain';
  }
  
  if (precipitationCategory === 5 || precipitationCategory === 6) { // Thunderstorm
    return 'thunderstorm';
  }
  
  return 'partly-cloudy';
}

function calculateRiskLevel(
  temperature: number, 
  windSpeed: number, 
  precipitation: number
): WeatherRiskLevel {
  let riskScore = 0;
  
  // Temperature risks
  if (temperature < 0) riskScore += 3;
  else if (temperature < 5) riskScore += 2;
  else if (temperature > 30) riskScore += 2;
  
  // Wind risks
  if (windSpeed > 15) riskScore += 3;
  else if (windSpeed > 10) riskScore += 2;
  else if (windSpeed > 7) riskScore += 1;
  
  // Precipitation risks
  if (precipitation > 5) riskScore += 3;
  else if (precipitation > 2) riskScore += 2;
  else if (precipitation > 0.5) riskScore += 1;
  
  if (riskScore >= 6) return 'critical';
  if (riskScore >= 4) return 'high';
  if (riskScore >= 2) return 'medium';
  return 'low';
}

function determineWorkSuitability(
  riskLevel: WeatherRiskLevel,
  conditions: WeatherCondition
): WorkSuitability {
  if (riskLevel === 'critical') return 'not-recommended';
  if (riskLevel === 'high') return 'caution';
  
  if (conditions === 'thunderstorm' || conditions === 'heavy-rain') {
    return 'not-recommended';
  }
  
  if (conditions === 'rain' || conditions === 'snow') {
    return 'caution';
  }
  
  if (riskLevel === 'medium') return 'good';
  return 'excellent';
}

function generateWeatherWarnings(forecast: WeatherData[]): WeatherWarning[] {
  const warnings: WeatherWarning[] = [];
  
  forecast.forEach(day => {
    if (day.workSuitability === 'not-recommended') {
      warnings.push({
        type: 'storm',
        severity: 'severe',
        message: 'Extremt väder - takarbete ej rekommenderat',
        startTime: day.date,
        endTime: day.date
      });
    } else if (day.workSuitability === 'caution') {
      warnings.push({
        type: 'precipitation',
        severity: 'moderate',
        message: 'Försiktighet krävs - överväg att skjuta upp takarbete',
        startTime: day.date,
        endTime: day.date
      });
    }
    
    if (day.windSpeed > 10) {
      warnings.push({
        type: 'wind',
        severity: day.windSpeed > 15 ? 'severe' : 'moderate',
        message: `Kraftig vind (${day.windSpeed} m/s) - risk för takarbete`,
        startTime: day.date,
        endTime: day.date
      });
    }
  });
  
  return warnings;
}

function getTargetDates(startWeek?: string): string[] {
  console.log('WEATHER DEBUG: getTargetDates called with startWeek:', startWeek);
  const dates: string[] = [];
  
  if (startWeek) {
    // Handle both "v33" and "2025-W33" formats
    let year: number;
    let week: number;
    
    if (startWeek.startsWith('v') || startWeek.startsWith('V')) {
      // Handle "v33" or "V33" format - assume current year
      year = new Date().getFullYear();
      week = parseInt(startWeek.substring(1));
    } else if (startWeek.includes('-W')) {
      // Handle "2025-W33" format
      [year, week] = startWeek.split('-W').map(Number);
    } else {
      // Fallback - assume it's just a week number
      year = new Date().getFullYear();
      week = parseInt(startWeek);
    }
    
    console.log('WEATHER DEBUG: Parsed week info:', { year, week });
    
    // Calculate start of the specified week
    const startDate = new Date(year, 0, 1 + (week - 1) * 7);
    
    // Get Monday of that week
    const dayOfWeek = startDate.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = addDays(startDate, mondayOffset);
    
    console.log('WEATHER DEBUG: Calculated Monday of week:', monday.toISOString());
    
    // Add 7 days from Monday
    for (let i = 0; i < 7; i++) {
      dates.push(format(addDays(monday, i), 'yyyy-MM-dd'));
    }
    
    console.log('WEATHER DEBUG: Generated dates for week:', dates);
  } else {
    // Default to next 7 days
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      dates.push(format(addDays(today, i), 'yyyy-MM-dd'));
    }
    console.log('WEATHER DEBUG: Using default next 7 days:', dates);
  }
  
  return dates;
}

export function getWeatherIcon(condition: WeatherCondition): string {
  const icons = {
    'clear': '☀️',
    'partly-cloudy': '⛅',
    'cloudy': '☁️',
    'light-rain': '🌦️',
    'rain': '🌧️',
    'heavy-rain': '⛈️',
    'thunderstorm': '⛈️',
    'snow': '❄️',
    'fog': '🌫️'
  };
  
  return icons[condition] || '🌤️';
}

export function getWorkSuitabilityColor(suitability: WorkSuitability): string {
  const colors = {
    'excellent': 'text-green-600',
    'good': 'text-blue-600', 
    'caution': 'text-yellow-600',
    'not-recommended': 'text-red-600'
  };
  
  return colors[suitability];
}

export function getRiskLevelColor(risk: WeatherRiskLevel): string {
  const colors = {
    'low': 'bg-green-100 text-green-800',
    'medium': 'bg-yellow-100 text-yellow-800',
    'high': 'bg-orange-100 text-orange-800',
    'critical': 'bg-red-100 text-red-800'
  };
  
  return colors[risk];
}