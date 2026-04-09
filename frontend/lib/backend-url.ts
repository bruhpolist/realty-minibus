function stripTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function resolveBackendUrl(): string {
  const explicit = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;
  if (explicit && explicit.trim()) {
    return stripTrailingSlash(explicit.trim());
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Backend URL is not configured. Set API_URL or NEXT_PUBLIC_API_URL.");
  }

  return "http://localhost:4000";
}

