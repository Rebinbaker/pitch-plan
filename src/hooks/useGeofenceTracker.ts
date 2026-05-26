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
  awaySinceMs: number | null;
  currentAwaySeconds: number;
  absences: AbsencePeriod[];
  error: string | null;
  queuedPings: number;
}

interface QueuedPing {
  check_in_id: string;
  lat: number;
  lng: number;
  accuracy: number;
  is_mocked: boolean;
  recorded_at: string;
}

const PING_INTERVAL_MS = 60_000;
const QUEUE_KEY = (checkInId: string) => `geo_ping_queue_${checkInId}`;
const MAX_QUEUE = 500; // ~8h at 1/min

const readQueue = (checkInId: string): QueuedPing[] => {
  try {
    const raw = localStorage.getItem(QUEUE_KEY(checkInId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const writeQueue = (checkInId: string, q: QueuedPing[]) => {
  try {
    const trimmed = q.length > MAX_QUEUE ? q.slice(-MAX_QUEUE) : q;
    localStorage.setItem(QUEUE_KEY(checkInId), JSON.stringify(trimmed));
  } catch {}
};

export const useGeofenceTracker = (checkInId: string | null) => {
  const [state, setState] = useState<GeofenceState>({
    insideRadius: true,
    distanceM: null,
    radiusM: 50,
    awaySinceMs: null,
    currentAwaySeconds: 0,
    absences: [],
    error: null,
    queuedPings: 0,
  });
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);
  const lastPosRef = useRef<{ lat: number; lng: number; acc: number; mocked: boolean } | null>(null);
  const flushingRef = useRef(false);

  const enqueue = (checkIn: string, p: QueuedPing) => {
    const q = readQueue(checkIn);
    q.push(p);
    writeQueue(checkIn, q);
    setState(prev => ({ ...prev, queuedPings: q.length }));
  };

  const flushQueue = async (checkIn: string) => {
    if (flushingRef.current) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    const q = readQueue(checkIn);
    if (q.length === 0) return;
    flushingRef.current = true;
    try {
      const { data, error } = await supabase.functions.invoke('process-location-ping', {
        body: { pings: q },
      });
      if (error) throw error;
      writeQueue(checkIn, []);
      setState(prev => {
        const latest = (data as any)?.latest;
        if (!latest) return { ...prev, queuedPings: 0, error: null };
        const inside = !!latest.inside_radius;
        const wasInside = prev.insideRadius;
        let awaySinceMs = prev.awaySinceMs;
        if (!inside && wasInside) awaySinceMs = Date.now();
        if (inside) awaySinceMs = null;
        return {
          ...prev,
          queuedPings: 0,
          error: null,
          insideRadius: inside,
          distanceM: latest.distance_m ?? prev.distanceM,
          radiusM: latest.radius_m ?? prev.radiusM,
          awaySinceMs,
        };
      });
      loadAbsences();
    } catch (e: any) {
      console.warn('flush failed, will retry', e?.message);
      setState(prev => ({ ...prev, error: e.message }));
    } finally {
      flushingRef.current = false;
    }
  };

  const sendPing = async (pos: { lat: number; lng: number; acc: number; mocked: boolean }) => {
    if (!checkInId) return;
    const payload: QueuedPing = {
      check_in_id: checkInId,
      lat: pos.lat,
      lng: pos.lng,
      accuracy: pos.acc,
      is_mocked: pos.mocked,
      recorded_at: new Date().toISOString(),
    };

    // If offline or queue has backlog -> enqueue and try to flush
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    const existing = readQueue(checkInId);
    if (offline || existing.length > 0) {
      enqueue(checkInId, payload);
      flushQueue(checkInId);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('process-location-ping', {
        body: payload,
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
        loadAbsences();
      }
    } catch (e: any) {
      console.warn('ping failed -> queuing', e?.message);
      enqueue(checkInId, payload);
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
    // initialize queued count + try a flush on mount
    setState(prev => ({ ...prev, queuedPings: readQueue(checkInId).length }));
    flushQueue(checkInId);

    const onOnline = () => flushQueue(checkInId);
    window.addEventListener('online', onOnline);

    const isNative = Capacitor.isNativePlatform();
    let bgWatcherId: string | null = null;
    let cleanupNative: (() => void) | null = null;

    const onPos = (p: { lat: number; lng: number; acc: number; mocked?: boolean }) => {
      lastPosRef.current = { lat: p.lat, lng: p.lng, acc: p.acc, mocked: !!p.mocked };
    };

    if (isNative) {
      (async () => {
        try {
          const pkg = '@capacitor-community/background-geolocation';
          const mod: any = await import(/* @vite-ignore */ pkg);
          const BackgroundGeolocation = mod.BackgroundGeolocation ?? mod.default;
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
      // also retry flush periodically in case "online" event was missed
      flushQueue(checkInId);
    }, PING_INTERVAL_MS);

    const tickInterval = window.setInterval(() => {
      setState(prev => {
        if (!prev.awaySinceMs) return prev.currentAwaySeconds === 0 ? prev : { ...prev, currentAwaySeconds: 0 };
        return { ...prev, currentAwaySeconds: Math.floor((Date.now() - prev.awaySinceMs) / 1000) };
      });
    }, 1000);

    return () => {
      window.removeEventListener('online', onOnline);
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
