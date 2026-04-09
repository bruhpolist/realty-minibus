type LatLng = {
  lat: number;
  lng: number;
};

const MIN_INTERVAL_MS = 1100;
const cache = new Map<string, LatLng>();
const inFlight = new Map<string, Promise<LatLng | null>>();
let lastRequestAt = 0;
let queue: Promise<void> = Promise.resolve();

function normalizeAddress(address: string): string {
  return address.trim().toLowerCase().replace(/\s+/g, " ");
}

function expandAddress(address: string): string {
  return address
    .replace(/\bул\.?\b/gi, "улица")
    .replace(/\bпр-?т\.?\b/gi, "проспект")
    .replace(/\bпер\.?\b/gi, "переулок")
    .replace(/\bд\.?\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function queryCandidates(address: string): string[] {
  const raw = address.trim();
  const expanded = expandAddress(raw);
  const hasMinsk = /минск|minsk/i.test(raw);
  const candidates = [
    raw,
    expanded,
    hasMinsk ? raw : `${raw}, Минск`,
    hasMinsk ? expanded : `${expanded}, Минск`,
    hasMinsk ? `${raw}, Беларусь` : `${raw}, Минск, Беларусь`,
    hasMinsk ? `${expanded}, Беларусь` : `${expanded}, Минск, Беларусь`
  ];

  const uniq = new Set(
    candidates
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => item.replace(/\s+/g, " "))
  );

  return [...uniq];
}

async function waitTurn(): Promise<void> {
  const now = Date.now();
  const wait = Math.max(0, MIN_INTERVAL_MS - (now - lastRequestAt));
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  lastRequestAt = Date.now();
}

async function callNominatim(query: string): Promise<LatLng | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "0");
  url.searchParams.set("countrycodes", "by");
  url.searchParams.set("q", query);

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "realty-minibus/1.0 (local-dev)"
    }
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as Array<{ lat?: string; lon?: string }>;
  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  const lat = Number(data[0].lat);
  const lng = Number(data[0].lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { lat, lng };
}

export async function geocodeAddress(address: string): Promise<LatLng | null> {
  const key = normalizeAddress(address);
  if (!key) {
    return null;
  }

  const cached = cache.get(key);
  if (cached) {
    return cached;
  }

  const existingPromise = inFlight.get(key);
  if (existingPromise) {
    return existingPromise;
  }

  const task = (async () => {
    for (const candidate of queryCandidates(address)) {
      queue = queue.then(waitTurn).catch(() => undefined);
      await queue;

      const result = await callNominatim(candidate);
      if (result) {
        cache.set(key, result);
        return result;
      }
    }
    return null;
  })();

  inFlight.set(key, task);
  try {
    return await task;
  } finally {
    inFlight.delete(key);
  }
}
