// Geocoding with persistent localStorage cache

const CACHE_KEY = 'geocode_cache_v1';

function loadCache(): Map<string, { lat: number; lng: number } | null> {
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return new Map(Object.entries(parsed));
    }
  } catch {}
  return new Map();
}

function saveCache(cache: Map<string, { lat: number; lng: number } | null>) {
  try {
    const obj: Record<string, { lat: number; lng: number } | null> = {};
    cache.forEach((v, k) => { obj[k] = v; });
    localStorage.setItem(CACHE_KEY, JSON.stringify(obj));
  } catch {}
}

const geocodeCache = loadCache();

export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  if (!address || address.trim() === '') return null;

  const cacheKey = address.toLowerCase().trim();
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey) ?? null;
  }

  try {
    const query = encodeURIComponent(`${address}, Sverige`);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${query}&limit=1&countrycodes=se`
    );

    if (!response.ok) {
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        geocodeCache.set(cacheKey, null);
        saveCache(geocodeCache);
      }
      return null;
    }

    const data = await response.json();
    if (data && data.length > 0) {
      const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      geocodeCache.set(cacheKey, result);
      saveCache(geocodeCache);
      return result;
    }

    geocodeCache.set(cacheKey, null);
    saveCache(geocodeCache);
    return null;
  } catch (error) {
    console.error('Geocoding error for address:', address, error);
    return null;
  }
}

// Batch geocode with rate limiting (Nominatim allows 1 req/sec)
export async function batchGeocodeAddresses(
  addresses: { id: string; address: string }[]
): Promise<Map<string, { lat: number; lng: number }>> {
  const results = new Map<string, { lat: number; lng: number }>();

  for (const { id, address } of addresses) {
    const cacheKey = address.toLowerCase().trim();
    const wasCached = geocodeCache.has(cacheKey);

    const coords = await geocodeAddress(address);
    if (coords) {
      results.set(id, coords);
    }

    // Rate limit only for fresh lookups
    if (!wasCached) {
      await new Promise(resolve => setTimeout(resolve, 1100));
    }
  }

  return results;
}
