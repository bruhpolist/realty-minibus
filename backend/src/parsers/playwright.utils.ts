import { chromium, type Browser, type Page } from "playwright";

export async function withBrowser<T>(runner: (browser: Browser) => Promise<T>): Promise<T> {
  const browser = await chromium.launch({ headless: true });
  try {
    return await runner(browser);
  } finally {
    await browser.close();
  }
}

export async function createPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    viewport: { width: 1366, height: 768 },
    locale: "ru-RU"
  });

  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  return page;
}

export async function safeText(page: Page, selectors: string[]): Promise<string> {
  for (const selector of selectors) {
    const text = await page.locator(selector).first().textContent().catch(() => null);
    if (text?.trim()) {
      return text.trim();
    }
  }

  return "";
}

export async function allImageUrls(page: Page): Promise<string[]> {
  const urls = await page.$$eval("img", (imgs) => {
    const srcs = imgs.flatMap((img) => {
      const src = img.getAttribute("src");
      const dataSrc = img.getAttribute("data-src");
      const srcset = img.getAttribute("srcset");
      return [src, dataSrc, srcset]
        .filter(Boolean)
        .flatMap((value) => (value?.includes(",") ? value.split(",") : [value]))
        .map((value) => value?.trim().split(" ")[0] ?? "");
    });

    return srcs.filter(Boolean);
  });

  return [...new Set(urls)];
}

function isTransientNavigationError(error: unknown): boolean {
  const message = String(error ?? "").toLowerCase();
  return (
    message.includes("err_network_changed") ||
    message.includes("err_connection_reset") ||
    message.includes("err_connection_refused") ||
    message.includes("err_timed_out") ||
    message.includes("navigation timeout")
  );
}

export async function gotoWithRetry(
  page: Page,
  url: string,
  retries = 3,
  waitMs = 700
): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });
      return;
    } catch (error) {
      lastError = error;
      if (!isTransientNavigationError(error) || attempt === retries) {
        throw error;
      }
      await page.waitForTimeout(waitMs * attempt);
    }
  }
  throw lastError;
}
