import React, { useState, useEffect } from 'react';
import { MapPin, AlertCircle, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface LocationVerificationProps {
  projectAddress?: string;
  onLocationVerified: (location: {
    latitude: number;
    longitude: number;
    address: string;
    verified: boolean;
    distanceKm?: number;
  }) => void;
  disabled?: boolean;
}

export const LocationVerification: React.FC<LocationVerificationProps> = ({
  projectAddress,
  onLocationVerified,
  disabled = false
}) => {
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
    verified: boolean;
    distanceKm?: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setError('GPS stöds inte av din enhet');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
          }
        );
      });

      const { latitude, longitude } = position.coords;
      
      // Get address from coordinates using reverse geocoding
      const address = await reverseGeocode(latitude, longitude);
      
      // Check if location is near project address and calculate distance
      let isVerified = true;
      let distanceKm = 0;
      
      if (projectAddress) {
        const projectCoords = await geocodeAddress(projectAddress);
        if (projectCoords) {
          distanceKm = calculateDistance(latitude, longitude, projectCoords.lat, projectCoords.lng);
          isVerified = distanceKm <= 1.0; // Within 1km radius
        }
      }

      const locationData = {
        latitude,
        longitude,
        address,
        verified: isVerified,
        distanceKm
      };

      setCurrentLocation(locationData);
      onLocationVerified(locationData);

      if (!isVerified && projectAddress) {
        toast({
          title: "Platskontroll misslyckades",
          description: `Du är ${distanceKm.toFixed(1)}km från projektadressen (max 1.0km)`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Plats verifierad",
          description: distanceKm > 0 ? `${distanceKm.toFixed(1)}km från projekt` : "Din position har registrerats",
        });
      }

    } catch (error: any) {
      let errorMessage = 'Kunde inte hämta din position';
      
      if (error.code === 1) {
        errorMessage = 'Du måste tillåta platsåtkomst för att klocka in/ut';
      } else if (error.code === 2) {
        errorMessage = 'Kunde inte bestämma din position';
      } else if (error.code === 3) {
        errorMessage = 'Timeout vid platsbestämning';
      }
      
      setError(errorMessage);
      toast({
        title: "Platskontroll misslyckades",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      // Using a simple reverse geocoding service (you might want to use a better one)
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=sv`
      );
      const data = await response.json();
      return data.locality ? `${data.locality}, ${data.countryName}` : `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch {
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const geocodeAddress = async (address: string): Promise<{lat: number, lng: number} | null> => {
    try {
      // Simple geocoding using OpenStreetMap Nominatim
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        };
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MapPin className="h-5 w-5 text-primary" />
        <span className="font-medium">Platsverifiering</span>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {currentLocation && (
        <Alert variant={currentLocation.verified ? "default" : "destructive"}>
          <Check className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <div className="font-medium">
                {currentLocation.verified ? "✅ Plats verifierad" : "❌ Plats ej verifierad"}
                {currentLocation.distanceKm !== undefined && currentLocation.distanceKm > 0 && (
                  <span className="ml-2 text-sm">
                    ({currentLocation.distanceKm.toFixed(1)}km från projekt)
                  </span>
                )}
              </div>
              <div className="text-sm">{currentLocation.address}</div>
              <div className="text-xs text-muted-foreground">
                GPS: {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
              </div>
              {projectAddress && (
                <div className="text-xs text-muted-foreground">
                  Projektadress: {projectAddress}
                  <br />
                  Accepterad radie: 1.0km
                </div>
              )}
              {/* Google Maps link */}
              <div className="pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const url = `https://www.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}`;
                    window.open(url, '_blank');
                  }}
                  className="text-xs h-7"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Öppna i Google Maps
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Button
        onClick={getCurrentLocation}
        disabled={disabled || isLoading}
        className="w-full"
        variant={currentLocation?.verified ? "outline" : "default"}
      >
        <MapPin className="h-4 w-4 mr-2" />
        {isLoading ? 'Hämtar position...' : 
         currentLocation ? 'Uppdatera position' : 'Verifiera plats'}
      </Button>
    </div>
  );
};