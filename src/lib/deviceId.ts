import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';

const KEY = 'worker_device_id';

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  platform: 'ios' | 'android' | 'web';
  appVersion: string;
}

const randomId = () => {
  const u = (globalThis.crypto || (window as any).crypto) as Crypto | undefined;
  if (u?.randomUUID) return u.randomUUID();
  return 'web-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
};

export const getDeviceInfo = async (): Promise<DeviceInfo> => {
  const isNative = Capacitor.isNativePlatform();
  if (isNative) {
    try {
      const id = await Device.getId();
      const info = await Device.getInfo();
      return {
        deviceId: id.identifier,
        deviceName: `${info.manufacturer ?? ''} ${info.model ?? ''}`.trim() || info.platform,
        platform: (info.platform === 'ios' || info.platform === 'android') ? info.platform : 'web',
        appVersion: info.osVersion ?? '',
      };
    } catch (e) {
      console.warn('Device plugin failed, falling back', e);
    }
  }
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = 'web-' + randomId();
    localStorage.setItem(KEY, id);
  }
  return {
    deviceId: id,
    deviceName: navigator.userAgent.slice(0, 80),
    platform: 'web',
    appVersion: '1.0.0',
  };
};
