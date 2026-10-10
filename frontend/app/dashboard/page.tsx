"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileDown,
  HardHat,
  IndianRupee,
  LayoutDashboard,
  Loader2,
  MapPin,
  Menu,
  Radio,
  Route,
  ShieldCheck,
  TriangleAlert,
  Waves,
  X,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { generatePDF } from "@/lib/generateGrievancePdf";
import type { ConflictData } from "@/lib/generateGrievancePdf";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const MapView = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[340px] items-center justify-center rounded-lg bg-gray-100 text-sm text-gray-500">
      <Loader2 className="mr-2 h-5 w-5 animate-spin text-blue-600" />
      Loading jurisdiction map…
    </div>
  ),
});

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

interface ProjectProperties {
  id: string;
  department: string;
  purpose: string;
  startDate: string;
  endDate: string;
  status: "Critical Overlap" | "On Schedule" | string;
  conflictsWith: string[];
}

interface ApiProjectFeature {
  type: "Feature";
  properties: ProjectProperties;
}

interface ApiProjectsResponse {
  type: "FeatureCollection";
  features: ApiProjectFeature[];
}

interface ContractorInfo {
  name: string;
  contact: string;
  costInr: number;
  diversionRoute: string;
}

interface Project {
  id: string;
  department: string;
  purpose: string;
  startDate: string;
  endDate: string;
  status: string;
  conflictsWith: string[];
  contractor: ContractorInfo;
  delayRisk: number;
}

type RecordStatus = "Completed" | "Pending";

interface PastRecord {
  id: string;
  title: string;
  department: string;
  location: string;
  updated: string;
  status: RecordStatus;
}

interface StoredUser {
  full_name: string;
  role: "official" | "resident";
  profession_department: string | null;
  home_zone: string | null;
  address_location: string | null;
}

function getInitials(fullName?: string): string {
  return fullName?.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "SC";
}

const PROJECT_ENRICHMENTS_MOCK: Record<string, ContractorInfo> = {
  "PRJ-001": {
    name: "Aqua Infrastructure Pvt. Ltd.",
    contact: "aquadesk@example.com",
    costInr: 4820000,
    diversionRoute: "Cathedral Road → Mount Road",
  },
  "PRJ-002": {
    name: "MetroLink Civil Works",
    contact: "metrolinkdesk@example.com",
    costInr: 2650000,
    diversionRoute: "Greams Road → Nungambakkam High Road",
  },
  "PRJ-003": {
    name: "Southern Utility Contractors",
    contact: "southernutility@example.com",
    costInr: 3180000,
    diversionRoute: "Whites Road → Peters Road",
  },
};

const PAST_RECORDS_MOCK: PastRecord[] = [
  {
    id: "HIS-0248",
    title: "Storm-water drain desilting",
    department: "Greater Chennai Corporation",
    location: "Royapettah, Zone 9",
    updated: "08 Oct 2026",
    status: "Completed",
  },
  {
    id: "HIS-0247",
    title: "Streetlight cable maintenance",
    department: "TANGEDCO",
    location: "Thousand Lights, Zone 9",
    updated: "06 Oct 2026",
    status: "Pending",
  },
  {
    id: "HIS-0244",
    title: "Road surface restoration",
    department: "Chennai Corporation – Roads",
    location: "Triplicane, Zone 9",
    updated: "02 Oct 2026",
    status: "Completed",
  },
];

const NAV_ITEMS = [
  { label: "Overview", href: "#overview", icon: LayoutDashboard },
  { label: "Active Works", href: "#active-works", icon: HardHat },
  { label: "Past Records", href: "#past-records", icon: CalendarDays },
];

function riskLabel(score: number): string {
  return score >= 75 ? "High" : score >= 40 ? "Moderate" : "Low";
}

