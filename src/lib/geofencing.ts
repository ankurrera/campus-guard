// Haversine formula to calculate distance between two points
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Check if a point is inside a polygon
export function isPointInPolygon(
  point: { lat: number; lng: number },
  polygon: Array<{ lat: number; lng: number }>
): boolean {
  let inside = false;
  const x = point.lat;
  const y = point.lng;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lat;
    const yi = polygon[i].lng;
    const xj = polygon[j].lat;
    const yj = polygon[j].lng;

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

// Check if user is within any geofence
export function checkGeofence(
  userLocation: { lat: number; lng: number },
  geofences: Array<{
    type: 'polygon' | 'radius';
    coordinates?: Array<{ lat: number; lng: number }>;
    center?: { lat: number; lng: number };
    radius?: number;
    active: boolean;
  }>
): { isInside: boolean; geofenceName?: string; distance?: number } {
  for (const fence of geofences) {
    if (!fence.active) continue;

    if (fence.type === 'radius' && fence.center && fence.radius) {
      const distance = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        fence.center.lat,
        fence.center.lng
      );
      if (distance <= fence.radius) {
        return { isInside: true, distance };
      }
    } else if (fence.type === 'polygon' && fence.coordinates) {
      if (isPointInPolygon(userLocation, fence.coordinates)) {
        return { isInside: true };
      }
    }
  }

  return { isInside: false };
}

// Get current location with high accuracy
export function getCurrentLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
    } else {
      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    }
  });
}