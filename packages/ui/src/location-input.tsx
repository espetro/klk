// LocationInput — free-text place input that resolves either a place
// name (Nominatim search) or a pasted Google/Apple Maps link into a
// geopin. Picking a suggestion pins the event on the map.
import { useRef, useState } from "react";
import { Input, Text, XStack, YStack } from "tamagui";
import { palette } from "./palette.ts";

/** Reverse-geocode a coordinate to a city/town name (Nominatim). */
export async function lookupCity(lat: number, lon: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
    );
    const data = (await res.json()) as {
      address?: { city?: string; town?: string; village?: string; municipality?: string };
    };
    const a = data.address;
    return a?.city ?? a?.town ?? a?.village ?? a?.municipality ?? null;
  } catch {
    return null;
  }
}

interface Hit {
  label: string;
  geo: [number, number];
}

// Pull coords out of common maps URLs without a network call:
//   Google: …/@<lat>,<lon>,… or ?q=<lat>,<lon>
//   Apple:  ?ll=<lat>,<lon> or ?q=<lat>,<lon>
// Falls back to the /place/<name> fragment as the label when no coords.
const mapsLink = (v: string): { label?: string; geo?: [number, number] } | null => {
  if (
    !/^https?:\/\//i.test(v) &&
    !/^(www\.)?(maps\.app\.goo\.gl|google\.[a-z.]+\/maps|maps\.apple\.com)/i.test(v)
  ) {
    return null;
  }
  const place = decodeURIComponent(v.match(/\/place\/([^/?#]+)/)?.[1] ?? "");
  const named = place !== "" ? { label: place.replace(/\+/g, " ") } : {};
  const at = v.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (at !== null) return { geo: [Number(at[1]), Number(at[2])], ...named };
  const ll = v.match(/[?&](?:ll|q|query)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (ll !== null) return { geo: [Number(ll[1]), Number(ll[2])], ...named };
  return named;
};

const searchPlaces = async (q: string): Promise<Hit[]> => {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) return [];
  const rows = (await res.json()) as { display_name: string; lat: string; lon: string }[];
  return rows.map((r) => ({
    label: r.display_name.split(",").slice(0, 3).join(",").trim(),
    geo: [Number(r.lat), Number(r.lon)] as [number, number],
  }));
};

export const LocationInput = ({
  value,
  geo,
  onChange,
  onPick,
}: {
  value: string;
  geo: readonly [number, number] | undefined;
  onChange: (text: string) => void;
  /** picked a resolved place — label + pin */
  onPick: (label: string, geo: [number, number]) => void;
}) => {
  const [hits, setHits] = useState<Hit[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const changed = (text: string) => {
    onChange(text);
    if (timer.current !== null) clearTimeout(timer.current);
    const link = mapsLink(text.trim());
    if (link?.geo !== undefined) {
      setHits([]);
      onPick(link.label ?? "Dropped pin", link.geo);
      return;
    }
    const q = (link?.label ?? text).trim();
    if (q.length < 3) {
      setHits([]);
      return;
    }
    timer.current = setTimeout(() => {
      void searchPlaces(q)
        .then(setHits)
        .catch(() => setHits([]));
    }, 400);
  };

  return (
    <YStack position="relative">
      <Input
        value={value}
        onChangeText={changed}
        placeholder="Place name, or paste a Google/Apple Maps link"
        borderColor={palette.border}
        backgroundColor={palette.surface}
      />
      {geo !== undefined ? (
        <XStack gap={6} alignItems="center" marginTop={4}>
          <YStack width={6} height={6} borderRadius={3} backgroundColor={palette.pastelGreenInk} />
          <Text fontSize={12} color={palette.pastelGreenInk}>
            Pinned on the map
          </Text>
        </XStack>
      ) : (
        <Text fontSize={11} color={palette.muted} marginTop={4}>
          Pick a suggestion to pin it — or paste a Maps link.
        </Text>
      )}
      {hits.length > 0 ? (
        <YStack
          position="absolute"
          top="100%"
          left={0}
          right={0}
          zIndex={20}
          backgroundColor={palette.surface}
          borderWidth={1}
          borderColor={palette.border}
          borderRadius={8}
          overflow="hidden"
          shadowColor="#000"
          shadowOpacity={0.08}
          shadowRadius={12}
        >
          {hits.map((h) => (
            <YStack
              key={h.label + h.geo.join(",")}
              padding="$2.5"
              cursor="pointer"
              pressStyle={{ backgroundColor: palette.canvas }}
              onPress={() => {
                setHits([]);
                onPick(h.label, h.geo);
              }}
            >
              <Text fontSize={13} color={palette.ink}>
                {h.label}
              </Text>
            </YStack>
          ))}
        </YStack>
      ) : null}
    </YStack>
  );
};
