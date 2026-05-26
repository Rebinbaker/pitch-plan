import { registerPlugin } from '@capacitor/core';

export interface BackgroundWatcherOptions {
  backgroundMessage?: string;
  backgroundTitle?: string;
  requestPermissions?: boolean;
  stale?: boolean;
  distanceFilter?: number;
}

export interface BackgroundLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  altitudeAccuracy: number | null;
  simulated: boolean;
  bearing: number | null;
  speed: number | null;
  time: number | null;
}

export interface BackgroundLocationError extends Error {
  code?: string;
}

export interface BackgroundGeolocationPlugin {
  addWatcher(
    options: BackgroundWatcherOptions,
    callback: (position?: BackgroundLocation, error?: BackgroundLocationError) => void,
  ): Promise<string>;
  removeWatcher(options: { id: string }): Promise<void>;
  openSettings(): Promise<void>;
}

export const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');