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

function buildAddressVariants(address: string): string[] {
  const trimmed = address.trim();
  const variants = new Set<string>();
  variants.add(trimmed);

  // Match Swedish postal code (e.g. "218 47")
  const postalMatch = trimmed.match(/(\d{3}\s?\d{2})\s+([^\d,]+?)\s*$/);
  if (postalMatch) {
    const postalAndCity = `${postalMatch[1]} ${postalMatch[2].trim()}`;
    // Street part = everything before the postal code, strip junk after street number
    const beforePostal = trimmed.slice(0, postalMatch.index).replace(/[,\s]+$/, '');
    const streetMatch = beforePostal.match(/^([^,]+?\s\d+[A-Za-z]?)(?:[\s,].*)?$/);
    if (streetMatch) {
      variants.add(`${streetMatch[1]}, ${postalAndCity}`);
    }
    variants.add(postalAndCity);
    variants.add(postalMatch[2].trim());
  }

  return Array.from(variants).filter(Boolean);
}

async function geocodeOnce(query: string): Promise<GeocodeResult | null> {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(`${query}, Sverige`)}&limit=1&countrycodes=se`
  );
  if (!response.ok) return null;
  const data = await response.json();
  const first = Array.isArray(data) ? data[0] : null;
  const lat = Number(first?.lat);
  const lng = Number(first?.lon);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng };
  }
  return null;
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  if (!address || address.trim() === '') return null;

  const cacheKey = address.toLowerCase().trim();
  const cached = geocodeCache.get(cacheKey);
  if (cached) return cached;

  const variants = buildAddressVariants(address);

  for (let i = 0; i < variants.length; i++) {
    const variant = variants[i];
    try {
      const result = await geocodeOnce(variant);
      if (result) {
        geocodeCache.set(cacheKey, result);
        saveCache(geocodeCache);
        return result;
      }
    } catch (error) {
      console.error('Geocoding error for variant:', variant, error);
    }
    // Respect Nominatim ~1 req/sec between variant attempts
    if (i < variants.length - 1) {
      await new Promise((r) => setTimeout(r, 1100));
    }
  }

  return null;
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
