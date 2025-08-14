export interface WeatherData {
  date: string;
  temperature: {
    min: number;
    max: number;
  };
  precipitation: number; // mm
  windSpeed: number; // m/s
  humidity: number; // %
  conditions: WeatherCondition;
  riskLevel: WeatherRiskLevel;
  workSuitability: WorkSuitability;
}

export type WeatherCondition = 
  | 'clear' 
  | 'partly-cloudy' 
  | 'cloudy' 
  | 'light-rain' 
  | 'rain' 
  | 'heavy-rain' 
  | 'thunderstorm' 
  | 'snow' 
  | 'fog';

export type WeatherRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type WorkSuitability = 'excellent' | 'good' | 'caution' | 'not-recommended';

export interface WeatherWarning {
  type: 'precipitation' | 'wind' | 'temperature' | 'storm';
  severity: 'minor' | 'moderate' | 'severe';
  message: string;
  startTime: string;
  endTime: string;
}

export interface WeatherForecast {
  location: string;
  region: 'Stockholm' | 'Västra Götaland';
  coordinates: {
    lat: number;
    lon: number;
  };
  current: WeatherData;
  forecast: WeatherData[];
  warnings: WeatherWarning[];
  lastUpdated: string;
}

// Regional coordinates for SMHI API
export const REGION_COORDINATES = {
  'Stockholm': { lat: 59.3293, lon: 18.0686 },
  'Västra Götaland': { lat: 57.7089, lon: 11.9746 } // Göteborg
} as const;