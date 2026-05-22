import { View, Text, Pressable } from "react-native";
import { CITIES } from "@/lib/nostr/tags";
import { Coordinates, DistanceRange, DISTANCE_RANGES } from "@/lib/nostr/geo";

interface MapFilterBarProps {
  selectedCity: Coordinates;
  selectedCitySlug: string;
  distanceRange: DistanceRange;
  onCityChange: (slug: string) => void;
  onDistanceChange: (range: DistanceRange) => void;
}

export function MapFilterBar({
  selectedCitySlug,
  distanceRange,
  onCityChange,
  onDistanceChange,
}: MapFilterBarProps) {
  const cityLabel = CITIES.find((c) => c.slug === selectedCitySlug)?.label ?? selectedCitySlug;

  return (
    <View className="bg-white/90 px-4 py-3 gap-2 shadow-sm">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Text className="text-xs font-medium text-gray-500 uppercase tracking-wide">City</Text>
          <Pressable
            onPress={() => onCityChange(selectedCitySlug)}
            className="bg-indigo-50 px-3 py-1 rounded-full"
          >
            <Text className="text-sm font-medium text-indigo-700">{cityLabel}</Text>
          </Pressable>
        </View>
        <View className="flex-row items-center gap-1">
          <Text className="text-xs font-medium text-gray-500 uppercase tracking-wide">Within</Text>
          {DISTANCE_RANGES.map((range) => (
            <Pressable
              key={range}
              onPress={() => onDistanceChange(range)}
              className={`px-2.5 py-1 rounded-full ${
                distanceRange === range ? "bg-indigo-600" : "bg-gray-100"
              }`}
            >
              <Text
                className={`text-xs font-medium ${
                  distanceRange === range ? "text-white" : "text-gray-600"
                }`}
              >
                {range}km
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}
