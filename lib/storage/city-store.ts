import { deleteSecure, getSecure, setSecure } from "./secure";
import { Coordinates, DEFAULT_DISTANCE_RANGE, DISTANCE_RANGES, DistanceRange } from "@/lib/nostr/geo";

const CITY_KEY = "city_settings";

export interface CitySettings {
  name: string;
  distanceRange: DistanceRange;
  coordinates: Coordinates | null;
}

export const DEFAULT_CITY_SETTINGS: CitySettings = {
  name: "barcelona",
  distanceRange: DEFAULT_DISTANCE_RANGE,
  coordinates: null,
};

export async function loadCitySettings(): Promise<CitySettings> {
  const raw = await getSecure(CITY_KEY);
  if (!raw) return DEFAULT_CITY_SETTINGS;
  try {
    const parsed = JSON.parse(raw);
    return {
      name: typeof parsed.name === "string" ? parsed.name : DEFAULT_CITY_SETTINGS.name,
      distanceRange: DISTANCE_RANGES.includes(parsed.distanceRange)
        ? parsed.distanceRange
        : DEFAULT_CITY_SETTINGS.distanceRange,
      coordinates:
        parsed.coordinates &&
        typeof parsed.coordinates.latitude === "number" &&
        typeof parsed.coordinates.longitude === "number"
          ? parsed.coordinates
          : null,
    };
  } catch {
    return DEFAULT_CITY_SETTINGS;
  }
}

export async function saveCitySettings(settings: CitySettings): Promise<void> {
  await setSecure(CITY_KEY, JSON.stringify(settings));
}

export async function clearCitySettings(): Promise<void> {
  await deleteSecure(CITY_KEY);
}
