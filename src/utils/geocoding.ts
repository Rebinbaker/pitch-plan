type GeocodeResult = { lat: number; lng: number };

const CACHE_KEY = 'geocode_cache_v2';

function isValidGeocodeResult(value: unknown): value is GeocodeResult {
  if (!value || typeof value !== 'object') return false;
  const maybeResult = value as { lat?: unknown; lng?: unknown };
  return Number.isFinite(maybeResult.lat) && Number.isFinite(maybeResult.lng);
}

function loadCache(): Map<string, GeocodeResult> {
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (!stored) return new Map();

    const parsed = JSON.parse(stored) as Record<string, unknown>;
    const entries = Object.entries(parsed).filter(([, value]) => isValidGeocodeResult(value));
    return new Map(entries as [string, GeocodeResult][]);
  } catch {
    return new Map();
  }
}

function saveCache(cache: Map<string, GeocodeResult>) {
  try {
    const serialized = Object.fromEntries(cache.entries());
    localStorage.setItem(CACHE_KEY, JSON.stringify(serialized));
  } catch {
    // Ignore storage write failures (private mode/quota exceeded)
  }
}

const geocodeCache = loadCache();

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  if (!address || address.trim() === '') return null;

  const cacheKey = address.toLowerCase().trim();
  const cached = geocodeCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const query = encodeURIComponent(`${address}, Sverige`);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${query}&limit=1&countrycodes=se`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const first = Array.isArray(data) ? data[0] : null;
    const lat = Number(first?.lat);
    const lng = Number(first?.lon);

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const result = { lat, lng };
      geocodeCache.set(cacheKey, result);
      saveCache(geocodeCache);
      return result;
    }

    return null;
  } catch (error) {
    console.error('Geocoding error for address:', address, error);
    return null;
  }
}

// Batch geocode with rate limiting (Nominatim allows ~1 req/sec)
export async function batchGeocodeAddresses(
  addresses: { id: string; address: string }[]
): Promise<Map<string, GeocodeResult>> {
  const results = new Map<string, GeocodeResult>();

  for (const { id, address } of addresses) {
    const cacheKey = address.toLowerCase().trim();
    const wasCached = geocodeCache.has(cacheKey);

    const coords = await geocodeAddress(address);
    if (coords) {
      results.set(id, coords);
    }

    if (!wasCached) {
      await new Promise(resolve => setTimeout(resolve, 1100));
    }
  }

  return results;
}
