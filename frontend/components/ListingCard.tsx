"use client";

import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import { Button } from "@/components/ui/button";
import { API_URL } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { Listing } from "@/lib/types";

type Props = {
  listing: Listing;
  isNew?: boolean;
  onSeen?: (id: string) => void;
};

function featureClass(feature: string): string {
  if (feature === "wifi" || feature === "интернет") {
    return "tag-wifi";
  }
  if (feature === "балкон") {
    return "tag-balcon";
  }
  if (feature === "мебель") {
    return "tag-mebel";
  }
  return "tag-default";
}

function imageUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }
  if (pathOrUrl.startsWith("/")) {
    return `${API_URL}${pathOrUrl}`;
  }
  return `${API_URL}/${pathOrUrl}`;
}

function formatDateTime(value?: string | null): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function sourceLabel(source: string): string {
  if (source.includes("kufar")) {
    return "Kufar";
  }
  if (source.includes("onliner")) {
    return "Onliner";
  }
  if (source.includes("realt")) {
    return "Realt";
  }
  return source;
}

function ownerLabel(listing: Listing): string | null {
  if (listing.ownerType === "agency") {
    return listing.ownerName ? `Агентство: ${listing.ownerName}` : "От агентства";
  }
  if (listing.ownerType === "owner") {
    return listing.ownerName ? `Собственник: ${listing.ownerName}` : "От собственника";
  }
  return listing.ownerName ?? null;
}

export function ListingCard({ listing, isNew = false, onSeen }: Props): JSX.Element {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const slides = useMemo(() => listing.images.map(imageUrl), [listing.images]);
  const postedAt = formatDateTime(listing.sourceCreatedAt ?? listing.createdAt);
  const priceChangedAt = formatDateTime(listing.sourcePriceChangeDate);
  const owner = ownerLabel(listing);

  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl border bg-app-panel shadow-soft transition-all",
        isNew ? "border-emerald-400 ring-2 ring-emerald-200" : "border-slate-200"
      )}
      data-testid="listing-card"
      onMouseEnter={() => {
        if (isNew) {
          onSeen?.(listing.id);
        }
      }}
    >
      <div className="relative">
        {slides.length > 0 ? (
          <>
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex">
                {slides.map((src, index) => (
                  <button
                    key={`${listing.id}-${index}`}
                    type="button"
                    className="relative min-w-0 flex-[0_0_100%] cursor-zoom-in"
                    onClick={() => {
                      setLightboxIndex(index);
                      setLightboxOpen(true);
                    }}
                  >
                    <Image
                      src={src}
                      alt={listing.address}
                      width={900}
                      height={520}
                      className="h-56 w-full object-cover sm:h-60"
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="absolute inset-x-3 top-3 flex justify-between">
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-white/40 bg-black/55 px-3 py-1 text-sm text-white hover:bg-black/65"
                onClick={() => emblaApi?.scrollPrev()}
              >
                Назад
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-white/40 bg-black/55 px-3 py-1 text-sm text-white hover:bg-black/65"
                onClick={() => emblaApi?.scrollNext()}
              >
                Вперед
              </Button>
            </div>
          </>
        ) : (
          <div className="flex h-56 items-center justify-center bg-slate-200 text-sm text-slate-500 sm:h-60">Нет фото</div>
        )}
      </div>

      <div className="space-y-3 p-4">
        {isNew ? (
          <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700">
            New
          </span>
        ) : null}

        <p className="text-2xl font-extrabold text-app-ink sm:text-3xl">
          Цена: {listing.priceBYN.toLocaleString("ru-RU")} BYN ({listing.priceUSD.toFixed(0)} USD)
        </p>
        <p className="text-base font-medium text-slate-700">Адрес: {listing.address}</p>
        {postedAt ? <p className="text-sm text-slate-500">Подано: {postedAt}</p> : null}
        {priceChangedAt ? <p className="text-sm text-slate-500">Изменение цены: {priceChangedAt}</p> : null}

        <p className="text-sm text-slate-600">
          {listing.rooms ? `${listing.rooms}к` : "Комнаты н/д"}, {listing.area ? `${listing.area}м²` : "Площадь н/д"}
        </p>
        {owner ? <p className="text-sm font-medium text-slate-700">{owner}</p> : null}

        <div className="flex flex-wrap gap-2">
          {listing.features.length > 0 ? (
            listing.features.map((feature) => (
              <span key={`${listing.id}-${feature}`} className={cn("tag", featureClass(feature))}>
                {feature}
              </span>
            ))
          ) : (
            <span className="tag tag-default">без тегов</span>
          )}
        </div>

        <p className="text-sm font-semibold text-slate-700">Источник: {sourceLabel(listing.source)}</p>

        <a
          href={listing.url}
          target="_blank"
          rel="noreferrer"
          data-testid="open-listing-link"
          className="inline-flex w-full items-center justify-center rounded-xl bg-app-accent px-4 py-3 text-sm font-semibold text-white hover:opacity-90"
        >
          Открыть на сайте
        </a>
      </div>

      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={lightboxIndex}
        slides={slides.map((src) => ({ src }))}
      />
    </article>
  );
}
