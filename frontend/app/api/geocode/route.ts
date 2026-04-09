import { NextRequest, NextResponse } from "next/server";
import { resolveBackendUrl } from "@/lib/backend-url";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const backendBase = resolveBackendUrl();
    const search = request.nextUrl.searchParams.toString();
    const target = `${backendBase}/api/geocode${search ? `?${search}` : ""}`;
    const response = await fetch(target, {
      cache: "no-store",
      headers: {
        Accept: "application/json"
      }
    });

    const body = await response.text();
    return new NextResponse(body, {
      status: response.status,
      headers: {
        "content-type": response.headers.get("content-type") ?? "application/json; charset=utf-8"
      }
    });
  } catch (error) {
    return NextResponse.json({ error: "proxy failed" }, { status: 500 });
  }
}

