import { HostedButton as Button } from '@/components/hosted-button';
import { HostedInput as Input } from '@/components/hosted-input';
import { CITIES, DistanceRange, DISTANCE_RANGES } from '@klk/infrastructure';
import * as Location from 'expo-location';
import { useState, useCallback } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';

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
  { slug: 'madrid', label: 'Madrid' },
  { slug: 'barcelona', label: 'Barcelona' },
  { slug: 'valencia', label: 'Valencia' },
  { slug: 'seville', label: 'Seville' },
  { slug: 'bilbao', label: 'Bilbao' },
];

export function LocationPicker({ value, onChange }: LocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  const suggestions = searchQuery.trim()
    ? CITIES.filter(
        (c) =>
          c.label.toLowerCase().includes(searchQuery.toLowerCase()) &&
          c.label.toLowerCase() !== searchQuery.toLowerCase()
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
    [onChange, value.distance]
  );

  const handleDistanceChange = useCallback(
    (distance: DistanceRange) => {
      onChange({
        ...value,
        distance,
      });
    },
    [onChange, value]
  );

  const handleUseCurrentLocation = useCallback(async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to use this feature.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      });

      onChange({
        city: 'current',
        lat: location.coords.latitude,
        lon: location.coords.longitude,
        distance: value.distance,
      });
      setSearchQuery('Current location');
    } catch {
      Alert.alert('Error', 'Unable to get your current location.');
    } finally {
      setIsLocating(false);
    }
  }, [onChange, value.distance]);

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
          {PRESET_CITIES.map((c) => (
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
