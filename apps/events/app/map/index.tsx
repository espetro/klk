import { CityPicker } from '@/components';
import { $city, useCity } from '@/features';

function handleCityChange(newCity: string) {
  $city.set({ ...$city.get(), name: newCity });
}

export default function MapScreen() {
  const city = useCity();

  return <CityPicker current={city} onChange={handleCityChange} />;
}
