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

// Regional coordinates for SMHI API - Extended for more cities
export const CITY_COORDINATES = {
  // Major regions
  'Stockholm': { lat: 59.3293, lon: 18.0686 },
  'Västra Götaland': { lat: 57.7089, lon: 11.9746 },
  'Göteborg': { lat: 57.7089, lon: 11.9746 },
  
  // Additional cities
  'Lidköping': { lat: 58.5055, lon: 13.1577 },
  'Skövde': { lat: 58.3911, lon: 13.8449 },
  'Mariestad': { lat: 58.7096, lon: 13.8234 },
  'Trollhättan': { lat: 58.2837, lon: 12.2886 },
  'Vänersborg': { lat: 58.3803, lon: 12.3234 },
  'Falköping': { lat: 58.1735, lon: 13.5506 },
  'Vara': { lat: 58.2599, lon: 12.9516 },
  'Tibro': { lat: 58.4244, lon: 12.5134 },
  'Töreboda': { lat: 58.7020, lon: 14.1246 },
  'Gullspång': { lat: 58.9833, lon: 14.1167 },
  
  // More major cities
  'Malmö': { lat: 55.6050, lon: 13.0038 },
  'Uppsala': { lat: 59.8586, lon: 17.6389 },
  'Västerås': { lat: 59.6162, lon: 16.5528 },
  'Örebro': { lat: 59.2741, lon: 15.2066 },
  'Linköping': { lat: 58.4108, lon: 15.6214 },
  'Helsingborg': { lat: 56.0465, lon: 12.6945 },
  'Jönköping': { lat: 57.7826, lon: 14.1618 },
  'Norrköping': { lat: 58.5877, lon: 16.1924 },
  'Lund': { lat: 55.7047, lon: 13.1910 },
  'Umeå': { lat: 63.8258, lon: 20.2630 },
  'Gävle': { lat: 60.6749, lon: 17.1413 },
  'Borås': { lat: 57.7210, lon: 12.9401 },
  'Eskilstuna': { lat: 59.3707, lon: 16.5077 },
  'Halmstad': { lat: 56.6745, lon: 12.8581 },
  'Växjö': { lat: 56.8777, lon: 14.8091 },
  'Karlstad': { lat: 59.3793, lon: 13.5036 },
  'Sundsvall': { lat: 62.3908, lon: 17.3069 }
} as const;

// Legacy support for region-based lookup
export const REGION_COORDINATES = CITY_COORDINATES;