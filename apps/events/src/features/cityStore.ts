import { getSecure, CitySettings, DEFAULT_CITY_SETTINGS } from "@klk/infrastructure";
import { atom } from "nanostores";

const CITY_STORE_KEY = "city_settings";

export const $city = atom<CitySettings>(DEFAULT_CITY_SETTINGS);

export async function loadCity(): Promise<void> {
  const raw = await getSecure(CITY_STORE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      $city.set(parsed);
      return;
    } catch {
      // Fall through to default
    }
  }
  $city.set(DEFAULT_CITY_SETTINGS);
}

export function useCity(): string {
  return $city.get().name;
}

export function useDistanceRange(): import("@klk/infrastructure").DistanceRange {
  return $city.get().distanceRange;
}

export function useCityCoordinates(): import("@klk/infrastructure").Coordinates | null {
  return $city.get().coordinates;
}

export type { CitySettings };
