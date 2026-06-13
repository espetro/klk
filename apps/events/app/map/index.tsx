import { CityPicker } from '@/components';
import { saveCity, useCity } from '@/features';

function handleCityChange(newCity: string) {
  saveCity(newCity).catch(() => {});
}

export default function MapScreen() {
  const city = useCity();

  return <CityPicker current={city} onChange={handleCityChange} />;
}
