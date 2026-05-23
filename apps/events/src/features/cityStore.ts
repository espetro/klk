import { persistentAtom, StorageEngine } from "@nanostores/persistent";
import { getSecure, setSecure } from "@klk/infrastructure";
import { CitySettings, DEFAULT_CITY_SETTINGS } from "@klk/infrastructure";

const CITY_STORE_KEY = "city_settings";

const secureStorageEngine: StorageEngine = {
  async getItem(_key: string): Promise<string | null> {
    return getSecure(CITY_STORE_KEY);
  },
  async setItem(_key: string, value: string): Promise<void> {
    await setSecure(CITY_STORE_KEY, value);
  },
};

export const $city = persistentAtom<CitySettings>(CITY_STORE_KEY, DEFAULT_CITY_SETTINGS, {
  storage: secureStorageEngine,
  experimental_jsonStorage: false,
});

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
