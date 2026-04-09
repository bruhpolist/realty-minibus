export type LatLng = { lat: number; lng: number };

const CACHE_KEY = "realty-minibus:geocode:v1";
const MIN_COORD = 0.00001;
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function loadCache(): Record<string, LatLng> {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, LatLng>) : {};
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, LatLng>): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore storage quota errors
  }
}

export async function geocodeAddress(address: string): Promise<LatLng | null> {
  const key = address.toLowerCase().trim();
  if (!key) {
    return null;
  }

  const cache = loadCache();
  if (cache[key]) {
    return cache[key];
  }

  const url = `${API_URL}/api/geocode?address=${encodeURIComponent(address)}`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json"
      }
    });
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as { lat?: number; lng?: number };
    const lat = Number(data.lat);
    const lng = Number(data.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) < MIN_COORD) {
      return null;
    }
    const value = { lat, lng };
    cache[key] = value;
    saveCache(cache);
    return value;
  } catch {
    return null;
  }
}
