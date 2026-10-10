"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  LayoutDashboard,
  Map as MapIcon,
  AlertCircle,
  AlertTriangle,
  Zap,
  Radio,
  FileDown,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { generatePDF } from "@/lib/generateGrievancePdf";
import type { ConflictData } from "@/lib/generateGrievancePdf";

// ---------------------------------------------------------------------------
// Dynamic map import — no SSR
// ---------------------------------------------------------------------------
const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] w-full flex items-center justify-center bg-gray-800 rounded-lg">
      Loading map...
    </div>
  ),
});

// ---------------------------------------------------------------------------
// Types — mirror the shape returned by GET /api/conflicts
// ---------------------------------------------------------------------------
interface ApiConflict {
  project1_id: string;
  project2_id: string;
  dept1: string;
  dept2: string;
  overlap_metres: number;
  delay_risk_score: number;
}

interface ApiSummary {
  total_projects: number;
  active_excavations: number;
  critical_overlaps: number;
  projects_in_conflict: number;
  avg_delay_risk_pct: number;
}

interface ApiConflictsResponse {
  conflicts: ApiConflict[];
  summary: ApiSummary;
}

// ---------------------------------------------------------------------------
// Adapter — maps an ApiConflict to the ConflictData shape expected by generatePDF
// ---------------------------------------------------------------------------
function toPdfPayload(c: ApiConflict): ConflictData {
  return {
    dept1: c.dept1,
    dept1Sub: `Overlap zone: ${c.overlap_metres} m`,
    dept2: c.dept2,
    dept2Sub: `Spatial conflict detected by Shapely`,
    location: `Chennai Metropolitan Area (overlap: ${c.overlap_metres} m)`,
    delayProbability: c.delay_risk_score,
    since: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    risk: c.delay_risk_score >= 75 ? "High Risk" : c.delay_risk_score >= 40 ? "Medium Risk" : "Low Risk",
  };
}

