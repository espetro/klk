import { View, Text } from "react-native";
import { Button } from "@klk/ui";
import { CITIES, Coordinates, DistanceRange, DISTANCE_RANGES } from "@klk/infrastructure";

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
          <Button
            onPress={() => onCityChange(selectedCitySlug)}
            variant="secondary"
            size="sm"
          >
            <Text className="text-sm font-medium text-indigo-700">{cityLabel}</Text>
          </Button>
        </View>
        <View className="flex-row items-center gap-1">
          <Text className="text-xs font-medium text-gray-500 uppercase tracking-wide">Within</Text>
          {DISTANCE_RANGES.map((range) => (
            <Button
              key={range}
              onPress={() => onDistanceChange(range)}
              variant={distanceRange === range ? "default" : "secondary"}
              size="sm"
              className={distanceRange === range ? "" : "bg-gray-100"}
            >
              <Text
                className={`text-xs font-medium ${
                  distanceRange === range ? "text-white" : "text-gray-600"
                }`}
              >
                {range}km
              </Text>
            </Button>
          ))}
        </View>
      </View>
    </View>
  );
}
