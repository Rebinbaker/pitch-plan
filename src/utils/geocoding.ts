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
    const query = encodeURIComponent(`${address}, Sverige`);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1&countrycodes=se`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'PitchPlan/1.0'
        }
      }
    );

    if (!response.ok) {
      geocodeCache.set(cacheKey, null);
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
    console.error('Geocoding error for address:', address, error);
    geocodeCache.set(cacheKey, null);
    return null;
  }
}

// Batch geocode with rate limiting (Nominatim allows 1 req/sec)
export async function batchGeocodeAddresses(
  addresses: { id: string; address: string }[]
): Promise<Map<string, { lat: number; lng: number }>> {
  const results = new Map<string, { lat: number; lng: number }>();

  for (const { id, address } of addresses) {
    const coords = await geocodeAddress(address);
    if (coords) {
      results.set(id, coords);
    }
    // Rate limit: wait 1.1 seconds between requests (only for uncached)
    const cacheKey = address.toLowerCase().trim();
    if (!geocodeCache.has(cacheKey)) {
      await new Promise(resolve => setTimeout(resolve, 1100));
    }
  }

  return results;
}
