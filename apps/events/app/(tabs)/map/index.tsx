import { CityPicker, EventMapView } from "@/components";
import { $city, useCity, useCityCoordinates, usePublicEvents } from "@/features";

function handleCityChange(newCity: string) {
  $city.set({ ...$city.get(), name: newCity });
}

export default function MapScreen() {
  const city = useCity();
  const coordinates = useCityCoordinates();
  const { events } = usePublicEvents();

  return (
    <>
      <CityPicker current={city} onChange={handleCityChange} />
      <EventMapView events={events} selectedCity={coordinates} />
    </>
  );
}
