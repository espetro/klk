// EventMap — thin adapter over MapLibre GL JS rendering events that carry a
// `geo` tag. Tiles: OpenFreeMap (no API key, self-hostable later).
import { useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { CalendarEvent } from "@klk/core";
import { useMountEffect } from "./use-mount-effect.ts";

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

export const EventMap = ({
  events,
  height = 240,
}: {
  events: CalendarEvent[];
  height?: number;
}) => {
  const withGeo = events.filter((e) => e.geo !== undefined);
  // remount a fresh map when the pin set changes
  const geoKey = withGeo.map((e) => `${e.id}:${e.geo?.join(",")}`).join("|");
  return <EventMapInner key={geoKey} events={withGeo} height={height} />;
};

const EventMapInner = ({ events, height }: { events: CalendarEvent[]; height: number }) => {
  const ref = useRef<HTMLDivElement>(null);

  useMountEffect(function mountEventMap() {
    if (ref.current === null) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: STYLE_URL,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    const bounds = new maplibregl.LngLatBounds();
    for (const ev of events) {
      const [lat, lon] = ev.geo!;
      new maplibregl.Marker({ color: "#111111" })
        .setLngLat([lon, lat])
        .setPopup(new maplibregl.Popup({ offset: 18 }).setText(ev.title))
        .addTo(map);
      bounds.extend([lon, lat]);
    }
    if (events.length > 0) {
      map.fitBounds(bounds, { padding: 48, maxZoom: 13, duration: 0 });
    } else {
      map.setCenter([0, 20]);
      map.setZoom(1.2);
    }
    return function removeEventMap() {
      map.remove();
    };
  });

  return (
    <div
      ref={ref}
      style={{
        height,
        width: "100%",
        borderRadius: 10,
        border: "1px solid #EAEAEA",
        overflow: "hidden",
      }}
    />
  );
};
