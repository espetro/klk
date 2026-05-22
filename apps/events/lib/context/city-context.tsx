import { createContext, useContext, useEffect, useState } from "react";
import { Coordinates, DEFAULT_DISTANCE_RANGE, DistanceRange } from "@/lib/nostr/geo";
import {
  CitySettings,
  DEFAULT_CITY_SETTINGS,
  loadCitySettings,
  saveCitySettings,
} from "@/lib/storage/city-store";

export interface CityContextValue {
  city: string;
  setCity: (name: string) => void;
  distanceRange: DistanceRange;
  setDistanceRange: (range: DistanceRange) => void;
  coordinates: Coordinates | null;
  setCoordinates: (coords: Coordinates | null) => void;
  settings: CitySettings;
  updateSettings: (settings: Partial<CitySettings>) => void;
}

export const CityContext = createContext<CityContextValue | null>(null);

export function CityProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<CitySettings>(DEFAULT_CITY_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadCitySettings().then((s) => {
      if (!cancelled) {
        setSettings(s);
        setLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = (next: CitySettings) => {
    setSettings(next);
    saveCitySettings(next);
  };

  const setCity = (name: string) => {
    persist({ ...settings, name });
  };

  const setDistanceRange = (distanceRange: DistanceRange) => {
    persist({ ...settings, distanceRange });
  };

  const setCoordinates = (coordinates: Coordinates | null) => {
    persist({ ...settings, coordinates });
  };

  const updateSettings = (partial: Partial<CitySettings>) => {
    persist({ ...settings, ...partial });
  };

  if (!loaded) return null;

  return (
    <CityContext.Provider
      value={{
        city: settings.name,
        setCity,
        distanceRange: settings.distanceRange,
        setDistanceRange,
        coordinates: settings.coordinates,
        setCoordinates,
        settings,
        updateSettings,
      }}
    >
      {children}
    </CityContext.Provider>
  );
}

export function useCity(): string {
  const ctx = useContext(CityContext);
  if (!ctx) throw new Error("useCity must be used within CityProvider");
  return ctx.city;
}

export function useDistanceRange(): DistanceRange {
  const ctx = useContext(CityContext);
  if (!ctx) throw new Error("useDistanceRange must be used within CityProvider");
  return ctx.distanceRange;
}

export function useCityCoordinates(): Coordinates | null {
  const ctx = useContext(CityContext);
  if (!ctx) throw new Error("useCityCoordinates must be used within CityProvider");
  return ctx.coordinates;
}

export function useCityContext(): CityContextValue {
  const ctx = useContext(CityContext);
  if (!ctx) throw new Error("useCityContext must be used within CityProvider");
  return ctx;
}
