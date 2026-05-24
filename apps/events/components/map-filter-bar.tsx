import { HostedButton as Button } from "@/components/hosted-button";
import { CITIES, Coordinates, DistanceRange, DISTANCE_RANGES } from "@klk/infrastructure";
import { View, Text } from "react-native";

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
            label={cityLabel}
            variant="outlined"
            onPress={() => onCityChange(selectedCitySlug)}
          />
        </View>
        <View className="flex-row items-center gap-1">
          <Text className="text-xs font-medium text-gray-500 uppercase tracking-wide">Within</Text>
          {DISTANCE_RANGES.map((range) => (
            <Button
              key={range}
              label={`${range}km`}
              variant={distanceRange === range ? "filled" : "outlined"}
              onPress={() => onDistanceChange(range)}
            />
          ))}
        </View>
      </View>
    </View>
  );
}
