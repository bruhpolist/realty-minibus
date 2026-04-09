import { expect, test } from "@playwright/test";

const items = [
  {
    id: "a1",
    source: "realt.by",
    url: "https://example.com/1",
    priceBYN: 1200,
    priceUSD: 363,
    address: "Минск, Центр, ул. Притыцкого 15",
    rooms: 2,
    area: 55,
    features: ["wifi", "балкон", "мебель"],
    images: ["https://picsum.photos/seed/a1/800/600"],
    hash: "h1",
    createdAt: new Date().toISOString()
  },
  {
    id: "a2",
    source: "kufar.by",
    url: "https://example.com/2",
    priceBYN: 1000,
    priceUSD: 303,
    address: "Минск, Московский",
    rooms: 1,
    area: 36,
    features: ["ремонт"],
    images: [],
    hash: "h2",
    createdAt: new Date().toISOString()
  }
];

test.beforeEach(async ({ page }) => {
  await page.route("http://localhost:4000/api/listings**", async (route) => {
    const url = new URL(route.request().url());
    const tags = (url.searchParams.get("tags") ?? "").split(",").filter(Boolean);
    const rooms = (url.searchParams.get("rooms") ?? "")
      .split(",")
      .filter(Boolean)
      .map((value) => Number(value));

    let filtered = items;
    if (tags.length > 0) {
      filtered = filtered.filter((item) => tags.every((tag) => item.features.includes(tag)));
    }
    if (rooms.length > 0) {
      filtered = filtered.filter((item) => (item.rooms ? rooms.includes(item.rooms) : false));
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: filtered })
    });
  });
});

test("renders listing cards", async ({ page }) => {
  await page.goto("/listings");
  await expect(page.getByTestId("listings-grid")).toBeVisible();
  await expect(page.getByTestId("listing-card")).toHaveCount(2);
  await expect(page.getByText("1200 BYN")).toBeVisible();
});

test("applies tag filter", async ({ page }) => {
  await page.goto("/listings");
  await page.getByTestId("tags-filter").getByLabel("wifi").check();
  await expect(page.getByTestId("listing-card")).toHaveCount(1);
  await expect(page.getByText("1000 BYN")).toHaveCount(0);
});

test("applies room filter", async ({ page }) => {
  await page.goto("/listings");
  await page.getByTestId("rooms-filter").getByLabel("1k").check();
  await expect(page.getByTestId("listing-card")).toHaveCount(1);
  await expect(page.getByText("1000 BYN")).toBeVisible();
});
