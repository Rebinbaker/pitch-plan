import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getDeviceInfo } from '@/lib/deviceId';

export type DeviceBindingStatus = 'loading' | 'approved' | 'pending' | 'revoked' | 'error';

export interface DeviceBindingState {
  status: DeviceBindingStatus;
  deviceId: string | null;
  message: string | null;
  isFirstDevice: boolean;
  refresh: () => void;
}

export const useDeviceBinding = (): DeviceBindingState => {
  const { user } = useAuth();
  const [state, setState] = useState<DeviceBindingState>({
    status: 'loading',
    deviceId: null,
    message: null,
    isFirstDevice: false,
    refresh: () => {},
  });

  const register = async () => {
    if (!user) return;
    try {
      const info = await getDeviceInfo();
      const { data, error } = await supabase.functions.invoke('register-device', {
        body: info,
      });
      if (error) throw error;
      setState({
        status: (data?.status as DeviceBindingStatus) || 'pending',
        deviceId: info.deviceId,
        message: data?.message || null,
        isFirstDevice: !!data?.isFirstDevice,
        refresh: register,
      });
    } catch (e: any) {
      console.error('device binding failed', e);
      setState((p) => ({ ...p, status: 'error', message: e.message, refresh: register }));
    }
  };

  useEffect(() => {
    if (user) register();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return state;
};
