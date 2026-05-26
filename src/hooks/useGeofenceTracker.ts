import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';

interface AbsencePeriod {
  id: string;
  left_at: string;
  returned_at: string | null;
  duration_minutes: number | null;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected';
}

interface GeofenceState {
  insideRadius: boolean;
  distanceM: number | null;
  radiusM: number;
  awaySinceMs: number | null; // timestamp when left
  currentAwaySeconds: number;
  absences: AbsencePeriod[];
  error: string | null;
}

const PING_INTERVAL_MS = 60_000;

export const useGeofenceTracker = (checkInId: string | null) => {
  const [state, setState] = useState<GeofenceState>({
    insideRadius: true,
    distanceM: null,
    radiusM: 50,
    awaySinceMs: null,
    currentAwaySeconds: 0,
    absences: [],
    error: null,
  });
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const lastPosRef = useRef<{ lat: number; lng: number; acc: number; mocked: boolean } | null>(null);

  const sendPing = async (pos: { lat: number; lng: number; acc: number; mocked: boolean }) => {
    if (!checkInId) return;
    try {
      const { data, error } = await supabase.functions.invoke('process-location-ping', {
        body: {
          check_in_id: checkInId,
          lat: pos.lat,
          lng: pos.lng,
          accuracy: pos.acc,
          is_mocked: pos.mocked,
          recorded_at: new Date().toISOString(),
        },
      });
      if (error) throw error;
      if (data) {
        setState(prev => {
          const inside = !!data.inside_radius;
          const wasInside = prev.insideRadius;
          let awaySinceMs = prev.awaySinceMs;
          if (!inside && wasInside) awaySinceMs = Date.now();
          if (inside) awaySinceMs = null;
          return {
            ...prev,
            insideRadius: inside,
            distanceM: data.distance_m ?? null,
            radiusM: data.radius_m ?? prev.radiusM,
            awaySinceMs,
            error: null,
          };
        });
        // refresh absences list
        loadAbsences();
      }
    } catch (e: any) {
      console.error('ping err', e);
      setState(prev => ({ ...prev, error: e.message }));
    }
  };

  const loadAbsences = async () => {
    if (!checkInId) return;
    const { data } = await supabase
      .from('worker_absence_periods')
      .select('id, left_at, returned_at, duration_minutes, reason, status')
      .eq('check_in_id', checkInId)
      .order('left_at', { ascending: false });
    if (data) setState(prev => ({ ...prev, absences: data as any }));
  };

  useEffect(() => {
    if (!checkInId) return;
    loadAbsences();

    const isNative = Capacitor.isNativePlatform();
    let bgWatcherId: string | null = null;
    let cleanupNative: (() => void) | null = null;

    const onPos = (p: { lat: number; lng: number; acc: number; mocked?: boolean }) => {
      lastPosRef.current = { lat: p.lat, lng: p.lng, acc: p.acc, mocked: !!p.mocked };
    };

    if (isNative) {
      // Native: background geolocation works with screen off
      (async () => {
        try {
          const { BackgroundGeolocation } = await import('@capacitor-community/background-geolocation') as any;
          bgWatcherId = await BackgroundGeolocation.addWatcher(
            {
              backgroundMessage: 'Tidrapportering aktiv – platsen spåras',
              backgroundTitle: 'Incheckad på arbetsplats',
              requestPermissions: true,
              stale: false,
              distanceFilter: 10,
            },
            (location, error) => {
              if (error) {
                console.warn('bg geo err', error);
                setState(prev => ({ ...prev, error: error.message }));
                return;
              }
              if (location) {
                const pos = {
                  lat: location.latitude,
                  lng: location.longitude,
                  acc: location.accuracy,
                  mocked: (location as any).simulated === true,
                };
                onPos(pos);
                sendPing(pos);
              }
            }
          );
          cleanupNative = () => {
            if (bgWatcherId) BackgroundGeolocation.removeWatcher({ id: bgWatcherId });
          };
        } catch (e: any) {
          console.error('bg geo init failed', e);
          setState(prev => ({ ...prev, error: e.message }));
        }
      })();
    } else {
      // Web fallback: only works while tab is open
      if (!navigator.geolocation) {
        setState(prev => ({ ...prev, error: 'GPS stöds inte i denna webbläsare' }));
        return;
      }
      const onWebPos = (pos: GeolocationPosition) =>
        onPos({ lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy });
      const onErr = (err: GeolocationPositionError) => console.warn('geo err', err);

      watchIdRef.current = navigator.geolocation.watchPosition(onWebPos, onErr, {
        enableHighAccuracy: true,
        maximumAge: 30_000,
        timeout: 30_000,
      });
      navigator.geolocation.getCurrentPosition((p) => {
        onWebPos(p);
        sendPing({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy, mocked: false });
      }, onErr, { enableHighAccuracy: true, maximumAge: 0, timeout: 30_000 });
    }

    intervalRef.current = window.setInterval(() => {
      if (lastPosRef.current) sendPing(lastPosRef.current);
    }, PING_INTERVAL_MS);

    const tickInterval = window.setInterval(() => {
      setState(prev => {
        if (!prev.awaySinceMs) return prev.currentAwaySeconds === 0 ? prev : { ...prev, currentAwaySeconds: 0 };
        return { ...prev, currentAwaySeconds: Math.floor((Date.now() - prev.awaySinceMs) / 1000) };
      });
    }, 1000);

    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(watchIdRef.current);
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
      clearInterval(tickInterval);
      if (cleanupNative) cleanupNative();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkInId]);

  return { ...state, refresh: loadAbsences };
};

export const formatAwayTimer = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};
