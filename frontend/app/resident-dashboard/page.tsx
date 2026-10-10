"use client";

import { startTransition, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowUpRight,
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  HardHat,
  LoaderCircle,
  MapPin,
  Menu,
  MessageSquare,
  Paperclip,
  Phone,
  Send,
  ShieldCheck,
  Upload,
  UserRound,
  X,
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const MapView = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[340px] items-center justify-center rounded-xl bg-gray-100 text-sm text-gray-500">
      <LoaderCircle className="mr-2 h-5 w-5 animate-spin text-blue-700" />
      Loading neighborhood map…
    </div>
  ),
});

interface ApiProjectProperties {
  id: string;
  department: string;
  purpose: string;
  startDate: string;
  endDate: string;
  status: string;
  conflictsWith: string[];
}

interface ApiProjectsResponse {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: ApiProjectProperties;
  }>;
}

interface ApiConflict {
  project1_id: string;
  project2_id: string;
  delay_risk_score: number;
}

interface ApiConflictsResponse {
  conflicts: ApiConflict[];
}

interface LocalOfficial {
  id: string;
  name: string;
  role: string;
  organization: string;
  phone: string;
  email: string;
  initials: string;
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

interface PastRecord {
  id: string;
  title: string;
  department: string;
  location: string;
  completedOn: string;
}

interface ResidentDashboardFallbacks {
  officials: LocalOfficial[];
  pastRecords: PastRecord[];
}

const MOCK_DASHBOARD_DATA: ResidentDashboardFallbacks = {
  officials: [
    {
      id: "OFF-091",
      name: "Meena Krishnan",
      role: "Ward Engineer",
      organization: "Greater Chennai Corporation · Zone 9",
      phone: "+91 44 2852 1140",
      email: "ward9.engineer@chennaicorporation.gov.in",
      initials: "MK",
    },
    {
      id: "OFF-104",
      name: "Arun Prakash",
      role: "PWD Site Supervisor",
      organization: "Highways Department · Royapettah",
      phone: "+91 44 2854 2076",
      email: "royapettah.pwd@tn.gov.in",
      initials: "AP",
    },
    {
      id: "CON-212",
      name: "Kaveri Civil Works",
      role: "Road works contractor",
      organization: "Assigned contractor · Zone 9",
      phone: "+91 98400 36128",
      email: "community@kavericivil.in",
      initials: "KC",
    },
  ],
  pastRecords: [
    {
      id: "HIS-0248",
      title: "Storm-water drain desilting",
      department: "Greater Chennai Corporation",
      location: "Royapettah, Zone 9",
      completedOn: "08 Oct 2026",
    },
    {
      id: "HIS-0244",
      title: "Road surface restoration",
      department: "PWD",
      location: "Royapettah High Road",
      completedOn: "02 Oct 2026",
    },
    {
      id: "HIS-0239",
      title: "Streetlight cable maintenance",
      department: "TANGEDCO",
      location: "Lloyds Road",
      completedOn: "26 Sep 2026",
    },
  ],
};

function formatProjectDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const ISSUE_TYPES = [
  "Unfilled pothole",
  "Abandoned digging site",
  "Water leak",
  "Damaged footpath",
  "Other neighborhood issue",
];

function riskLevel(score: number): { label: string; color: string; bar: string } {
  if (score >= 70) {
    return {
      label: "Higher chance of delay",
      color: "border-amber-200 bg-amber-50 text-amber-800",
      bar: "bg-amber-500",
    };
  }
  if (score >= 40) {
    return {
      label: "Some delay risk",
      color: "border-blue-200 bg-blue-50 text-blue-800",
      bar: "bg-blue-500",
    };
  }
  return {
    label: "On track",
    color: "border-teal-200 bg-teal-50 text-teal-800",
    bar: "bg-teal-600",
  };
}

export default function ResidentDashboard() {
  const router = useRouter();
  const [signedInUser, setSignedInUser] = useState<StoredUser | null>(null);
  const [works, setWorks] = useState<ApiProjectProperties[]>([]);
  const [conflicts, setConflicts] = useState<ApiConflict[]>([]);
  const [isLoadingWorks, setIsLoadingWorks] = useState(true);
  const [worksError, setWorksError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [issueType, setIssueType] = useState(ISSUE_TYPES[0]);
  const [message, setMessage] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [formError, setFormError] = useState("");

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
    const controller = new AbortController();

    async function loadWorks(): Promise<void> {
      try {
        const [projectsResponse, conflictsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/projects`, { signal: controller.signal }),
          fetch(`${API_BASE_URL}/api/conflicts`, { signal: controller.signal }),
        ]);
        if (!projectsResponse.ok) {
          throw new Error(`Projects service responded with ${projectsResponse.status}`);
        }
        if (!conflictsResponse.ok) {
          throw new Error(`Conflict service responded with ${conflictsResponse.status}`);
        }

        const [projectsData, conflictsData] = await Promise.all([
          projectsResponse.json() as Promise<ApiProjectsResponse>,
          conflictsResponse.json() as Promise<ApiConflictsResponse>,
        ]);
        if (!Array.isArray(projectsData.features) || !Array.isArray(conflictsData.conflicts)) {
          throw new Error("The projects or conflicts service returned an invalid response.");
        }

        setWorks(projectsData.features.map(({ properties }) => properties));
        setConflicts(conflictsData.conflicts);
        setWorksError(null);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        const message =
          error instanceof Error ? error.message : "An unexpected error occurred.";
        console.error("[Sanchal] Failed to load resident dashboard works:", error);
        setWorksError(message);
      } finally {
        if (!controller.signal.aborted) setIsLoadingWorks(false);
      }
    }

    void loadWorks();
    return () => controller.abort();
  }, [retryCount]);

  const delayRiskByProject = new Map<string, number>();
  conflicts.forEach((conflict) => {
    [conflict.project1_id, conflict.project2_id].forEach((projectId) => {
      delayRiskByProject.set(
        projectId,
        Math.max(delayRiskByProject.get(projectId) ?? 0, conflict.delay_risk_score),
      );
    });
  });

  function handleRetryWorks() {
    setIsLoadingWorks(true);
    setWorksError(null);
    setRetryCount((count) => count + 1);
  }

  function handleProofChange(event: ChangeEvent<HTMLInputElement>) {
    setProofFile(event.target.files?.[0] ?? null);
  }

  function handleReportSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setReportSubmitted(false);

    if (!message.trim()) {
      setFormError("Please add a short description so the local team can help.");
      return;
    }

    setReportSubmitted(true);
    setMessage("");
    setProofFile(null);
    event.currentTarget.reset();
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <a
        href="#my-neighborhood"
        onClick={() => setMobileNavOpen(false)}
        className="flex items-center gap-3 border-b border-gray-100 px-6 py-6"
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
            Your neighborhood, connected
          </span>
        </span>
      </a>

      <nav aria-label="Resident dashboard navigation" className="flex-1 space-y-1 px-4 py-6">
        <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">
          Resident portal
        </p>
        {[
          { label: "My Neighborhood", href: "#my-neighborhood", icon: MapPin },
          { label: "Report an Issue", href: "#report-issue", icon: MessageSquare },
          { label: "Past Records", href: "#past-records", icon: FileText },
          { label: "Local Directory", href: "#local-directory", icon: Building2 },
        ].map(({ label, href, icon: Icon }, index) => (
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
            {label === "Report an Issue" && (
              <span className="ml-auto h-2 w-2 rounded-full bg-teal-500" />
            )}
          </a>
        ))}
      </nav>

      <div className="border-t border-gray-100 p-4">
        <button
          id="profile"
          type="button"
          aria-label="Open your profile"
          onClick={() => {
            setMobileNavOpen(false);
            router.push("/profile");
          }}
          className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-md transition hover:border-blue-200 hover:bg-blue-50/40"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-800">
            {getInitials(signedInUser?.full_name)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-gray-900">{signedInUser?.full_name ?? "Your profile"}</span>
            <span className="block truncate text-xs text-gray-500">
              {signedInUser?.role === "official" ? "Municipal Official" : signedInUser?.role === "resident" ? "Resident" : "Profile"}
              {signedInUser?.home_zone ? ` · ${signedInUser.home_zone}` : signedInUser?.profession_department ? ` · ${signedInUser.profession_department}` : signedInUser?.address_location ? ` · ${signedInUser.address_location}` : ""}
            </span>
          </span>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-screen h-dvh overflow-hidden bg-gray-50 text-gray-900 lg:pl-72 flex flex-col">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-gray-200 bg-white lg:block">
        {sidebar}
      </aside>

      {mobileNavOpen && (
        <button
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-40 bg-gray-950/30 lg:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-gray-200 bg-white transition-transform duration-200 lg:hidden ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebar}
      </aside>

      <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden w-full">
        <header className="sticky top-0 z-30 shrink-0 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
                onClick={() => setMobileNavOpen(!mobileNavOpen)}
                className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
              >
                {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <div>
                <p className="text-xs font-semibold text-gray-500">Resident dashboard</p>
                <p className="text-sm font-bold text-gray-900">Royapettah · Zone 9, Chennai</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 sm:inline-flex">
                <span className="h-2 w-2 rounded-full bg-teal-500" />
                Local updates
              </span>
              <button
                type="button"
                aria-label="Notifications"
                className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
              >
                <Bell className="h-5 w-5" />
              </button>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-800">
                PS
              </span>
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="mx-auto max-w-7xl space-y-8 px-4 py-7 sm:px-8 sm:py-9">
          <section id="my-neighborhood" className="scroll-mt-24">
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-teal-700">
                  <MapPin className="h-4 w-4" />
                  Your local area
                </p>
                <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
                  Good morning, Priya
                </h1>
                <p className="mt-1.5 max-w-2xl text-sm leading-6 text-gray-600">
                  See what is happening around Royapettah, follow nearby works, and reach your local team.
                </p>
              </div>
              <a
                href="#report-issue"
                className="inline-flex w-fit items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
              >
                <MessageSquare className="h-4 w-4" />
                Report an issue
              </a>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md">
              <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-bold text-gray-900">Neighborhood activity</h2>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Royapettah and nearby streets · Zone 9
                  </p>
                </div>
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
                  <MapPin className="h-3.5 w-3.5" />
                  Nearby repair and excavation sites
                </span>
              </div>
              <div className="h-[340px] sm:h-[420px]">
                <MapView center={[13.055, 80.263]} zoom={15} />
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-gray-100 px-5 py-3 text-xs text-gray-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  Active work
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                  Conflict area
                </span>
                <span className="ml-auto">Map shows reported project areas in Chennai.</span>
              </div>
            </div>
          </section>

          <section id="active-works" className="scroll-mt-24">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <HardHat className="h-5 w-5 text-blue-700" />
                  <h2 className="text-xl font-bold text-gray-900">Active works nearby</h2>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Local project updates and resident-friendly delay estimates.
                </p>
              </div>
              <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-600">
                {isLoadingWorks
                  ? "Loading…"
                  : worksError
                    ? "Unavailable"
                    : `${works.length} projects`}
              </span>
            </div>

            {isLoadingWorks ? (
              <div
                role="status"
                className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-12 text-sm text-gray-500 shadow-md"
              >
                <LoaderCircle className="h-5 w-5 animate-spin text-blue-700" />
                Loading active neighborhood works…
              </div>
            ) : worksError ? (
              <div
                role="alert"
                className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-5 sm:flex-row sm:items-center"
              >
                <p className="flex items-start gap-2 text-sm text-red-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  Could not load active works: {worksError}
                </p>
                <button
                  type="button"
                  onClick={handleRetryWorks}
                  className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-800 transition hover:bg-red-100"
                >
                  Try again
                </button>
              </div>
            ) : works.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white px-5 py-12 text-center text-sm text-gray-500 shadow-md">
                No active works were returned for this area.
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-3">
                {works.map((work) => {
                  const risk = delayRiskByProject.get(work.id) ?? 0;
                  const riskDisplay = riskLevel(risk);
                  const isAtRisk = work.status === "Critical Overlap";

                  return (
                    <article
                      key={work.id}
                      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-800">
                          <Building2 className="h-3.5 w-3.5" />
                          {work.department}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            isAtRisk ? "bg-amber-50 text-amber-800" : "bg-teal-50 text-teal-800"
                          }`}
                        >
                          {isAtRisk ? "Schedule at risk" : "On schedule"}
                        </span>
                      </div>
                      <h3 className="mt-4 text-base font-bold text-gray-900">{work.purpose}</h3>
                      <p className="mt-1.5 min-h-10 text-sm leading-5 text-gray-600">
                        {work.status === "Critical Overlap"
                          ? `This project has a reported overlap with ${work.conflictsWith.join(", ")}.`
                          : "No overlapping works are currently reported for this project."}
                      </p>
                      <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500">
                        <MapPin className="h-3.5 w-3.5" />
                        Mapped works corridor · Chennai
                      </p>

                      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4 text-sm">
                        <span className="inline-flex items-center gap-1.5 text-gray-500">
                          <CalendarDays className="h-4 w-4" />
                          Est. completion
                        </span>
                        <span className="font-semibold text-gray-800">
                          {formatProjectDate(work.endDate)}
                        </span>
                      </div>

                      <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                            <Clock3 className="h-3.5 w-3.5 text-blue-700" />
                            Estimated delay chance
                          </span>
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${riskDisplay.color}`}>
                            {riskDisplay.label}
                          </span>
                        </div>
                        <div
                          className="mt-2.5 h-2 overflow-hidden rounded-full bg-gray-200"
                          role="progressbar"
                          aria-label={`Estimated delay chance for ${work.purpose}`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={risk}
                        >
                          <div
                            className={`h-full rounded-full ${riskDisplay.bar}`}
                            style={{ width: `${risk}%` }}
                          />
                        </div>
                        <p className="mt-1.5 text-right text-xs font-semibold text-gray-500">{risk}%</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
            <p className="mt-3 text-xs leading-5 text-gray-500">
              Delay estimates use the backend conflict-risk score; final schedules are confirmed by
              the responsible department.
            </p>
          </section>

          <section id="report-issue" className="scroll-mt-24">
            <div className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-md">
              <div className="flex flex-col gap-4 bg-gradient-to-r from-blue-50 to-teal-50 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm">
                    <MessageSquare className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-teal-800">
                      Your voice matters
                    </p>
                    <h2 className="mt-1 text-xl font-extrabold text-gray-900">
                      Report a neighborhood issue
                    </h2>
                    <p className="mt-1 text-sm text-gray-600">
                      Send a note to the local team responsible for your area.
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                  <ShieldCheck className="h-4 w-4 text-teal-700" />
                  Shared with your assigned officials
                </span>
              </div>

              <form onSubmit={handleReportSubmit} className="space-y-5 p-5 sm:p-7">
                <div className="grid gap-5 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-semibold text-gray-700">
                      What needs attention?
                    </span>
                    <select
                      value={issueType}
                      onChange={(event) => setIssueType(event.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                    >
                      {ISSUE_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Assigned local contact
                    </p>
                    <p className="mt-1 text-sm font-bold text-gray-900">Meena Krishnan · Ward Engineer</p>
                    <p className="mt-0.5 text-xs text-gray-500">Greater Chennai Corporation · Zone 9</p>
                  </div>
                </div>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-gray-700">
                    Message to your local official
                  </span>
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    rows={4}
                    maxLength={1000}
                    placeholder="Describe the issue and where you noticed it (street, landmark, or nearby address)…"
                    className="w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm leading-6 text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                  <span className="mt-1 block text-right text-xs text-gray-400">
                    {message.length}/1000
                  </span>
                </label>

                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <input
                      id="issue-proof"
                      type="file"
                      accept="image/*"
                      onChange={handleProofChange}
                      className="sr-only"
                    />
                    <label
                      htmlFor="issue-proof"
                      className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 transition hover:border-teal-400 hover:bg-teal-50/50"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-teal-700 shadow-sm">
                        {proofFile ? <Paperclip className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-gray-800">
                          {proofFile ? proofFile.name : "Attach a photo"}
                        </span>
                        <span className="block text-xs text-gray-500">
                          {proofFile ? "Choose another image" : "Add a photo as proof (optional)"}
                        </span>
                      </span>
                    </label>
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                  >
                    Send report
                    <Send className="h-4 w-4" />
                  </button>
                </div>

                {formError && (
                  <p role="alert" className="flex items-center gap-2 text-sm font-medium text-red-700">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {formError}
                  </p>
                )}
                {reportSubmitted && (
                  <p
                    role="status"
                    className="flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-800"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Your {issueType.toLowerCase()} report is ready for the Zone 9 team. Connect this
                    form to the reporting service to send it.
                  </p>
                )}
              </form>
            </div>
          </section>

          <section id="local-directory" className="scroll-mt-24">
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-700" />
                <h2 className="text-xl font-bold text-gray-900">Your local directory</h2>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Municipal officials and contractors assigned to your area.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {MOCK_DASHBOARD_DATA.officials.map((official) => (
                <article
                  key={official.id}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-800">
                      {official.initials}
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-gray-900">{official.name}</h3>
                      <p className="mt-0.5 text-xs font-medium text-teal-700">{official.role}</p>
                    </div>
                  </div>
                  <p className="mt-4 min-h-10 text-xs leading-5 text-gray-500">
                    {official.organization}
                  </p>
                  <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                    <a
                      href={`tel:${official.phone.replaceAll(" ", "")}`}
                      className="flex items-center gap-2 text-xs font-medium text-gray-700 hover:text-blue-700"
                    >
                      <Phone className="h-3.5 w-3.5 text-gray-400" />
                      {official.phone}
                      <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-gray-400" />
                    </a>
                    <a
                      href={`mailto:${official.email}`}
                      className="block truncate text-xs font-medium text-blue-700 hover:text-blue-900"
                    >
                      {official.email}
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section id="past-records" className="scroll-mt-24 pb-5">
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-700" />
                <h2 className="text-xl font-bold text-gray-900">Recently completed works</h2>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                A transparent record of improvements made in your neighborhood.
              </p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-md">
              <div className="divide-y divide-gray-100">
                {MOCK_DASHBOARD_DATA.pastRecords.map((record) => (
                  <article
                    key={record.id}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                        <CheckCircle2 className="h-4 w-4" />
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">{record.title}</h3>
                        <p className="mt-1 text-xs text-gray-500">
                          {record.department} · {record.location}
                        </p>
                      </div>
                    </div>
                    <span className="pl-12 text-xs font-medium text-gray-500 sm:pl-0">
                      Completed {record.completedOn}
                    </span>
                  </article>
                ))}
              </div>
              <div className="border-t border-gray-100 bg-gray-50 px-5 py-3 text-xs text-gray-500">
                Showing recent records for Royapettah, Zone 9.
              </div>
            </div>
          </section>

          <footer id="resident-profile" className="border-t border-gray-200 py-4 text-xs text-gray-500">
            <span className="inline-flex items-center gap-1.5">
              <UserRound className="h-3.5 w-3.5" />
              Resident view for Priya Sharma · Zone 9, Royapettah
            </span>
          </footer>
          </div>
        </div>
      </main>
    </div>
  );
}
