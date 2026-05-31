export interface RouteResult {
  distanceKm: number;
  travelMinutes: number;
  estimated: boolean; // true if Haversine fallback was used
}

type Coords = { lat: number; lng: number };

function haversineKm(a: Coords, b: Coords): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export async function getDrivingRoute(from: Coords, to: Coords): Promise<RouteResult> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const route = data?.routes?.[0];
      if (route && Number.isFinite(route.distance) && Number.isFinite(route.duration)) {
        return {
          distanceKm: route.distance / 1000,
          travelMinutes: route.duration / 60,
          estimated: false,
        };
      }
    }
  } catch (err) {
    console.warn('OSRM routing failed, using Haversine fallback', err);
  }

  // Fallback: fågelvägen * 1.3 och 70 km/h
  const straight = haversineKm(from, to);
  const distanceKm = straight * 1.3;
  return {
    distanceKm,
    travelMinutes: (distanceKm / 70) * 60,
    estimated: true,
  };
}