function riskClasses(score: number): string {
  if (score >= 75) return "text-red-700 bg-red-50 border-red-200";
  if (score >= 40) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-emerald-700 bg-emerald-50 border-emerald-200";
}

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function projectDuration(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00`).getTime();
  const end = new Date(`${endDate}T00:00:00`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.floor((end - start) / 86_400_000) + 1;
}

function toPdfPayload(conflict: ApiConflict): ConflictData {
  return {
    dept1: conflict.dept1,
    dept1Sub: `Overlap zone: ${conflict.overlap_metres} m`,
    dept2: conflict.dept2,
    dept2Sub: "Spatial conflict detected by Shapely",
    location: `Chennai Metropolitan Area (overlap: ${conflict.overlap_metres} m)`,
    delayProbability: conflict.delay_risk_score,
    since: new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    risk: `${riskLabel(conflict.delay_risk_score)} Risk`,
  };
}

function toProjectPdfPayload(project: Project, conflict?: ApiConflict): ConflictData {
  if (conflict) return toPdfPayload(conflict);
  return {
    dept1: project.department,
    dept1Sub: project.purpose,
    dept2: "Chennai Metropolitan Corporation",
    dept2Sub: "Jurisdiction coordination",
    location: "Chennai Metropolitan Area",
    delayProbability: project.delayRisk,
    since: formatDate(project.startDate),
    risk: `${riskLabel(project.delayRisk)} Risk`,
  };
}

function getTodayLabel(): string {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

export default function Dashboard() {
  const router = useRouter();
  const [signedInUser, setSignedInUser] = useState<StoredUser | null>(null);
  const [conflicts, setConflicts] = useState<ApiConflict[]>([]);
  const [summary, setSummary] = useState<ApiSummary | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [generatingPdfFor, setGeneratingPdfFor] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState("Today");

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("sanchal_user");
      if (storedUser) {
        const user = JSON.parse(storedUser) as StoredUser;
        startTransition(() => setSignedInUser(user));
      }
    } catch {
      localStorage.removeItem("sanchal_user");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setCurrentDate(getTodayLabel()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard(): Promise<void> {
      try {
        const [conflictsResponse, projectsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/conflicts`, { signal: controller.signal }),
          fetch(`${API_BASE_URL}/api/projects`, { signal: controller.signal }),
        ]);
        if (!conflictsResponse.ok) {
          throw new Error(`Conflict service responded with ${conflictsResponse.status}`);
        }
        if (!projectsResponse.ok) {
          throw new Error(`Projects service responded with ${projectsResponse.status}`);
        }

        const [conflictData, projectData] = await Promise.all([
          conflictsResponse.json() as Promise<ApiConflictsResponse>,
          projectsResponse.json() as Promise<ApiProjectsResponse>,
        ]);
        setConflicts(conflictData.conflicts);
        setSummary(conflictData.summary);
        setProjects(
          projectData.features.map(({ properties }) => ({
            ...properties,
            contractor: PROJECT_ENRICHMENTS_MOCK[properties.id] ?? {
              name: "Municipal Works Coordination",
              contact: "worksdesk@example.com",
              costInr: 0,
              diversionRoute: "Route to be confirmed by the site officer",
            },
            delayRisk: 0,
          })),
        );
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        const message =
          error instanceof Error ? error.message : "An unexpected error occurred.";
        console.error("[Sanchal] Failed to load dashboard data:", error);
        setFetchError(message);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void loadDashboard();
    return () => controller.abort();
  }, []);

  const projectsWithRisk = useMemo(() => {
    const riskByProject = new Map<string, number>();
    conflicts.forEach((conflict) => {
      [conflict.project1_id, conflict.project2_id].forEach((projectId) => {
        riskByProject.set(
          projectId,
          Math.max(riskByProject.get(projectId) ?? 0, conflict.delay_risk_score),
        );
      });
    });
    return projects.map((project) => ({
      ...project,
      delayRisk: riskByProject.get(project.id) ?? 0,
    }));
  }, [conflicts, projects]);

  const highRiskCount = conflicts.filter(
    (conflict) => conflict.delay_risk_score >= 75,
  ).length;
  const activeSiteCount = summary?.active_excavations ?? projects.length;

  async function handleGeneratePdf(project: Project): Promise<void> {
    setGeneratingPdfFor(project.id);
    setPdfError(null);
    const conflict = conflicts.find(
      (item) => item.project1_id === project.id || item.project2_id === project.id,
    );
    try {
      await generatePDF(toProjectPdfPayload(project, conflict));
    } catch (error) {
      console.error(`[Sanchal] Failed to generate report for ${project.id}:`, error);
      setPdfError(`Could not generate the report for ${project.id}. Please try again.`);
    } finally {
      setGeneratingPdfFor(null);
    }
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link
        href="#overview"
        className="flex items-center gap-3 border-b border-gray-100 px-6 py-6"
        onClick={() => setMobileNavOpen(false)}
      >
        <span className="relative h-10 w-14 shrink-0 overflow-hidden rounded-lg bg-[#3d1f00] shadow-sm">
          <Image
            src="/sanchal-logo.png"
            alt="Sanchal logo"
            fill
            sizes="56px"
            className="object-contain"
          />
        </span>
        <span>
          <span className="block text-lg font-extrabold tracking-[0.14em] text-blue-900">
            SANCHAL
          </span>
          <span className="block text-[11px] font-medium text-gray-500">
            Municipal Works Monitor
          </span>
        </span>
      </Link>

      <nav aria-label="Dashboard navigation" className="flex-1 space-y-1 px-4 py-6">
        <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">
          Workspace
        </p>
        {NAV_ITEMS.map(({ label, href, icon: Icon }, index) => (
          <a
            key={label}
            href={href}
            onClick={() => setMobileNavOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold transition-colors ${
              index === 0
                ? "bg-blue-50 text-blue-800"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <Icon className={`h-[18px] w-[18px] ${index === 0 ? "text-blue-700" : "text-gray-400"}`} />
            {label}
            {label === "Active Works" && (
              <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs font-bold text-blue-700 shadow-sm">
                {isLoading ? "—" : activeSiteCount}
              </span>
            )}
          </a>
        ))}
      </nav>

      <div className="border-t border-gray-100 p-4">
        <button
          type="button"
          onClick={() => {
            setMobileNavOpen(false);
            router.push("/profile");
          }}
          aria-label="Open your profile"
          className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition hover:border-blue-200 hover:bg-blue-50/40"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-800">
            {getInitials(signedInUser?.full_name)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-gray-900">{signedInUser?.full_name ?? "Your profile"}</span>
            <span className="block truncate text-xs text-gray-500">
              {signedInUser?.role === "official" ? "Municipal Official" : "Resident"}
              {signedInUser?.profession_department ? ` · ${signedInUser.profession_department}` : signedInUser?.home_zone ? ` · ${signedInUser.home_zone}` : ""}
            </span>
          </span>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 lg:pl-72 flex flex-col">
      <aside className="fixed inset-y-0 left-0 z-40 hidden h-screen w-72 border-r border-gray-200 bg-white lg:block">
        {sidebar}
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-[1200] lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-gray-950/30"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative z-10 h-full w-[min(84vw,320px)] bg-white shadow-xl">
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setMobileNavOpen(false)}
              className="absolute right-4 top-5 rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <main className="min-w-0 flex-1 w-full overflow-y-auto">
        <div id="overview" className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 p-4 sm:p-6 lg:p-8">
          <header id="official-profile" className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <button
                type="button"
                aria-label="Open navigation"
                onClick={() => setMobileNavOpen(true)}
                className="mt-1 rounded-lg border border-gray-200 bg-white p-2 text-gray-600 shadow-sm lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-teal-700">
                  <span className="h-2 w-2 rounded-full bg-teal-500" />
                  Official command centre
                </p>
                <h1 className="text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">
                  Good morning, Ananya
                </h1>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  Zone 9, Chennai Metropolitan Area
                  <span className="mx-1 text-gray-300">·</span>
                  {currentDate}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-600 shadow-sm">
              <ShieldCheck className="h-[18px] w-[18px] text-teal-600" />
              <span>Official workspace</span>
            </div>
          </header>

          {fetchError && (
            <div
              role="alert"
              className="flex flex-wrap items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            >
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Live dashboard data is unavailable.</p>
                <p className="mt-0.5 text-red-700">{fetchError}. Check that the Sanchal API is running on port 8000.</p>
              </div>
            </div>
          )}

          <section aria-label="Quick statistics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Active sites"
              value={isLoading ? "—" : activeSiteCount}
              detail="Across your jurisdiction"
              icon={HardHat}
              iconClass="bg-blue-50 text-blue-700"
              trend="Live portfolio"
              trendIcon={Activity}
            />
            <StatCard
              label="High risk conflicts"
              value={isLoading ? "—" : highRiskCount}
              detail="Delay probability ≥ 75%"
              icon={AlertTriangle}
              iconClass="bg-red-50 text-red-700"
              trend={highRiskCount > 0 ? "Needs attention" : "All clear"}
              trendIcon={highRiskCount > 0 ? ArrowUpRight : CheckCircle2}
              trendClass={highRiskCount > 0 ? "text-red-700" : "text-emerald-700"}
            />
            <StatCard
              label="Average delay risk"
              value={isLoading ? "—" : `${summary?.avg_delay_risk_pct ?? 0}%`}
              detail="Across detected overlaps"
              icon={Activity}
              iconClass="bg-amber-50 text-amber-700"
              trend="Backend risk estimate"
              trendIcon={ArrowDownRight}
            />
            <StatCard
              label="Departments active"
              value={isLoading ? "—" : new Set(projects.map((project) => project.department)).size}
              detail="Coordinating road works"
              icon={Building2}
              iconClass="bg-teal-50 text-teal-700"
              trend="Zone 9"
              trendIcon={MapPin}
            />
          </section>

          <section aria-labelledby="map-heading" className="grid gap-6 2xl:grid-cols-[minmax(0,1.8fr)_minmax(300px,0.8fr)]">
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 sm:px-6">
                <div>
                  <h2 id="map-heading" className="text-lg font-bold text-gray-900">Jurisdiction & live works</h2>
                  <p className="mt-0.5 text-sm text-gray-500">Active road cuts and detected spatial overlaps</p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                  Live monitoring
                </span>
              </div>
              <div className="p-3 sm:p-4">
                <div className="h-[340px] overflow-hidden rounded-lg sm:h-[410px]">
                  <MapView />
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-2 pb-1 pt-4 text-xs text-gray-600">
                  <span className="font-semibold text-gray-700">Map key</span>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-1.5 w-6 rounded-full bg-emerald-500" /> On schedule
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-1.5 w-6 rounded-full bg-red-500" /> Critical overlap
                  </span>
                  <span className="ml-auto inline-flex items-center gap-1 text-gray-400">
                    <MapPin className="h-3.5 w-3.5" /> Chennai
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col rounded-lg border border-gray-200 bg-white p-5 shadow-md sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Conflict watch</h2>
                  <p className="mt-0.5 text-sm text-gray-500">Cross-department risk alerts</p>
                </div>
                <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">
                  {isLoading ? "—" : conflicts.length} alerts
                </span>
              </div>
              <div className="mt-5 flex-1 space-y-3">
                {isLoading ? (
                  <div className="flex items-center justify-center rounded-lg bg-gray-50 px-4 py-12 text-sm text-gray-500">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading alerts…
                  </div>
                ) : conflicts.length === 0 ? (
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50/70 px-4 py-8 text-center">
                    <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
                    <p className="mt-2 text-sm font-semibold text-emerald-900">No active conflicts</p>
                    <p className="mt-1 text-xs text-emerald-700">Work zones are clear of detected overlaps.</p>
                  </div>
                ) : (
                  conflicts.slice(0, 4).map((conflict) => (
                    <div key={`${conflict.project1_id}-${conflict.project2_id}`} className="rounded-lg border border-gray-200 p-3.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${riskClasses(conflict.delay_risk_score)}`}>
                          {riskLabel(conflict.delay_risk_score)} risk
                        </span>
                        <span className="text-xs text-gray-500">{conflict.overlap_metres} m overlap</span>
                      </div>
                      <p className="mt-2.5 text-sm font-semibold leading-snug text-gray-800">
                        {shortDepartment(conflict.dept1)} <span className="font-normal text-gray-400">with</span>{" "}
                        {shortDepartment(conflict.dept2)}
                      </p>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={`h-full rounded-full ${conflict.delay_risk_score >= 75 ? "bg-red-500" : conflict.delay_risk_score >= 40 ? "bg-amber-500" : "bg-emerald-500"}`}
                          style={{ width: `${Math.min(100, Math.max(0, conflict.delay_risk_score))}%` }}
                        />
                      </div>
                      <p className="mt-1.5 text-right text-xs font-semibold text-gray-600">
                        {conflict.delay_risk_score}% delay probability
                      </p>
                    </div>
                  ))
                )}
              </div>
              {conflicts.length > 4 && (
                <a href="#active-works" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-900">
                  Review all works <ChevronRight className="h-4 w-4" />
                </a>
              )}
            </div>
          </section>

          <section id="active-works" aria-labelledby="works-heading" className="scroll-mt-6">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-700">Operations</p>
                <h2 id="works-heading" className="mt-1 text-xl font-bold text-gray-950 sm:text-2xl">Current works & delay risk</h2>
                <p className="mt-1 text-sm text-gray-500">Project details, contractor coordination and backend-calculated risk estimates.</p>
              </div>
              <span className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 shadow-sm">
                {isLoading ? "Loading projects…" : `${projectsWithRisk.length} active projects`}
              </span>
            </div>

            {pdfError && (
              <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {pdfError}
              </p>
            )}

            {isLoading ? (
              <div className="grid gap-6 xl:grid-cols-2">
                {[0, 1].map((item) => (
                  <div key={item} className="h-72 animate-pulse rounded-lg border border-gray-200 bg-white shadow-md" />
                ))}
              </div>
            ) : projectsWithRisk.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-white p-10 text-center shadow-md">
                <HardHat className="mx-auto h-9 w-9 text-gray-300" />
                <p className="mt-3 font-semibold text-gray-800">No active works found</p>
                <p className="mt-1 text-sm text-gray-500">Projects will appear here when the backend publishes them.</p>
              </div>
            ) : (
              <div className="grid gap-6 xl:grid-cols-2">
                {projectsWithRisk.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    isGeneratingPdf={generatingPdfFor === project.id}
                    onGeneratePdf={() => void handleGeneratePdf(project)}
                  />
                ))}
              </div>
            )}
          </section>

          <section id="past-records" aria-labelledby="history-heading" className="scroll-mt-6 rounded-lg border border-gray-200 bg-white shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-5 sm:px-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-700">Municipal history</p>
                <h2 id="history-heading" className="mt-1 text-xl font-bold text-gray-950">Past records</h2>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">Recent activity</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left">
                <thead>
                  <tr className="bg-gray-50 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    <th className="px-6 py-3">Work / Record ID</th>
                    <th className="px-6 py-3">Department</th>
                    <th className="px-6 py-3">Location</th>
                    <th className="px-6 py-3">Last updated</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {PAST_RECORDS_MOCK.map((record) => (
                    <tr key={record.id} className="text-sm hover:bg-gray-50/70">
                      <td className="px-6 py-4">
                        <span className="block font-semibold text-gray-900">{record.title}</span>
                        <span className="mt-0.5 block text-xs text-gray-400">{record.id}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{record.department}</td>
                      <td className="px-6 py-4 text-gray-600">{record.location}</td>
                      <td className="px-6 py-4 text-gray-600">{record.updated}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          record.status === "Completed" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                        }`}>
                          {record.status === "Completed" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-gray-100 px-6 py-3 text-xs text-gray-400">
              History entries are sample records pending connection to the municipal records service.
            </p>
          </section>

          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 py-4 text-xs text-gray-400">
            <span>Sanchal Official Dashboard · Zone 9, Chennai</span>
            <Link href="/" className="font-medium text-blue-700 hover:text-blue-900">Back to Sanchal home</Link>
          </footer>
        </div>
      </main>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  detail: string;
  icon: typeof Activity;
  iconClass: string;
  trend: string;
  trendIcon: typeof Activity;
  trendClass?: string;
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  iconClass,
  trend,
  trendIcon: TrendIcon,
  trendClass = "text-gray-500",
}: StatCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-950">{value}</p>
        </div>
        <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconClass}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3">
        <span className="text-xs text-gray-500">{detail}</span>
        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${trendClass}`}>
          <TrendIcon className="h-3.5 w-3.5" />
          {trend}
        </span>
      </div>
    </div>
  );
}

