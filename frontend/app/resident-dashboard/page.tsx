"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import dynamic from "next/dynamic";
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
  Waves,
  X,
} from "lucide-react";

const MapView = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[340px] items-center justify-center rounded-xl bg-gray-100 text-sm text-gray-500">
      <LoaderCircle className="mr-2 h-5 w-5 animate-spin text-blue-700" />
      Loading neighborhood map…
    </div>
  ),
});

type WorkStatus = "In progress" | "Scheduled";

interface ActiveWork {
  id: string;
  department: string;
  title: string;
  details: string;
  location: string;
  status: WorkStatus;
  estimatedCompletion: string;
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

interface PastRecord {
  id: string;
  title: string;
  department: string;
  location: string;
  completedOn: string;
}

interface ResidentDashboardData {
  works: ActiveWork[];
  officials: LocalOfficial[];
  delayRisks: Record<string, number>;
  pastRecords: PastRecord[];
}

const MOCK_DASHBOARD_DATA: ResidentDashboardData = {
  works: [
    {
      id: "WRK-1048",
      department: "PWD",
      title: "Road surface restoration",
      details: "Pothole repairs and resurfacing following underground utility work.",
      location: "Royapettah High Road",
      status: "In progress",
      estimatedCompletion: "18 Oct 2026",
    },
    {
      id: "WRK-1052",
      department: "Water",
      title: "Water-main pipe replacement",
      details: "Replacing a damaged section of the neighborhood water main.",
      location: "Peter’s Road, near Royapettah",
      status: "In progress",
      estimatedCompletion: "21 Oct 2026",
    },
    {
      id: "WRK-1057",
      department: "GCC",
      title: "Storm-water drain upgrade",
      details: "Drain improvements and scheduled road excavation.",
      location: "Lloyds Road",
      status: "Scheduled",
      estimatedCompletion: "28 Oct 2026",
    },
  ],
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
  delayRisks: {
    "WRK-1048": 28,
    "WRK-1052": 64,
    "WRK-1057": 18,
  },
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
  const [dashboardData] = useState<ResidentDashboardData>(MOCK_DASHBOARD_DATA);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [issueType, setIssueType] = useState(ISSUE_TYPES[0]);
  const [message, setMessage] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [formError, setFormError] = useState("");

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
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 text-white shadow-sm">
          <Waves className="h-6 w-6" />
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
        <a
          id="profile"
          href="#resident-profile"
          onClick={() => setMobileNavOpen(false)}
          className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-md transition hover:border-blue-200 hover:bg-blue-50/40"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-800">
            PS
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-gray-900">Priya Sharma</span>
            <span className="block truncate text-xs text-gray-500">Zone 9 · Royapettah</span>
          </span>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </a>
      </div>
    </div>
  );

  return (
    <div className="h-screen h-dvh overflow-hidden bg-gray-50 text-gray-900 lg:flex">
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

      <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:ml-72">
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
                {dashboardData.works.length} projects
              </span>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              {dashboardData.works.map((work) => {
                const risk = dashboardData.delayRisks[work.id] ?? 0;
                const riskDisplay = riskLevel(risk);

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
                          work.status === "In progress"
                            ? "bg-teal-50 text-teal-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {work.status}
                      </span>
                    </div>
                    <h3 className="mt-4 text-base font-bold text-gray-900">{work.title}</h3>
                    <p className="mt-1.5 min-h-10 text-sm leading-5 text-gray-600">{work.details}</p>
                    <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500">
                      <MapPin className="h-3.5 w-3.5" />
                      {work.location}
                    </p>

                    <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4 text-sm">
                      <span className="inline-flex items-center gap-1.5 text-gray-500">
                        <CalendarDays className="h-4 w-4" />
                        Est. completion
                      </span>
                      <span className="font-semibold text-gray-800">{work.estimatedCompletion}</span>
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
                        aria-label={`Estimated delay chance for ${work.title}`}
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
            <p className="mt-3 text-xs leading-5 text-gray-500">
              Delay estimates are indicative predictions based on project risk signals; final schedules
              are confirmed by the responsible department.
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
              {dashboardData.officials.map((official) => (
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
                {dashboardData.pastRecords.map((record) => (
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
