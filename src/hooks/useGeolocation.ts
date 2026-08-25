import { useEffect, useState, useCallback } from 'react';
import { Geolocation, Position } from '@capacitor/geolocation';
import { isNativeApp, runNative } from '@/lib/appbuild';

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
}

async function requestNativeLocation(): Promise<GeoLocation | undefined> {
  const perm = await Geolocation.requestPermissions();
  if (perm.location !== 'granted') return undefined;
  const pos: Position = await Geolocation.getCurrentPosition({
    enableHighAccuracy: true,
    timeout: 10000,
  });
  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracy: pos.coords.accuracy ?? 0,
  };
}

function requestBrowserLocation(): Promise<GeoLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}

export async function getCurrentLocation(): Promise<GeoLocation> {
  if (isNativeApp()) {
    const native = await runNative(requestNativeLocation);
    if (native) return native;
  }
  return requestBrowserLocation();
}

export function useGeolocation() {
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const loc = await getCurrentLocation();
      setLocation(loc);
      return loc;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not get location';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { location, error, loading, refresh };
}
