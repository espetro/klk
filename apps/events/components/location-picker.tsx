import { HostedButton as Button } from '@/components/hosted-button';
import { HostedInput as Input } from '@/components/hosted-input';
import { CITIES, haversineDistance, DistanceRange, DISTANCE_RANGES } from '@klk/infrastructure';
import * as Location from 'expo-location';
import { err, ok } from 'neverthrow';
import { useState, useCallback } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';

export interface LocationSelection {
  city: string;
  lat?: number;
  lon?: number;
  distance: DistanceRange;
}

const fetchCurrentLocation = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== 'granted') {
      return err([
        'Permission denied',
        'Location permission is required to use this feature.',
      ] as const);
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Low,
    });

    return ok({
      lat: location.coords.latitude,
      lon: location.coords.longitude,
    });
  } catch {
    return err(['Error', 'Unable to get your current location.'] as const);
  }
};

export interface LocationPickerProps {
  value: LocationSelection;
  onChange: (selection: LocationSelection) => void;
}

const normalizeSearch = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  const normalizedQuery = normalizeSearch(searchQuery.trim());
  const suggestions = normalizedQuery
    ? CITIES.filter(
        (c) =>
          normalizeSearch(c.label).includes(normalizedQuery) &&
          normalizeSearch(c.label) !== normalizedQuery
      ).slice(0, 5)
    : [];

  const handleSearchChange = useCallback(function handleSearchChange(text: string) {
    setSearchQuery(text);
  }, []);

  const handleCitySelect = useCallback(
    function handleCitySelect(slug: string, label: string) {
      const canonical = CITIES.find((c) => c.slug === slug);
      onChange({
        city: slug,
        lat: canonical?.coordinates.latitude,
        lon: canonical?.coordinates.longitude,
        distance: value.distance,
      });
      setSearchQuery(label);
    },
    [onChange, value.distance]
  );

  const handleDistanceChange = useCallback(
    function handleDistanceChange(distance: DistanceRange) {
      onChange({
        ...value,
        distance,
      });
    },
    [onChange, value]
  );

  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    const response = await fetchCurrentLocation();

    response.match(
      (location) => {
        const coords = { latitude: location.lat, longitude: location.lon };
        const nearest = CITIES.reduce((best, c) =>
          haversineDistance(coords, c.coordinates) <
          haversineDistance(coords, best.coordinates)
            ? c
            : best
        );
        onChange({
          city: nearest.slug,
          lat: nearest.coordinates.latitude,
          lon: nearest.coordinates.longitude,
          distance: value.distance,
        });
        setSearchQuery(nearest.label);
      },
      ([title, message]) => {
        Alert.alert(title, message);
      }
    );
    setIsLocating(false);
  };

  return (
    <View className='bg-white rounded-xl p-4 shadow-sm border border-gray-100'>
      <View className='mb-4'>
        <Text className='text-sm font-medium text-gray-700 mb-2'>Search city</Text>
        <Input
          placeholder='Type a city name...'
          value={searchQuery}
          onChangeText={handleSearchChange}
          autoCapitalize='words'
          autoCorrect={false}
        />
        {suggestions.length > 0 && (
          <View className='mt-1 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden'>
            {suggestions.map((city) => (
              <View key={city.slug} className='border-b border-gray-100 last:border-b-0'>
                <Button
                  label={city.label}
                  variant='text'
                  onPress={() => handleCitySelect(city.slug, city.label)}
                />
              </View>
            ))}
          </View>
        )}
      </View>

      <View className='mb-4'>
        <Button
          label={isLocating ? 'Getting location...' : 'Use current location'}
          variant='outlined'
          onPress={handleUseCurrentLocation}
          disabled={isLocating}
        />
      </View>

      <View className='mb-4'>
        <Text className='text-sm font-medium text-gray-700 mb-2'>Popular cities</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className='flex-row'>
          {CITIES.map((c) => (
            <View key={c.slug} className='mr-2'>
              <Button
                label={c.label}
                onPress={() => handleCitySelect(c.slug, c.label)}
                variant={value.city === c.slug ? 'filled' : 'outlined'}
              />
            </View>
          ))}
        </ScrollView>
      </View>

      <View>
        <Text className='text-sm font-medium text-gray-700 mb-2'>Distance range</Text>
        <View className='flex-row flex-wrap gap-2'>
          {DISTANCE_RANGES.map((range) => (
            <Button
              key={range}
              label={`${range} km`}
              onPress={() => handleDistanceChange(range)}
              variant={value.distance === range ? 'filled' : 'outlined'}
            />
          ))}
        </View>
      </View>
    </View>
  );
}
