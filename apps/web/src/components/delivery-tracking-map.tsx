import { useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export type TrackingPoint = {
  lat: number;
  lng: number;
  label?: string;
};

export type DeliveryTrackingMapProps = {
  driver?: TrackingPoint | null;
  pickup?: TrackingPoint | null;
  dropoff?: TrackingPoint | null;
  phase?: 'to_shop' | 'to_customer' | 'idle' | 'done';
  className?: string;
};

function divIcon(color: string, emoji: string) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:36px;height:36px;border-radius:9999px;
      background:${color};border:2px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,.35);
      display:flex;align-items:center;justify-content:center;
      font-size:16px;line-height:1;
    ">${emoji}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}

const driverIcon = divIcon('#0f766e', '🛵');
const shopIcon = divIcon('#f59e0b', '🏪');
const homeIcon = divIcon('#2563eb', '📍');

function FitBounds({
  points,
}: {
  points: { lat: number; lng: number }[];
}) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 14);
      return;
    }
    const bounds = L.latLngBounds(
      points.map((p) => [p.lat, p.lng] as [number, number]),
    );
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }, [map, points]);
  return null;
}

/** Keep map following the live driver when coords change. */
function FollowDriver({ driver }: { driver?: TrackingPoint | null }) {
  const map = useMap();
  useEffect(() => {
    if (!driver) return;
    map.panTo([driver.lat, driver.lng], { animate: true });
  }, [map, driver?.lat, driver?.lng]);
  return null;
}

export function DeliveryTrackingMap({
  driver,
  pickup,
  dropoff,
  phase = 'idle',
  className,
}: DeliveryTrackingMapProps) {
  const points = useMemo(() => {
    const list: { lat: number; lng: number }[] = [];
    if (driver) list.push(driver);
    if (pickup) list.push(pickup);
    if (dropoff) list.push(dropoff);
    return list;
  }, [driver, pickup, dropoff]);

  const center = points[0] ?? { lat: -6.7924, lng: 39.2083 }; // Dar fallback

  const routeLine = useMemo(() => {
    if (!driver) return null;
    if (phase === 'to_shop' && pickup) {
      return [
        [driver.lat, driver.lng] as [number, number],
        [pickup.lat, pickup.lng] as [number, number],
      ];
    }
    if (phase === 'to_customer' && dropoff) {
      return [
        [driver.lat, driver.lng] as [number, number],
        [dropoff.lat, dropoff.lng] as [number, number],
      ];
    }
    return null;
  }, [driver, pickup, dropoff, phase]);

  if (!points.length) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl border border-border bg-muted text-sm text-muted-foreground ${className ?? 'h-56'}`}
      >
        Waiting for location data…
      </div>
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-border ${className ?? 'h-56'}`}
    >
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={13}
        className="h-full w-full z-0"
        scrollWheelZoom={false}
        attributionControl
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />
        <FollowDriver driver={driver} />
        {routeLine && (
          <Polyline
            positions={routeLine}
            pathOptions={{
              color: '#0f766e',
              weight: 4,
              opacity: 0.75,
              dashArray: '8 8',
            }}
          />
        )}
        {pickup && (
          <Marker position={[pickup.lat, pickup.lng]} icon={shopIcon}>
            <Popup>{pickup.label || 'Pickup (shop)'}</Popup>
          </Marker>
        )}
        {dropoff && (
          <Marker position={[dropoff.lat, dropoff.lng]} icon={homeIcon}>
            <Popup>{dropoff.label || 'Your delivery address'}</Popup>
          </Marker>
        )}
        {driver && (
          <Marker position={[driver.lat, driver.lng]} icon={driverIcon}>
            <Popup>{driver.label || 'Driver'}</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}

/** Haversine distance in km */
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) *
      Math.cos(toRad(b.lat)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
}

/** Rough ETA minutes assuming city motorcycle ~22 km/h average. */
export function etaMinutes(km: number, speedKmh = 22): number {
  if (km <= 0) return 0;
  return Math.max(1, Math.round((km / speedKmh) * 60));
}