interface ProjectCardProps {
  project: Project;
  isGeneratingPdf: boolean;
  onGeneratePdf: () => void;
}

function ProjectCard({ project, isGeneratingPdf, onGeneratePdf }: ProjectCardProps) {
  const score = Math.min(100, Math.max(0, project.delayRisk));
  const isConflict = project.status === "Critical Overlap";
  const departmentIcon = project.department.toLowerCase().includes("telecom")
    ? Radio
    : project.department.toLowerCase().includes("tangedco")
      ? Zap
      : Waves;
  const DepartmentIcon = departmentIcon;

  return (
    <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-md transition-shadow hover:shadow-lg sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <DepartmentIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{project.id}</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                isConflict ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
              }`}>
                {isConflict ? "Conflict detected" : "Active"}
              </span>
            </div>
            <h3 className="mt-1 text-base font-bold leading-snug text-gray-900">
              {shortDepartment(project.department)}
            </h3>
            <p className="mt-1 text-sm text-gray-500">{project.purpose}</p>
          </div>
        </div>
        <div className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 ${riskClasses(score)}`}>
          <span className="text-xl font-extrabold tabular-nums">{Math.round(score)}%</span>
          <span className="text-[11px] font-bold leading-tight">{riskLabel(score)}<br />delay risk</span>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-medium text-gray-500">Backend delay probability</span>
          <span className={`font-bold ${score >= 75 ? "text-red-700" : score >= 40 ? "text-amber-700" : "text-emerald-700"}`}>
            {Math.round(score)}%
          </span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-gray-100"
          role="progressbar"
          aria-label={`${Math.round(score)} percent delay risk`}
          aria-valuenow={Math.round(score)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={`h-full rounded-full transition-all ${score >= 75 ? "bg-red-500" : score >= 40 ? "bg-amber-500" : "bg-emerald-500"}`}
            style={{ width: `${score}%` }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-gray-400">
          {score > 0 ? "Backend conflict-risk estimate" : "No backend delay risk recorded"}
        </p>
      </div>

      <div className="mt-5 grid gap-x-5 gap-y-4 rounded-lg bg-gray-50 p-4 sm:grid-cols-2">
        <DetailItem icon={HardHat} label="Contractor" value={project.contractor.name} />
        <DetailItem icon={IndianRupee} label="Project cost" value={project.contractor.costInr > 0 ? formatCurrency(project.contractor.costInr) : "Awaiting estimate"} />
        <DetailItem icon={CalendarDays} label="Duration" value={`${projectDuration(project.startDate, project.endDate)} days · ${formatDate(project.startDate)}`} />
        <DetailItem icon={Clock3} label="Estimated completion" value={formatDate(project.endDate)} />
        <DetailItem icon={Route} label="Traffic diversion" value={project.contractor.diversionRoute} />
        <DetailItem icon={MapPin} label="Works department" value={project.department} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <a
          href={`mailto:${project.contractor.contact}`}
          className="text-xs font-medium text-blue-700 hover:text-blue-900"
        >
          Contact contractor <span className="font-normal text-gray-400">· {project.contractor.contact}</span>
        </a>
        <button
          type="button"
          onClick={onGeneratePdf}
          disabled={isGeneratingPdf}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isGeneratingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          {isGeneratingPdf ? "Preparing report…" : "Generate PDF Report"}
        </button>
      </div>
    </article>
  );
}

interface DetailItemProps {
  icon: typeof Activity;
  label: string;
  value: string;
}

function DetailItem({ icon: Icon, label, value }: DetailItemProps) {
  return (
    <div className="flex min-w-0 items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-gray-400">{label}</p>
        <p className="mt-0.5 break-words text-xs font-semibold leading-relaxed text-gray-700">{value}</p>
      </div>
    </div>
  );
}

function shortDepartment(department: string): string {
  if (department.includes("Water Supply")) return "Chennai Metro Water Board";
  if (department.includes("Jio Telecom")) return "Jio Telecom – Fiber Division";
  if (department.includes("Tamil Nadu Generation")) return "TANGEDCO";
  return department;
}
