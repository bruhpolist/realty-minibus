const apiUrl = process.env.SMOKE_API_URL ?? "http://localhost:4000";

async function check(pathname) {
  const url = `${apiUrl}${pathname}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Smoke check failed for ${url}: ${response.status}`);
  }
  return response.json();
}

async function run() {
  const health = await check("/health");
  const listings = await check("/api/listings?page=1&pageSize=5");

  if (!health?.ok) {
    throw new Error("Health endpoint did not return ok=true");
  }
  if (!Array.isArray(listings?.items)) {
    throw new Error("Listings endpoint did not return items array");
  }
  if (typeof listings?.total !== "number") {
    throw new Error("Listings endpoint did not return total");
  }

  console.log(
    `[smoke] ok. range=${health.range.min}-${health.range.max}. items=${listings.items.length}/${listings.total}`
  );
}

run().catch((error) => {
  console.error("[smoke] failed", error.message);
  process.exitCode = 1;
});
