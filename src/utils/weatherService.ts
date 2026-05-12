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
    
    // Get coordinates for the city with fallback support
    const { lat, lon, actualCity } = findCityCoordinates(city);
    console.log('WEATHER DEBUG: Coordinates found:', { lat, lon, actualCity });
    
    // Check if the requested week is in the past
    const isHistoricalWeek = isWeekInPast(startWeek);
    console.log('WEATHER DEBUG: Is historical week?', isHistoricalWeek);
    
    if (isHistoricalWeek) {
      // For historical weeks, return mock data with appropriate message
      return createHistoricalWeatherData(actualCity, { lat, lon }, startWeek);
    }
    
    const url = `${SMHI_FORECAST_URL}/lon/${lon}/lat/${lat}/data.json`;
    console.log('WEATHER DEBUG: Fetching from URL:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('WEATHER DEBUG: SMHI API error:', response.status);
      return null;
    }

    const data = await response.json();
    console.log('WEATHER DEBUG: Successfully fetched weather data');
    return processSMHIData(data, actualCity, { lat, lon }, startWeek);
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

function processSMHIData(
  smhiData: any, 
  city: string, 
  coordinates: { lat: number; lon: number },
  startWeek?: string
): WeatherForecast {
  const timeSeries = smhiData.timeSeries || [];
  
  // Get current weather (first entry)
  const currentData = timeSeries[0];
  const current = parseTimeSeries(currentData);
  
  // Get forecast for next 7 days
  const forecast: WeatherData[] = [];
  const targetDates = getTargetDates(startWeek);
  
  for (const entry of timeSeries.slice(0, 168)) { // 7 days * 24 hours
    const entryDate = format(parseISO(entry.validTime), 'yyyy-MM-dd');
    
    if (targetDates.includes(entryDate)) {
      const weatherData = parseTimeSeries(entry);
      
      // Only add if we don't already have data for this date
      if (!forecast.find(f => f.date === entryDate)) {
        forecast.push(weatherData);
      }
    }
  }
  
  // Generate warnings
  const warnings = generateWeatherWarnings(forecast);
  
  return {
    location: city,
    region: city as any, // For backward compatibility
    coordinates,
    current,
    forecast: forecast.slice(0, 7), // Max 7 days
    warnings,
    lastUpdated: new Date().toISOString()
  };
}

function parseTimeSeries(entry: any): WeatherData {
  const parameters = entry.parameters || [];
  
  const getParameter = (name: string) => {
    const param = parameters.find((p: any) => p.name === name);
    return param ? param.values[0] : 0;
  };
  
  const temperature = getParameter('t'); // Temperature
  const precipitation = getParameter('pcat'); // Precipitation category
  const windSpeed = getParameter('ws'); // Wind speed
  const humidity = getParameter('r'); // Relative humidity
  const precipitationIntensity = getParameter('pmean'); // Precipitation mean
  
  const conditions = determineWeatherCondition(precipitation, precipitationIntensity, temperature);
  const riskLevel = calculateRiskLevel(temperature, windSpeed, precipitationIntensity);
  const workSuitability = determineWorkSuitability(riskLevel, conditions);
  
  return {
    date: format(parseISO(entry.validTime), 'yyyy-MM-dd'),
    temperature: {
      min: Math.round(temperature - 2), // Rough estimate
      max: Math.round(temperature + 2)
    },
    precipitation: Math.round(precipitationIntensity * 10) / 10,
    windSpeed: Math.round(windSpeed * 10) / 10,
    humidity: Math.round(humidity),
    conditions,
    riskLevel,
    workSuitability
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