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

// SMHI API endpoints
const SMHI_FORECAST_URL = 'https://opendata-download-metfcst.smhi.se/api/category/pmp3g/version/2/geotype/point';

// Function to extract city from address
function extractCityFromAddress(address: string): string {
  // Split by common delimiters and look for postal code pattern
  const parts = address.split(/[,\s]+/);
  
  // Look for 5-digit postal code followed by city name
  for (let i = 0; i < parts.length - 1; i++) {
    if (/^\d{3}\s?\d{2}$/.test(parts[i])) {
      // Found postal code, next part should be city
      const city = parts[i + 1];
      if (city && city.length > 1) {
        return city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
      }
    }
  }
  
  // Alternative: look for city name at the end without postal code
  const lastPart = parts[parts.length - 1];
  if (lastPart && lastPart.length > 2 && !(/^\d+$/.test(lastPart))) {
    return lastPart.charAt(0).toUpperCase() + lastPart.slice(1).toLowerCase();
  }
  
  // More aggressive parsing: look for any word that could be a city
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    if (part && part.length > 2 && !(/^\d+$/.test(part)) && !(/^(gatan|vägen|torget)$/i.test(part))) {
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    }
  }
  
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
  try {
    // Determine if it's an address or region
    let city: string;
    
    if (typeof regionOrAddress === 'string' && regionOrAddress.includes(' ')) {
      // It's an address, extract city
      city = extractCityFromAddress(regionOrAddress);
    } else {
      // It's a region
      city = regionOrAddress as string;
    }
    
    // Get coordinates for the city with fallback support
    const { lat, lon, actualCity } = findCityCoordinates(city);
    
    const response = await fetch(
      `${SMHI_FORECAST_URL}/lon/${lon}/lat/${lat}/data.json`
    );
    
    if (!response.ok) {
      console.error('SMHI API error:', response.status);
      return null;
    }

    const data = await response.json();
    return processSMHIData(data, actualCity, { lat, lon }, startWeek);
  } catch (error) {
    console.error('Error fetching weather data:', error);
    return null;
  }
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
  const dates: string[] = [];
  
  if (startWeek) {
    // Handle both "v33" and "2025-W33" formats
    let year: number;
    let week: number;
    
    if (startWeek.startsWith('v')) {
      // Handle "v33" format - assume current year
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
    
    const startDate = new Date(year, 0, 1 + (week - 1) * 7);
    
    // Get Monday of that week
    const dayOfWeek = startDate.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = addDays(startDate, mondayOffset);
    
    // Add 7 days from Monday
    for (let i = 0; i < 7; i++) {
      dates.push(format(addDays(monday, i), 'yyyy-MM-dd'));
    }
  } else {
    // Default to next 7 days
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      dates.push(format(addDays(today, i), 'yyyy-MM-dd'));
    }
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