// Geocoding cache to avoid repeated API calls
const geocodeCache = new Map<string, { lat: number; lng: number } | null>();

export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  if (!address || address.trim() === '') return null;

  // Check cache first
  const cacheKey = address.toLowerCase().trim();
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey) ?? null;
  }

  try {
    // Use Nominatim (OpenStreetMap) free geocoding - add Sweden bias
    // NOTE: Avoid custom headers like User-Agent in browser fetch (can trigger CORS failures)
    const query = encodeURIComponent(`${address}, Sverige`);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${query}&limit=1&countrycodes=se`
    );

    if (!response.ok) {
      // Don't cache transient API failures (429/5xx/network gateways) so we can retry later
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        geocodeCache.set(cacheKey, null);
      }
      return null;
    }

    const data = await response.json();
    if (data && data.length > 0) {
      const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      geocodeCache.set(cacheKey, result);
      return result;
    }

    geocodeCache.set(cacheKey, null);
    return null;
  } catch (error) {
    // Network/CORS issues should be retried on next attempt (no null-cache)
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

    // Rate limit only for fresh lookups to avoid Nominatim throttling
    if (!wasCached) {
      await new Promise(resolve => setTimeout(resolve, 1100));
    }
  }

  return results;
}
