import { View, Text, TextInput, Pressable, ScrollView, Alert } from "react-native";
import { useState, useCallback } from "react";
import * as Location from "expo-location";
import { CITIES } from "@klk/infrastructure";
import { DistanceRange, DISTANCE_RANGES, DEFAULT_DISTANCE_RANGE } from "@klk/infrastructure";

export interface LocationSelection {
  city: string;
  lat?: number;
  lon?: number;
  distance: DistanceRange;
}

export interface LocationPickerProps {
  value: LocationSelection;
  onChange: (selection: LocationSelection) => void;
}

const PRESET_CITIES = [
  { slug: "madrid", label: "Madrid" },
  { slug: "barcelona", label: "Barcelona" },
  { slug: "valencia", label: "Valencia" },
  { slug: "seville", label: "Seville" },
  { slug: "bilbao", label: "Bilbao" },
];

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isLocating, setIsLocating] = useState(false);

  const suggestions = searchQuery.trim()
    ? CITIES.filter(
        (c) =>
          c.label.toLowerCase().includes(searchQuery.toLowerCase()) &&
          c.label.toLowerCase() !== searchQuery.toLowerCase(),
      ).slice(0, 5)
    : [];

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  const handleCitySelect = useCallback(
    (slug: string, label: string) => {
      onChange({
        city: slug,
        distance: value.distance,
      });
      setSearchQuery(label);
    },
    [onChange, value.distance],
  );

  const handleDistanceChange = useCallback(
    (distance: DistanceRange) => {
      onChange({
        ...value,
        distance,
      });
    },
    [onChange, value],
  );

  const handleUseCurrentLocation = useCallback(async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied", "Location permission is required to use this feature.");
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      });

      onChange({
        city: "current",
        lat: location.coords.latitude,
        lon: location.coords.longitude,
        distance: value.distance,
      });
      setSearchQuery("Current location");
    } catch (_err) {
      Alert.alert("Error", "Unable to get your current location.");
    } finally {
      setIsLocating(false);
    }
  }, [onChange, value.distance]);

  return (
    <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <View className="mb-4">
        <Text className="text-sm font-medium text-gray-700 mb-2">Search city</Text>
        <TextInput
          className="bg-gray-50 rounded-lg px-4 py-3 text-gray-900 border border-gray-200"
          placeholder="Type a city name..."
          value={searchQuery}
          onChangeText={handleSearchChange}
          autoCapitalize="words"
          autoCorrect={false}
        />
        {suggestions.length > 0 && (
          <View className="mt-1 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
            {suggestions.map((city) => (
              <Pressable
                key={city.slug}
                onPress={() => handleCitySelect(city.slug, city.label)}
                className="px-4 py-3 border-b border-gray-100 last:border-b-0"
              >
                <Text className="text-gray-900">{city.label}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <Pressable
        onPress={handleUseCurrentLocation}
        disabled={isLocating}
        className="flex-row items-center bg-gray-50 rounded-lg px-4 py-3 mb-4 border border-gray-200"
      >
        <Text className="text-indigo-600 font-medium">
          {isLocating ? "Getting location..." : "Use current location"}
        </Text>
      </Pressable>

      <View className="mb-4">
        <Text className="text-sm font-medium text-gray-700 mb-2">Popular cities</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
          {PRESET_CITIES.map((c) => (
            <Pressable
              key={c.slug}
              onPress={() => handleCitySelect(c.slug, c.label)}
              className={`mr-2 px-4 py-2 rounded-full ${
                value.city === c.slug ? "bg-indigo-600" : "bg-gray-100"
              }`}
            >
              <Text className={value.city === c.slug ? "text-white font-medium" : "text-gray-700"}>
                {c.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View>
        <Text className="text-sm font-medium text-gray-700 mb-2">Distance range</Text>
        <View className="flex-row flex-wrap gap-2">
          {DISTANCE_RANGES.map((range) => (
            <Pressable
              key={range}
              onPress={() => handleDistanceChange(range)}
              className={`px-4 py-2 rounded-full ${
                value.distance === range ? "bg-indigo-600" : "bg-gray-100"
              }`}
            >
              <Text
                className={value.distance === range ? "text-white font-medium" : "text-gray-700"}
              >
                {range} km
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}
