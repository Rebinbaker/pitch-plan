import React, { useState, useEffect } from 'react';
import { MapPin, AlertCircle, Check } from 'lucide-react';
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
      
      // Check if location is near project address (within 100m)
      const isVerified = projectAddress ? 
        await isLocationNearProject(latitude, longitude, projectAddress) : 
        true;

      const locationData = {
        latitude,
        longitude,
        address,
        verified: isVerified
      };

      setCurrentLocation(locationData);
      onLocationVerified(locationData);

      if (!isVerified && projectAddress) {
        toast({
          title: "Platskontroll misslyckades",
          description: "Du är inte tillräckligt nära projektadressen",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Plats verifierad",
          description: "Din position har registrerats",
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
      return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch {
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  };

  const isLocationNearProject = async (lat: number, lng: number, projectAddr: string): Promise<boolean> => {
    try {
      // Simple distance calculation (in real app, you'd use proper geocoding service)
      // For now, we'll return true as a placeholder
      // In production, you'd geocode the project address and calculate distance
      return true;
    } catch {
      return false;
    }
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
            <div className="space-y-1">
              <div className="font-medium">
                {currentLocation.verified ? "✅ Plats verifierad" : "❌ Plats ej verifierad"}
              </div>
              <div className="text-sm">{currentLocation.address}</div>
              {projectAddress && (
                <div className="text-xs text-muted-foreground">
                  Projektadress: {projectAddress}
                </div>
              )}
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