"use client"; // <-- This is the fix

import dynamic from "next/dynamic";
import { LayoutDashboard, Map as MapIcon, AlertCircle, AlertTriangle, Zap, Radio, FileDown } from "lucide-react";
import Link from "next/link";
import { generatePDF } from "@/lib/generateGrievancePdf";

// Dynamically import the map so it doesn't break Next.js server rendering
const MapComponent = dynamic(() => import("../../components/Map"), {
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center bg-zinc-900 rounded-xl text-zinc-500 animate-pulse">Loading Map Engine...</div>,
});

// ---------------------------------------------------------------------------
// Hardcoded active conflict alerts
// ---------------------------------------------------------------------------
const conflictAlerts = [
  {
    id: 1,
    dept1: "Jio Telecom",
    dept1Sub: "Fiber Optic Cable Laying",
    dept1Icon: Radio,
    dept2: "TANGEDCO",
    dept2Sub: "Underground Power Trench",
    dept2Icon: Zap,
    risk: "High Risk",
    delayProbability: 85,
    location: "Anna Salai – Saidapet Junction",
    since: "Oct 03, 2026",
  },
];

// ---------------------------------------------------------------------------
// Map legend items
// ---------------------------------------------------------------------------
const legend = [
  { color: "#22c55e", label: "On Schedule" },
  { color: "#ef4444", label: "Critical Overlap" },
];

export default function Dashboard() {
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
            <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 rounded-full px-2 py-0.5 font-bold">
              {conflictAlerts.length} Active
            </span>
          </div>

          {/* Alert cards */}
          <div className="flex flex-col gap-3">
            {conflictAlerts.map((alert) => {
              const Dept1Icon = alert.dept1Icon;
              const Dept2Icon = alert.dept2Icon;
              return (
                <div
                  key={alert.id}
                  className="rounded-xl border border-red-900/50 bg-red-950/20 p-3.5 flex flex-col gap-3 shadow-[0_0_20px_-8px_rgba(239,68,68,0.3)]"
                >
                  {/* Risk badge */}
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-red-400 text-xs font-bold uppercase tracking-wider">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {alert.risk}
                    </span>
                    <span className="text-zinc-500 text-[11px]">{alert.since}</span>
                  </div>

                  {/* Departments */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 bg-zinc-900/60 rounded-lg px-3 py-2">
                      <Dept1Icon className="w-4 h-4 text-orange-400 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-white leading-tight">{alert.dept1}</p>
                        <p className="text-[10px] text-zinc-500 leading-tight">{alert.dept1Sub}</p>
                      </div>
                    </div>

                    {/* VS divider */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-px bg-red-900/40" />
                      <span className="text-[10px] text-red-500 font-bold px-1">CONFLICTS WITH</span>
                      <div className="flex-1 h-px bg-red-900/40" />
                    </div>

                    <div className="flex items-center gap-2 bg-zinc-900/60 rounded-lg px-3 py-2">
                      <Dept2Icon className="w-4 h-4 text-yellow-400 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-white leading-tight">{alert.dept2}</p>
                        <p className="text-[10px] text-zinc-500 leading-tight">{alert.dept2Sub}</p>
                      </div>
                    </div>
                  </div>

                  {/* Location */}
                  <p className="text-[10px] text-zinc-500 flex items-center gap-1">
                    📍 {alert.location}
                  </p>

                  {/* Delay probability meter */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] text-zinc-400 uppercase tracking-wider">Delay Probability</span>
                      <span className="text-xs font-bold text-red-400">{alert.delayProbability}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-400 transition-all"
                        style={{ width: `${alert.delayProbability}%` }}
                      />
                    </div>
                  </div>

                  {/* Generate PDF Report button */}
                  <button
                    onClick={() => generatePDF(alert)}
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
            })}
          </div>

          {/* Map legend */}
          <div className="mt-5 px-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-2">Map Legend</p>
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

        {/* Top bar */}
        <header className="flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-base font-semibold text-white">Live Conflict Map</h1>
            <p className="text-xs text-zinc-500">Chennai Metropolitan Area · Real-time feed</p>
          </div>
          <div className="flex gap-3">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-center">
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Active Cuts</p>
              <p className="text-lg font-bold text-white leading-tight">12</p>
            </div>
            <div className="bg-zinc-900 border border-red-900/50 rounded-lg px-4 py-2 text-center">
              <p className="text-[10px] text-red-400 uppercase tracking-wider">Overlaps</p>
              <p className="text-lg font-bold text-red-500 leading-tight">3</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-center">
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Avg. Delay Risk</p>
              <p className="text-lg font-bold text-yellow-500 leading-tight">42%</p>
            </div>
          </div>
        </header>

        {/* Map */}
        <div className="flex-1 relative rounded-xl overflow-hidden shadow-[0_0_50px_-20px_rgba(37,99,235,0.25)] z-0">
          <MapComponent />
        </div>

      </main>
    </div>
  );
}