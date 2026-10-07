// DiscoveryMap — full-bleed map of upcoming events across the user's
// circles. Pins take the circle's deterministic accent color; a tapped
// pin pops a card that routes to the event.
import { useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { CalendarEvent } from "@klk/core";
import { circleColor } from "@klk/core";
import { useMountEffect } from "./use-mount-effect.ts";

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

export interface DiscoveryPin {
  event: CalendarEvent;
  circleName: string;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const pinPopup = (pin: DiscoveryPin, onOpen: (event: CalendarEvent) => void): HTMLElement => {
  const root = document.createElement("div");
  const when = new Date(pin.event.starts * 1000).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  root.innerHTML = `<div style="font-family:inherit;min-width:160px">
    <div style="font-size:11px;color:${circleColor(pin.event.coord)};text-transform:uppercase;letter-spacing:.06em;font-weight:600">${esc(pin.circleName)}</div>
    <div style="font-size:15px;font-weight:600;color:#111;margin:2px 0">${esc(pin.event.title)}</div>
    <div style="font-size:12px;color:#787774;margin-bottom:8px">${esc(when)}${pin.event.location !== undefined ? " · " + esc(pin.event.location) : ""}</div>
    <button data-open style="width:100%;border:0;background:#111;color:#fff;border-radius:6px;padding:7px 0;font-size:13px;cursor:pointer">View event</button>
  </div>`;
  root.querySelector("[data-open]")?.addEventListener("click", () => onOpen(pin.event));
  return root;
};

export const DiscoveryMap = ({
  pins,
  onOpen,
}: {
  pins: DiscoveryPin[];
  onOpen: (event: CalendarEvent) => void;
}) => {
  // remount on pin-set change (same pattern as EventMap): tile caching
  // makes the swap cheap, and markers/popups are rebuilt atomically
  const pinKey = pins.map((p) => `${p.event.coord}:${p.event.id}`).join("|");
  return <DiscoveryMapInner key={pinKey} pins={pins} onOpen={onOpen} />;
};

const DiscoveryMapInner = ({
  pins,
  onOpen,
}: {
  pins: DiscoveryPin[];
  onOpen: (event: CalendarEvent) => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useMountEffect(function mountDiscoveryMap() {
    if (ref.current === null) return;
    const map = new maplibregl.Map({
      container: ref.current,
      style: STYLE_URL,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    const bounds = new maplibregl.LngLatBounds();
    for (const pin of pins) {
      const [lat, lon] = pin.event.geo!;
      new maplibregl.Marker({ color: circleColor(pin.event.coord) })
        .setLngLat([lon, lat])
        .setPopup(
          new maplibregl.Popup({ offset: 20, closeButton: false }).setDOMContent(
            pinPopup(pin, onOpen),
          ),
        )
        .addTo(map);
      bounds.extend([lon, lat]);
    }
    if (pins.length > 0) {
      map.fitBounds(bounds, { padding: 72, maxZoom: 12, duration: 0 });
    } else {
      map.setCenter([0, 30]);
      map.setZoom(1.4);
    }
    return function removeDiscoveryMap() {
      map.remove();
    };
  });

  return <div ref={ref} style={{ position: "absolute", inset: 0 }} />;
};