// ---------------------------------------------------------------------------
// Map legend
// ---------------------------------------------------------------------------
const legend = [
  { color: "#22c55e", label: "On Schedule" },
  { color: "#ef4444", label: "Critical Overlap" },
];

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export default function Dashboard() {
  // ── State ────────────────────────────────────────────────────────────────
  const [conflicts, setConflicts] = useState<ApiConflict[]>([]);
  const [summary, setSummary] = useState<ApiSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // ── Fetch /api/conflicts on mount ────────────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();

    fetch("http://localhost:8000/api/conflicts", { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Server responded with ${res.status}`);
        return res.json() as Promise<ApiConflictsResponse>;
      })
      .then(({ conflicts: c, summary: s }) => {
        setConflicts(c);
        setSummary(s);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("[Sanchal] Failed to fetch conflicts:", err);
          setFetchError(err.message);
        }
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, []);

  // ── Skeleton card shown while loading ───────────────────────────────────
  const SkeletonCard = () => (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3.5 flex flex-col gap-3 animate-pulse">
      <div className="h-3 w-20 rounded bg-zinc-700" />
      <div className="h-10 rounded-lg bg-zinc-800" />
      <div className="h-2 w-24 rounded bg-zinc-800 mx-auto" />
      <div className="h-10 rounded-lg bg-zinc-800" />
      <div className="h-2 w-16 rounded bg-zinc-800" />
      <div className="h-1.5 rounded-full bg-zinc-800" />
      <div className="h-8 rounded-lg bg-zinc-800" />
    </div>
  );

  return (
    <div className="flex h-screen bg-zinc-950 text-white">

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="w-72 border-r border-zinc-800 flex flex-col bg-zinc-950/60 backdrop-blur-md overflow-y-auto">

        {/* Brand */}
        <div className="px-5 pt-5 pb-4 border-b border-zinc-800">
          <span className="font-bold text-2xl tracking-tighter text-blue-500">SANCHAL</span>
          <p className="text-zinc-500 text-xs mt-0.5">Municipal Road Conflict Monitor</p>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 p-3">
          <button className="flex items-center gap-3 px-4 py-3 rounded-lg bg-zinc-900 text-white border border-zinc-800 text-sm font-medium">
            <MapIcon className="w-4 h-4 text-blue-400" />
            Live Map
          </button>
          <button className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-zinc-900/50 text-zinc-400 transition-colors text-sm">
            <AlertCircle className="w-4 h-4" />
            Conflicts
          </button>
          <button className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-zinc-900/50 text-zinc-400 transition-colors text-sm">
            <LayoutDashboard className="w-4 h-4" />
            Contractors
          </button>
        </nav>

        {/* ── Conflict Alerts Widget ──────────────────────────────────── */}
        <div className="flex-1 px-3 pb-4">

          {/* Section header */}
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-widest">
              Conflict Alerts
            </span>
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 text-zinc-500 animate-spin" />
            ) : (
              <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 rounded-full px-2 py-0.5 font-bold">
                {conflicts.length} Active
              </span>
            )}
          </div>

          {/* Error state */}
          {fetchError && (
            <div className="rounded-xl border border-red-900/60 bg-red-950/30 px-3 py-3 mb-3">
              <p className="text-[10px] text-red-400 font-semibold">⚠ Could not load conflicts</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Is the backend running on port 8000?</p>
            </div>
          )}

          {/* Loading skeletons */}
          {isLoading && (
            <div className="flex flex-col gap-3">
              <SkeletonCard />
            </div>
          )}

          {/* Dynamic conflict cards */}
          {!isLoading && !fetchError && (
            <div className="flex flex-col gap-3">
              {conflicts.length === 0 ? (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-6 text-center">
                  <p className="text-xs text-zinc-400">✅ No active conflicts detected</p>
                </div>
              ) : (
                conflicts.map((conflict) => {
                  const riskScore = conflict.delay_risk_score;
                  const riskLabel =
                    riskScore >= 75 ? "High Risk" : riskScore >= 40 ? "Medium Risk" : "Low Risk";
                  const riskColor =
                    riskScore >= 75
                      ? "text-red-400"
                      : riskScore >= 40
                      ? "text-yellow-400"
                      : "text-green-400";
                  const barFrom =
                    riskScore >= 75
                      ? "from-red-600 to-red-400"
                      : riskScore >= 40
                      ? "from-yellow-600 to-yellow-400"
                      : "from-green-600 to-green-400";
                  const cardBorder =
                    riskScore >= 75
                      ? "border-red-900/50 bg-red-950/20 shadow-[0_0_20px_-8px_rgba(239,68,68,0.3)]"
                      : "border-yellow-900/40 bg-yellow-950/10";

                  // Infer icons from department name keywords
                  const Dept1Icon =
                    conflict.dept1.toLowerCase().includes("telecom") ||
                    conflict.dept1.toLowerCase().includes("fiber")
                      ? Radio
                      : Zap;
                  const Dept2Icon =
                    conflict.dept2.toLowerCase().includes("telecom") ||
                    conflict.dept2.toLowerCase().includes("fiber")
                      ? Radio
                      : Zap;

                  return (
                    <div
                      key={`${conflict.project1_id}-${conflict.project2_id}`}
                      className={`rounded-xl border p-3.5 flex flex-col gap-3 ${cardBorder}`}
                    >
                      {/* Risk badge */}
                      <div className="flex items-center justify-between">
                        <span className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider ${riskColor}`}>
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {riskLabel}
                        </span>
                        <span className="text-zinc-500 text-[11px]">
                          {conflict.overlap_metres} m overlap
                        </span>
                      </div>

                      {/* Departments */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 bg-zinc-900/60 rounded-lg px-3 py-2">
                          <Dept1Icon className="w-4 h-4 text-orange-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-white leading-tight truncate">
                              {conflict.dept1}
                            </p>
                            <p className="text-[10px] text-zinc-500 leading-tight">
                              ID: {conflict.project1_id}
                            </p>
                          </div>
                        </div>

                        {/* CONFLICTS WITH divider */}
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-px bg-red-900/40" />
                          <span className="text-[10px] text-red-500 font-bold px-1">CONFLICTS WITH</span>
                          <div className="flex-1 h-px bg-red-900/40" />
                        </div>

                        <div className="flex items-center gap-2 bg-zinc-900/60 rounded-lg px-3 py-2">
                          <Dept2Icon className="w-4 h-4 text-yellow-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-white leading-tight truncate">
                              {conflict.dept2}
                            </p>
                            <p className="text-[10px] text-zinc-500 leading-tight">
                              ID: {conflict.project2_id}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Spatial overlap info */}
                      <p className="text-[10px] text-zinc-500 flex items-center gap-1">
                        📐 Spatial overlap: {conflict.overlap_metres} m · computed by Shapely
                      </p>

                      {/* Delay risk meter */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] text-zinc-400 uppercase tracking-wider">
                            Delay Probability
                          </span>
                          <span className={`text-xs font-bold ${riskColor}`}>
                            {riskScore}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r transition-all ${barFrom}`}
                            style={{ width: `${riskScore}%` }}
                          />
                        </div>
                      </div>

                      {/* Generate PDF Report button */}
                      <button
                        onClick={() => generatePDF(toPdfPayload(conflict))}
                        className="w-full flex items-center justify-center gap-2 mt-1 px-3 py-2 rounded-lg
                                   bg-blue-600 hover:bg-blue-500 active:bg-blue-700
                                   text-white text-xs font-semibold tracking-wide
                                   transition-all duration-150 shadow-[0_0_12px_-4px_rgba(37,99,235,0.6)]
                                   hover:shadow-[0_0_18px_-4px_rgba(37,99,235,0.9)]"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        Generate PDF Report
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Map legend */}
          <div className="mt-5 px-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-2">
              Map Legend
            </p>
            <div className="flex flex-col gap-1.5">
              {legend.map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span
                    className="inline-block w-5 h-1.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-zinc-400">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-zinc-800">
          <Link href="/" className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
            &larr; Back to Home
          </Link>
        </div>
      </aside>

      {/* ── Main Content (Map) ──────────────────────────────────────────── */}
      <main className="flex-1 p-5 flex flex-col gap-4 overflow-hidden">

        {/* Top stats bar — driven by live summary */}
        <header className="flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-base font-semibold text-white">Live Conflict Map</h1>
            <p className="text-xs text-zinc-500">Chennai Metropolitan Area · Real-time feed</p>
          </div>
          <div className="flex gap-3">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-center min-w-[80px]">
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Active Cuts</p>
              <p className="text-lg font-bold text-white leading-tight">
                {isLoading ? "—" : (summary?.active_excavations ?? "—")}
              </p>
            </div>
            <div className="bg-zinc-900 border border-red-900/50 rounded-lg px-4 py-2 text-center min-w-[80px]">
              <p className="text-[10px] text-red-400 uppercase tracking-wider">Overlaps</p>
              <p className="text-lg font-bold text-red-500 leading-tight">
                {isLoading ? "—" : (summary?.critical_overlaps ?? "—")}
              </p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-center min-w-[80px]">
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Avg. Delay Risk</p>
              <p className="text-lg font-bold text-yellow-500 leading-tight">
                {isLoading ? "—" : `${summary?.avg_delay_risk_pct ?? "—"}%`}
              </p>
            </div>
          </div>
        </header>

        {/* Map */}
        <div className="flex-1 relative rounded-xl overflow-hidden shadow-[0_0_50px_-20px_rgba(37,99,235,0.25)] z-0">
          <Map />
        </div>

      </main>
    </div>
  );
}