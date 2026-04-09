"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import OlMap from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import OSM from "ol/source/OSM";
import VectorSource from "ol/source/Vector";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { fromLonLat } from "ol/proj";
import { Circle as CircleStyle, Fill, Stroke, Style } from "ol/style";
import { geocodeAddress } from "@/lib/geocode";
import { getListingCoordinates } from "@/lib/geo";
import type { Listing } from "@/lib/types";

type Props = {
  listings: Listing[];
};

type PointData = {
  listing: Listing;
  lat: number;
  lng: number;
};

const markerStyle = new Style({
  image: new CircleStyle({
    radius: 6,
    fill: new Fill({ color: "#2563eb" }),
    stroke: new Stroke({ color: "#ffffff", width: 2 })
  })
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function ListingsMap({ listings }: Props): JSX.Element {
  const [mounted, setMounted] = useState(false);
  const [points, setPoints] = useState<PointData[]>([]);
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<OlMap | null>(null);
  const vectorRef = useRef<VectorSource | null>(null);

  const basePoints = useMemo<PointData[]>(
    () =>
      listings.map((listing) => ({
        listing,
        ...getListingCoordinates(listing)
      })),
    [listings]
  );

  useEffect(() => {
    setMounted(true);
    return () => {
      setMounted(false);
    };
  }, []);

  useEffect(() => {
    if (!mounted || !mapNodeRef.current || mapRef.current) {
      return;
    }

    const vectorSource = new VectorSource();
    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: markerStyle
    });

    const map = new OlMap({
      target: mapNodeRef.current,
      layers: [new TileLayer({ source: new OSM() }), vectorLayer],
      view: new View({
        center: fromLonLat([27.56, 53.9]),
        zoom: 11
      })
    });

    mapRef.current = map;
    vectorRef.current = vectorSource;

    return () => {
      map.setTarget(undefined);
      mapRef.current = null;
      vectorRef.current = null;
    };
  }, [mounted]);

  useEffect(() => {
    setPoints(basePoints);

    let disposed = false;
    const byId = new Map(basePoints.map((point) => [point.listing.id, point]));

    async function run(): Promise<void> {
      for (const point of basePoints.slice(0, 40)) {
        const geocoded = await geocodeAddress(point.listing.address);
        if (disposed || !geocoded) {
          continue;
        }

        byId.set(point.listing.id, {
          ...point,
          lat: geocoded.lat,
          lng: geocoded.lng
        });

        setPoints([...byId.values()]);
        await sleep(1200);
      }
    }

    run().catch(() => {
      // non-fatal fallback stays active
    });

    return () => {
      disposed = true;
    };
  }, [basePoints]);

  useEffect(() => {
    const map = mapRef.current;
    const vector = vectorRef.current;
    if (!map || !vector) {
      return;
    }

    vector.clear();

    for (const point of points) {
      const feature = new Feature({
        geometry: new Point(fromLonLat([point.lng, point.lat])),
        listingId: point.listing.id
      });
      vector.addFeature(feature);
    }
  }, [points]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft" data-testid="listings-map">
      <div className="border-b border-slate-200 p-4">
        <h2 className="text-lg font-bold">Map</h2>
        <p className="text-sm text-slate-600">OpenStreetMap pins from listing address</p>
      </div>
      {mounted ? <div ref={mapNodeRef} className="h-[340px] w-full" /> : <div className="h-[340px] w-full bg-slate-100" />}
    </div>
  );
}
