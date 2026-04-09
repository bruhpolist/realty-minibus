"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { toast } from "sonner";
import { ListingCard } from "@/components/ListingCard";
import { API_URL, fetchListings } from "@/lib/api";
import type { Listing, ListingFilters } from "@/lib/types";

const ListingsMap = dynamic(() => import("@/components/ListingsMap").then((m) => m.ListingsMap), {
  ssr: false
});

const PAGE_SIZE = 20;
const roomOptions = [1, 2, 3, 4];
const tagOptions = ["балкон", "интернет", "wifi", "мебель", "ремонт", "охрана", "паркинг"];
const districtOptions = ["", "Центр", "Советский", "Московский", "Фрунзенский", "Ленинский"];

function parseCsvNumbers(value: string | null): number[] {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isFinite(v));
}

function parseCsvStrings(value: string | null): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function parsePage(value: string | null): number {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 1) {
    return 1;
  }
  return Math.floor(num);
}

function ListingsPageClient(): JSX.Element {
  const [newListingIds, setNewListingIds] = useState<Set<string>>(new Set());

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const filters = useMemo<ListingFilters>(
    () => ({
      district: searchParams.get("district") ?? "",
      rooms: parseCsvNumbers(searchParams.get("rooms")),
      tags: parseCsvStrings(searchParams.get("tags"))
    }),
    [searchParams]
  );

  const page = useMemo(() => parsePage(searchParams.get("page")), [searchParams]);

  const queryKey = useMemo(() => ["listings", filters, page, PAGE_SIZE] as const, [filters, page]);
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey,
    queryFn: () =>
      fetchListings({
        filters,
        page,
        pageSize: PAGE_SIZE
      })
  });

  function pushSearchParams(next: URLSearchParams): void {
    const nextSearch = next.toString();
    router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname);
  }

  function updateFilters(nextFilters: ListingFilters): void {
    const next = new URLSearchParams(searchParams.toString());

    if (nextFilters.district) {
      next.set("district", nextFilters.district);
    } else {
      next.delete("district");
    }

    if (nextFilters.rooms.length > 0) {
      next.set("rooms", nextFilters.rooms.join(","));
    } else {
      next.delete("rooms");
    }

    if (nextFilters.tags.length > 0) {
      next.set("tags", nextFilters.tags.join(","));
    } else {
      next.delete("tags");
    }

    next.set("page", "1");
    pushSearchParams(next);
  }

  function setPage(nextPage: number): void {
    const safePage = Math.max(1, nextPage);
    const next = new URLSearchParams(searchParams.toString());
    next.set("page", String(safePage));
    pushSearchParams(next);
  }

  useEffect(() => {
    let socket: Socket | null = null;
    try {
      socket = io(API_URL, {
        transports: ["websocket"]
      });
      socket.on("listing:new", (payload: Listing[] | undefined) => {
        const ids = (Array.isArray(payload) ? payload : [])
          .map((item) => item?.id)
          .filter((id): id is string => typeof id === "string" && id.length > 0);

        if (ids.length > 0) {
          setNewListingIds((prev) => new Set([...prev, ...ids]));
        }

        toast.success(ids.length > 0 ? `New listing: ${ids.length}` : "New listing!");
        queryClient.invalidateQueries({ queryKey: ["listings"] });
      });
    } catch (err) {
      console.error("socket error", err);
    }

    return () => {
      socket?.disconnect();
    };
  }, [queryClient]);

  function markListingSeen(id: string): void {
    setNewListingIds((prev) => {
      if (!prev.has(id)) {
        return prev;
      }
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  const currentPage = data?.page ?? page;
  const totalPages = data?.totalPages ?? 1;
  const totalFound = data?.total ?? 0;
  const pageItems = data?.items ?? [];

  const pageButtons = useMemo(() => {
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);
    const result: number[] = [];
    for (let p = start; p <= end; p += 1) {
      result.push(p);
    }
    return result;
  }, [currentPage, totalPages]);

  return (
    <main className="mx-auto flex w-full max-w-[1320px] flex-col gap-4 px-3 py-4 sm:px-4 sm:py-6">
      <section className="rounded-2xl border border-slate-200 bg-app-panel p-4 shadow-soft" data-testid="filters-panel">
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Minsk flats: 300-450 USD</h1>
        <p className="mt-1 text-sm text-slate-600">Price range active: 990-1485 BYN, real-time updates</p>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="space-y-1">
            <span className="text-sm font-semibold">District</span>
            <select
              data-testid="district-filter"
              value={filters.district}
              onChange={(event) => updateFilters({ ...filters, district: event.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {districtOptions.map((district) => (
                <option key={district || "all"} value={district}>
                  {district || "All districts"}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="space-y-2" data-testid="rooms-filter">
            <legend className="text-sm font-semibold">Rooms</legend>
            <div className="flex flex-wrap gap-2">
              {roomOptions.map((room) => {
                const checked = filters.rooms.includes(room);
                return (
                  <label key={room} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        updateFilters({
                          ...filters,
                          rooms: checked ? filters.rooms.filter((value) => value !== room) : [...filters.rooms, room]
                        })
                      }
                    />
                    <span className="text-sm">{room}k</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="space-y-2" data-testid="tags-filter">
            <legend className="text-sm font-semibold">Tags</legend>
            <div className="flex flex-wrap gap-2">
              {tagOptions.map((tag) => {
                const checked = filters.tags.includes(tag);
                return (
                  <label key={tag} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        updateFilters({
                          ...filters,
                          tags: checked ? filters.tags.filter((value) => value !== tag) : [...filters.tags, tag]
                        })
                      }
                    />
                    <span className="text-sm">{tag}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </div>
      </section>

      {pageItems.length > 0 ? <ListingsMap listings={pageItems} /> : null}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Listings</h2>
          <p className="text-sm text-slate-600" data-testid="results-count">
            {isLoading ? "Loading..." : `Found: ${totalFound}`} {isFetching ? "· updating" : ""}
          </p>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Failed to load listings
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="listings-grid">
          {pageItems.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              isNew={newListingIds.has(listing.id)}
              onSeen={markListingSeen}
            />
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2" data-testid="pagination">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setPage(currentPage - 1)}
            className="rounded-lg border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            Prev
          </button>

          {pageButtons.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPage(p)}
              className={`rounded-lg border px-3 py-2 text-sm ${p === currentPage ? "bg-slate-900 text-white" : "bg-white"}`}
            >
              {p}
            </button>
          ))}

          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setPage(currentPage + 1)}
            className="rounded-lg border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>

          <span className="ml-1 text-sm text-slate-600">
            Page {currentPage} / {totalPages}
          </span>
        </div>
      </section>
    </main>
  );
}

export default function ListingsPage(): JSX.Element {
  return (
    <Suspense fallback={<main className="mx-auto w-full max-w-[1320px] px-3 py-4 sm:px-4 sm:py-6">Loading...</main>}>
      <ListingsPageClient />
    </Suspense>
  );
}
