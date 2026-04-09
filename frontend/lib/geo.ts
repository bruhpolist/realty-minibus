import type { Listing } from "./types";

export type LatLng = { lat: number; lng: number };

const minskCenter: LatLng = { lat: 53.9, lng: 27.56 };

const districtCenters: Array<{ key: string; latLng: LatLng }> = [
  { key: "центр", latLng: { lat: 53.902, lng: 27.56 } },
  { key: "советский", latLng: { lat: 53.936, lng: 27.6 } },
  { key: "московский", latLng: { lat: 53.872, lng: 27.47 } },
  { key: "фрунзенский", latLng: { lat: 53.91, lng: 27.45 } },
  { key: "первомайский", latLng: { lat: 53.94, lng: 27.67 } },
  { key: "ленинский", latLng: { lat: 53.86, lng: 27.59 } },
  { key: "заводской", latLng: { lat: 53.86, lng: 27.67 } },
  { key: "каменная горка", latLng: { lat: 53.913, lng: 27.437 } },
  { key: "притыцкого", latLng: { lat: 53.908, lng: 27.487 } }
];

function hashToOffset(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return (Math.abs(hash) % 400) / 100_000;
}

function parseLatLngFromText(text: string): LatLng | null {
  const latMatch = text.match(/lat:\s*(-?\d+(?:\.\d+)?)/i);
  const lngMatch = text.match(/lng:\s*(-?\d+(?:\.\d+)?)/i);
  const lat = latMatch ? Number(latMatch[1]) : NaN;
  const lng = lngMatch ? Number(lngMatch[1]) : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return { lat, lng };
}

export function getListingCoordinates(listing: Listing): LatLng {
  const parsed = parseLatLngFromText(listing.address);
  if (parsed) {
    return parsed;
  }

  const lowerAddress = listing.address.toLowerCase();
  const center = districtCenters.find((item) => lowerAddress.includes(item.key))?.latLng ?? minskCenter;
  const offset = hashToOffset(listing.id);

  return {
    lat: center.lat + offset,
    lng: center.lng - offset
  };
}
