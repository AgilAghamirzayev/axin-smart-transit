"use client";
import dynamic from "next/dynamic";
export const MapView = dynamic(() => import("./transit-map"), {
  ssr: false,
  loading: () => <div className="map-loading"><span className="loading-ring" />Xəritə hazırlanır…</div>,
});
