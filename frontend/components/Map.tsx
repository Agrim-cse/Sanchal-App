"use client"; // Required for Leaflet

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Feature, GeoJsonObject } from "geojson";
import type { PathOptions, Layer } from "leaflet";

// ---------------------------------------------------------------------------
// Backend URL — points to the live FastAPI server
// ---------------------------------------------------------------------------
const API_URL = "http://localhost:8000/api/projects";

// ---------------------------------------------------------------------------
// Style function – red/heavy for conflicts, green/normal otherwise
// ---------------------------------------------------------------------------
function conflictStyle(feature?: Feature): PathOptions {
  if (feature?.properties?.status === "Critical Overlap") {
    return { color: "#ef4444", weight: 6, opacity: 0.9 };
  }
  return { color: "#22c55e", weight: 4, opacity: 0.85 };
}

// ---------------------------------------------------------------------------
// Popup binding – fired for every feature
// ---------------------------------------------------------------------------
function onEachFeature(feature: Feature, layer: Layer) {
  if (!feature.properties) return;
  const { department, status, startDate, endDate, purpose } = feature.properties;

  const statusColor = status === "Critical Overlap" ? "#ef4444" : "#22c55e";
  const statusDot = `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${statusColor};margin-right:6px;vertical-align:middle;"></span>`;

  layer.bindPopup(`
    <div style="font-family:sans-serif;min-width:220px;line-height:1.6;color:#1a1a1a;">
      <strong style="font-size:13px;">${department}</strong>
      <hr style="margin:6px 0;border-color:#e5e7eb;" />
      <div>${statusDot}<strong>${status}</strong></div>
      <div style="color:#6b7280;font-size:12px;margin-top:4px;">
        <div>📋 ${purpose}</div>
        <div>📅 ${startDate} → ${endDate}</div>
      </div>
    </div>
  `);
}

// ---------------------------------------------------------------------------
// Map component
// ---------------------------------------------------------------------------
export default function Map() {
  // ── State: holds GeoJSON fetched from the FastAPI backend ──────────────
  const [conflictData, setConflictData] = useState<GeoJsonObject | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // ── Fetch on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();

    fetch(API_URL, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Server responded with ${res.status}`);
        return res.json() as Promise<GeoJsonObject>;
      })
      .then((data) => setConflictData(data))
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("[Sanchal] Failed to fetch conflict data:", err);
          setFetchError(err.message);
        }
      });

    // Cleanup: cancel the request if the component unmounts mid-flight
    return () => controller.abort();
  }, []);

  return (
    <MapContainer
      center={[13.0827, 80.2707]}
      zoom={14}
      className="w-full h-full rounded-xl border border-zinc-800 z-0"
    >
      {/* Esri Dark Gray Canvas Tiles */}
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
        attribution='Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
      />

      {/* Road-cut conflict layer — rendered only after data arrives */}
      {conflictData && (
        <GeoJSON
          // key forces a full layer re-mount when data changes, preventing
          // react-leaflet's stale-data bug with the GeoJSON component.
          key={JSON.stringify(conflictData).length}
          data={conflictData}
          style={conflictStyle}
          onEachFeature={onEachFeature}
        />
      )}

      {/* Overlay a subtle error hint on the map if the fetch failed */}
      {fetchError && (
        <div
          style={{
            position: "absolute",
            bottom: 12,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            background: "rgba(220,38,38,0.85)",
            color: "#fff",
            padding: "6px 14px",
            borderRadius: 8,
            fontSize: 12,
            pointerEvents: "none",
          }}
        >
          ⚠ Could not load live data — is the backend running on port 8000?
        </div>
      )}
    </MapContainer>
  );
}