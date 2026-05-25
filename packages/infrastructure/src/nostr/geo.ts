export type Coordinates = { latitude: number; longitude: number };

export type DistanceRange = 5 | 10 | 25 | 50 | 100;

export const DISTANCE_RANGES: readonly DistanceRange[] = [5, 10, 25, 50, 100] as const;

export const DEFAULT_DISTANCE_RANGE: DistanceRange = 10;

const EARTH_RADIUS_METERS = 6_371_000;

const toRad = (deg: number) => (deg * Math.PI) / 180;

export function haversineDistance(a: Coordinates, b: Coordinates): number {
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);

  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);

  const x = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  const centralAngle = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));

  return EARTH_RADIUS_METERS * centralAngle;
}

export function resolveAddress(_address: string): Promise<{ lat: number; lon: number } | null> {
  throw new Error('resolveAddress requires expo-location (Wave 3)');
}

export function reverseGeocodeCity(_coords: Coordinates): Promise<string | null> {
  throw new Error('reverseGeocodeCity requires expo-location (Wave 3)');
}

export function geocodeCityName(_cityName: string): Promise<Coordinates | null> {
  throw new Error('geocodeCityName requires expo-location (Wave 3)');
}
