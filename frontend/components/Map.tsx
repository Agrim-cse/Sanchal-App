"use client"; // Required for Leaflet

import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Feature, GeoJsonObject } from "geojson";
import type { PathOptions, Layer } from "leaflet";

// ---------------------------------------------------------------------------
// Mock GeoJSON – Three road-cut features in Chennai, India
// Features 2 & 3 intentionally overlap to simulate a spatial conflict.
// ---------------------------------------------------------------------------
const mockRoadCuts: GeoJsonObject = {
  type: "FeatureCollection",
  features: [
    // Feature 1 – Water Board (On Schedule, Green)
    {
      type: "Feature",
      properties: {
        department: "Chennai Metropolitan Water Supply & Sewerage Board",
        status: "On Schedule",
        startDate: "2026-09-15",
        endDate: "2026-10-20",
        purpose: "Underground water pipeline replacement",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [80.265, 13.082],
          [80.268, 13.084],
          [80.271, 13.086],
          [80.274, 13.087],
        ],
      },
    },

    // Feature 2 – Telecom (Critical Overlap, Red) — overlaps with Feature 3
    {
      type: "Feature",
      properties: {
        department: "Jio Telecom – Fiber Division",
        status: "Critical Overlap",
        startDate: "2026-10-01",
        endDate: "2026-11-05",
        purpose: "Fiber optic cable laying",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [80.270, 13.079],
          [80.272, 13.082],
          [80.274, 13.085],
          [80.276, 13.088],
        ],
      },
    },

    // Feature 3 – Electricity Board (Critical Overlap, Red) — overlaps with Feature 2
    {
      type: "Feature",
      properties: {
        department: "Tamil Nadu Generation & Distribution Corporation (TANGEDCO)",
        status: "Critical Overlap",
        startDate: "2026-10-03",
        endDate: "2026-11-10",
        purpose: "Underground power cable trench",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [80.271, 13.078],
          [80.273, 13.081],
          [80.275, 13.084],
          [80.277, 13.087],
        ],
      },
    },
  ],
};

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
  return (
    <MapContainer
      center={[13.0827, 80.2707]}
      zoom={14}
      className="w-full h-full rounded-xl border border-zinc-800 z-0"
    >
      {/* 100% Free CartoDB Dark Matter Tiles */}
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
        attribution='Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
      />

      {/* Road-cut conflict layer */}
      <GeoJSON
        data={mockRoadCuts}
        style={conflictStyle}
        onEachFeature={onEachFeature}
      />
    </MapContainer>
  );
}