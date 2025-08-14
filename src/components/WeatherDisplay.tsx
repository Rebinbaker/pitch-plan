import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { WeatherForecast } from '@/types/weather';
import { Region } from '@/types/project';
import { fetchWeatherForProject, getWeatherIcon, getWorkSuitabilityColor, getRiskLevelColor } from '@/utils/weatherService';
import { CloudRain, Wind, Thermometer, Droplets, AlertTriangle, Eye } from 'lucide-react';

interface WeatherDisplayProps {
  region?: Region;
  address?: string;
  startWeek?: string;
  compact?: boolean;
  className?: string;
  onDialogOpen?: () => void;
}

export function WeatherDisplay({ region, address, startWeek, compact = false, className = '', onDialogOpen }: WeatherDisplayProps) {
  console.log('WEATHER DISPLAY DEBUG: Component rendered with props:', { region, address, startWeek, compact });
  console.log('WEATHER DISPLAY DEBUG: Unique key for re-render:', `${address}-${startWeek}`);
  
  const [weather, setWeather] = useState<WeatherForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('WEATHER USEEFFECT DEBUG: useEffect triggered with:', { region, address, startWeek });
    
    let isMounted = true;

    const fetchWeather = async () => {
      console.log('WEATHER USEEFFECT DEBUG: fetchWeather called');
      try {
        setLoading(true);
        setError(null);
        
        // Use address if provided, otherwise fall back to region
        const locationParam = address || region;
        console.log('WEATHER USEEFFECT DEBUG: locationParam:', locationParam);
        
        if (!locationParam) {
          console.log('WEATHER USEEFFECT DEBUG: No location param, setting error');
          setError('Ingen adress eller region angiven');
          return;
        }
        
        console.log('WEATHER USEEFFECT DEBUG: Calling fetchWeatherForProject with:', locationParam, startWeek);
        const weatherData = await fetchWeatherForProject(locationParam, startWeek);
        
        if (isMounted) {
          if (weatherData) {
            console.log('WEATHER USEEFFECT DEBUG: Successfully got weather data');
            setWeather(weatherData);
          } else {
            console.log('WEATHER USEEFFECT DEBUG: No weather data returned');
            setError('Kunde inte hämta väderdata');
          }
        }
      } catch (err) {
        console.log('WEATHER USEEFFECT DEBUG: Error in fetchWeather:', err);
        if (isMounted) {
          setError('Fel vid hämtning av väderdata');
          console.error('Weather fetch error:', err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchWeather();

    return () => {
      isMounted = false;
    };
  }, [region, address, startWeek]);

  if (loading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <CloudRain className="h-4 w-4 animate-pulse text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Hämtar väder...</span>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <CloudRain className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Väder ej tillgängligt</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        <Dialog onOpenChange={(open) => {
          console.log('WEATHER DIALOG DEBUG: Dialog onOpenChange triggered with:', open);
          if (open && onDialogOpen) {
            console.log('WEATHER DIALOG DEBUG: Calling onDialogOpen callback');
            onDialogOpen();
          }
        }}>
          <DialogTrigger asChild>
            <div className={`flex items-center space-x-2 cursor-pointer hover:bg-muted/50 transition-colors rounded-lg p-2 ${className}`}>
              <span className="text-lg">{getWeatherIcon(weather.current.conditions)}</span>
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  {weather.current.temperature.min}°-{weather.current.temperature.max}°C
                </span>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${getWorkSuitabilityColor(weather.current.workSuitability)}`}
                >
                  {getWorkSuitabilityText(weather.current.workSuitability)}
                </Badge>
              </div>
              {weather.warnings.length > 0 && (
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              )}
              <Eye className="h-3 w-3 text-muted-foreground ml-auto" />
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Väderprognos för {weather.location} - {startWeek}</DialogTitle>
            </DialogHeader>
            <Card>
              <CardContent className="p-4">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Väderprognos - {weather.location}</h3>
                    <Badge className={getRiskLevelColor(weather.current.riskLevel)}>
                      {getRiskLevelText(weather.current.riskLevel)}
                    </Badge>
                  </div>

                  {/* Current weather */}
                  <div className="flex items-center space-x-4 p-3 bg-muted/50 rounded-lg">
                    <span className="text-2xl">{getWeatherIcon(weather.current.conditions)}</span>
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <Thermometer className="h-4 w-4" />
                          <span>{weather.current.temperature.min}°-{weather.current.temperature.max}°C</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Wind className="h-4 w-4" />
                          <span>{weather.current.windSpeed} m/s</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Droplets className="h-4 w-4" />
                          <span>{weather.current.precipitation} mm</span>
                        </div>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`mt-2 ${getWorkSuitabilityColor(weather.current.workSuitability)}`}
                      >
                        {getWorkSuitabilityText(weather.current.workSuitability)}
                      </Badge>
                    </div>
                  </div>

                  {/* Warnings */}
                  {weather.warnings.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-yellow-600 flex items-center">
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        Vädervarningar
                      </h4>
                      {weather.warnings.map((warning, index) => (
                        <div key={index} className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                          {warning.message}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 7-day forecast */}
                  {weather.forecast.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">7-dagars prognos</h4>
                      <div className="grid grid-cols-7 gap-2">
                        {weather.forecast.slice(0, 7).map((day, index) => (
                          <div key={index} className="text-center p-2 bg-muted/30 rounded">
                            <div className="text-xs text-muted-foreground mb-1">
                              {new Date(day.date).toLocaleDateString('sv-SE', { weekday: 'short' })}
                            </div>
                            <div className="text-lg mb-1">{getWeatherIcon(day.conditions)}</div>
                            <div className="text-xs">
                              {day.temperature.min}°-{day.temperature.max}°
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {day.precipitation} mm
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </DialogContent>
        </Dialog>
        
        {/* Critical weather warning - show directly on card */}
        {weather.warnings.some(w => w.severity === 'severe') && (
          <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-1 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs font-medium">
                Kritiskt väder - överväg att flytta projektet
              </span>
            </div>
          </div>
        )}
        
        {/* Moderate weather warning */}
        {weather.warnings.some(w => w.severity === 'moderate') && !weather.warnings.some(w => w.severity === 'severe') && (
          <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-1 text-yellow-700">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs font-medium">
                Vädervarning - försiktighet krävs
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Väderprognos - {weather.location}</h3>
            <Badge className={getRiskLevelColor(weather.current.riskLevel)}>
              {getRiskLevelText(weather.current.riskLevel)}
            </Badge>
          </div>

          {/* Current weather */}
          <div className="flex items-center space-x-4 p-3 bg-muted/50 rounded-lg">
            <span className="text-2xl">{getWeatherIcon(weather.current.conditions)}</span>
            <div className="flex-1">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <Thermometer className="h-4 w-4" />
                  <span>{weather.current.temperature.min}°-{weather.current.temperature.max}°C</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Wind className="h-4 w-4" />
                  <span>{weather.current.windSpeed} m/s</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Droplets className="h-4 w-4" />
                  <span>{weather.current.precipitation} mm</span>
                </div>
              </div>
              <Badge 
                variant="outline" 
                className={`mt-2 ${getWorkSuitabilityColor(weather.current.workSuitability)}`}
              >
                {getWorkSuitabilityText(weather.current.workSuitability)}
              </Badge>
            </div>
          </div>

          {/* Warnings */}
          {weather.warnings.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-yellow-600 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-1" />
                Vädervarningar
              </h4>
              {weather.warnings.map((warning, index) => (
                <div key={index} className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                  {warning.message}
                </div>
              ))}
            </div>
          )}

          {/* 7-day forecast (if not compact) */}
          {weather.forecast.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">7-dagars prognos</h4>
              <div className="grid grid-cols-7 gap-2">
                {weather.forecast.slice(0, 7).map((day, index) => (
                  <div key={index} className="text-center p-2 bg-muted/30 rounded">
                    <div className="text-xs text-muted-foreground mb-1">
                      {new Date(day.date).toLocaleDateString('sv-SE', { weekday: 'short' })}
                    </div>
                    <div className="text-lg mb-1">{getWeatherIcon(day.conditions)}</div>
                    <div className="text-xs">
                      {day.temperature.min}°-{day.temperature.max}°
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {day.precipitation} mm
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function getWorkSuitabilityText(suitability: string): string {
  const texts = {
    'excellent': 'Utmärkt',
    'good': 'Bra',
    'caution': 'Försiktighet',
    'not-recommended': 'Ej rekommenderat'
  };
  
  return texts[suitability as keyof typeof texts] || 'Okänt';
}

function getRiskLevelText(risk: string): string {
  const texts = {
    'low': 'Låg risk',
    'medium': 'Medel risk',
    'high': 'Hög risk',
    'critical': 'Kritisk risk'
  };
  
  return texts[risk as keyof typeof texts] || 'Okänt';
}