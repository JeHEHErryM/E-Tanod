/**
 * Server-side geofencing helpers.
 *
 * All checkpoint validation is computed here on the backend so that a client
 * can never fake a location or bypass the geofence.
 */

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_METERS = 6371000;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Haversine distance between two points in meters.
 */
export function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  const distanceMeters = 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
  return distanceMeters;
}

/**
 * Returns true when the scanned position is within `radiusMeters` of the
 * checkpoint center.
 */
export function isWithinRadius(
  checkpoint: GeoPoint,
  position: GeoPoint,
  radiusMeters: number,
): boolean {
  return haversineMeters(checkpoint, position) <= radiusMeters;
}
