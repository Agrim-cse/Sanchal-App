"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import {
  Activity,
  ShieldCheck,
  Users,
  MapPin,
  AlertTriangle,
  BarChart2,
  FileText,
  Bell,
  ChevronRight,
  Menu,
  X,
  Layers,
  Brain,
  Network,
  Eye,
  MessageSquare,
  Download,
} from "lucide-react";

function scrollTo(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth" });
}

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { label: "About", id: "about" },
    { label: "The Impact", id: "stats" },
    { label: "Portals", id: "portals" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-md shadow-md border-b border-slate-200"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/sanchal-logo.png"
              alt="Sanchal"
              width={36}
              height={36}
              className="rounded-xl object-contain bg-[#3d1f00] p-0.5"
            />
            <span className={`font-bold text-xl tracking-tight transition-colors ${scrolled ? "text-slate-800" : "text-white"}`}>
              Sanchal
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollTo(link.id)}
                className={`text-sm font-medium transition-colors hover:text-teal-600 cursor-pointer ${
                  scrolled ? "text-slate-600" : "text-white/90"
                }`}
              >
                {link.label}
              </button>
            ))}
            <Link
              href="/auth"
              className="ml-2 inline-flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all shadow-sm"
            >
              Login / Sign Up
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <button
            className={`md:hidden p-2 rounded-lg transition-colors ${
              scrolled ? "text-slate-700 hover:bg-slate-100" : "text-white hover:bg-white/10"
            }`}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 shadow-lg rounded-b-2xl px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => { scrollTo(link.id); setMenuOpen(false); }}
                className="block w-full text-left text-sm font-medium text-slate-700 hover:text-teal-600 py-2"
              >
                {link.label}
              </button>
            ))}
            <Link
              href="/auth"
              className="block text-center bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-all"
            >
              Login / Sign Up
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900">
      <div className="absolute top-20 left-10 w-72 h-72 bg-teal-500/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 grid lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 bg-teal-500/15 border border-teal-500/30 rounded-full px-4 py-1.5">
            <MapPin className="w-4 h-4 text-teal-400" />
            <span className="text-teal-300 text-sm font-medium">Municipal Road Conflict Monitor</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight">
            Synchronizing{" "}
            <span className="bg-gradient-to-r from-teal-400 to-blue-400 bg-clip-text text-transparent">
              Municipal Infrastructure.
            </span>{" "}
            Ending Road Conflicts.
          </h1>

          <p className="text-lg text-slate-300 leading-relaxed max-w-xl">
            Sanchal brings Water, Telecom, PWD, and all civic departments onto a single intelligent
            platform — detecting spatial conflicts before roads are dug up twice, predicting delays
            with AI, and keeping citizens in the loop.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/auth"
              className="inline-flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-400 text-white font-semibold px-7 py-3.5 rounded-xl transition-all shadow-[0_0_40px_-8px_rgba(20,184,166,0.6)]"
            >
              <ShieldCheck className="w-5 h-5" />
              Official Portal
            </Link>
            <Link
              href="/auth"
              className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-7 py-3.5 rounded-xl transition-all backdrop-blur-sm"
            >
              <Users className="w-5 h-5" />
              Resident Portal
            </Link>
          </div>

          <div className="flex flex-wrap gap-4 pt-2">
            {["AI-Powered Detection", "Grievance Tracking", "PDF Reports", "Real-Time Alerts"].map((t) => (
              <span key={t} className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 inline-block" />
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-gradient-to-br from-slate-800 to-slate-900 aspect-[4/3] flex flex-col items-center justify-center gap-4">
            <div className="absolute top-0 left-0 right-0 h-10 bg-slate-700/60 flex items-center px-4 gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
              <div className="ml-3 bg-slate-600/60 rounded h-5 flex-1 max-w-sm" />
            </div>
            <div className="mt-10 flex flex-col items-center gap-3 text-center px-8">
              <div className="w-16 h-16 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
                <Layers className="w-8 h-8 text-teal-400" />
              </div>
              <p className="text-slate-400 text-sm font-medium">[Insert Hero Dashboard Screenshot Here]</p>
              <p className="text-slate-600 text-xs">Spatial conflict map · ML risk scores · Live project status</p>
            </div>
          </div>
          <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-xl px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Active Conflicts</p>
              <p className="text-lg font-bold text-slate-800">14</p>
            </div>
          </div>
          <div className="absolute -top-4 -right-4 bg-white rounded-xl shadow-xl px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
              <Activity className="w-4 h-4 text-teal-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Projects Synced</p>
              <p className="text-lg font-bold text-slate-800">83</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const stats = [
  {
    value: "60%",
    label: "of road lifespan lost",
    desc: "Roads dug up repeatedly by uncoordinated agencies lose up to 60% of their designed lifespan prematurely.",
    icon: <BarChart2 className="w-7 h-7" />,
    color: "from-red-500 to-orange-500",
    bg: "bg-red-50",
    border: "border-red-100",
    text: "text-red-600",
  },
  {
    value: "\u20b92,400Cr",
    label: "wasted annually in India",
    desc: "Uncoordinated utility repairs across urban India drain public funds that could build hundreds of km of quality roads.",
    icon: <AlertTriangle className="w-7 h-7" />,
    color: "from-amber-500 to-yellow-400",
    bg: "bg-amber-50",
    border: "border-amber-100",
    text: "text-amber-600",
  },
  {
    value: "3\u20138\u00d7",
    label: "re-excavation multiplier",
    desc: "A newly laid road is dug up an average of 3 to 8 times by different departments within its first five years.",
    icon: <Layers className="w-7 h-7" />,
    color: "from-purple-500 to-blue-500",
    bg: "bg-purple-50",
    border: "border-purple-100",
    text: "text-purple-600",
  },
  {
    value: "74%",
    label: "grievances go unresolved",
    desc: "Citizens reporting road quality issues see no resolution — no tracking, no accountability, no closure.",
    icon: <MessageSquare className="w-7 h-7" />,
    color: "from-teal-500 to-green-500",
    bg: "bg-teal-50",
    border: "border-teal-100",
    text: "text-teal-600",
  },
];

function StatsSection() {
  return (
    <section id="stats" className="py-24 bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 space-y-4">
          <span className="inline-block text-sm font-semibold text-teal-600 uppercase tracking-widest">
            The Problem Is Real
          </span>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 leading-tight">
            India&apos;s Roads Pay the Price of{" "}
            <span className="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
              Chaos
            </span>
          </h2>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">
            When departments don&apos;t talk to each other, roads, budgets, and citizens all suffer.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((s) => (
            <div
              key={s.value}
              className={`relative rounded-2xl border ${s.border} ${s.bg} p-6 space-y-4 hover:shadow-lg transition-shadow`}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-white shadow-md`}>
                {s.icon}
              </div>
              <div>
                <p className={`text-4xl font-extrabold ${s.text}`}>{s.value}</p>
                <p className="text-sm font-semibold text-slate-700 mt-1">{s.label}</p>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 rounded-2xl bg-gradient-to-r from-teal-600 to-blue-600 p-8 sm:p-10 text-center text-white shadow-xl">
          <p className="text-xl sm:text-2xl font-bold leading-snug max-w-3xl mx-auto">
            &ldquo;Every rupee spent on coordination saves three in reconstruction.
            Sanchal makes that coordination automatic.&rdquo;
          </p>
          <p className="mt-3 text-teal-200 text-sm">— Built for Bharat&apos;s municipal future</p>
        </div>
      </div>
    </section>
  );
}

function AboutSection() {
  const features = [
    { icon: <Brain className="w-5 h-5" />, text: "ML-powered delay risk prediction" },
    { icon: <MapPin className="w-5 h-5" />, text: "Spatial conflict detection on GIS maps" },
    { icon: <Network className="w-5 h-5" />, text: "Cross-department coordination (Water, Telecom, PWD)" },
    { icon: <Bell className="w-5 h-5" />, text: "Real-time conflict alerts & notifications" },
    { icon: <Eye className="w-5 h-5" />, text: "Citizen transparency dashboard" },
    { icon: <Download className="w-5 h-5" />, text: "Automated PDF grievance tracking" },
  ];

  return (
    <section id="about" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 space-y-4">
          <span className="inline-block text-sm font-semibold text-teal-600 uppercase tracking-widest">
            How Sanchal Helps
          </span>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900">
            One Platform.{" "}
            <span className="bg-gradient-to-r from-teal-500 to-blue-500 bg-clip-text text-transparent">
              Two Powerful Portals.
            </span>
          </h2>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">
            Sanchal bridges the gap between municipal decision-makers and the citizens they serve.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 mb-20">
          {features.map((f) => (
            <div
              key={f.text}
              className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-sm text-slate-700 font-medium"
            >
              <span className="text-teal-600">{f.icon}</span>
              {f.text}
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-8 text-center">
          {[
            {
              step: "01",
              title: "Departments Log Projects",
              desc: "Water, Telecom, PWD and other agencies register upcoming road works with location, timeline, and scope.",
              icon: <FileText className="w-8 h-8 text-teal-600" />,
            },
            {
              step: "02",
              title: "AI Detects Conflicts",
              desc: "Our spatial engine cross-checks project zones for overlaps. ML models flag high-risk delay scenarios instantly.",
              icon: <Brain className="w-8 h-8 text-blue-600" />,
            },
            {
              step: "03",
              title: "Everyone Stays Informed",
              desc: "Officials coordinate in real-time. Citizens track work near them, file grievances, and receive PDF confirmations.",
              icon: <Bell className="w-8 h-8 text-purple-600" />,
            },
          ].map((item) => (
            <div key={item.step} className="relative space-y-4 p-6">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 text-8xl font-black text-slate-100 select-none pointer-events-none">
                {item.step}
              </div>
              <div className="relative z-10 flex justify-center">
                <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center shadow-sm">
                  {item.icon}
                </div>
              </div>
              <h3 className="relative z-10 text-lg font-bold text-slate-800">{item.title}</h3>
              <p className="relative z-10 text-slate-500 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PortalsSection() {
  const officialFeatures = [
    { icon: <MapPin className="w-4 h-4" />, text: "Spatial conflict detection on live GIS map" },
    { icon: <Brain className="w-4 h-4" />, text: "ML-based delay risk scoring per project" },
    { icon: <Network className="w-4 h-4" />, text: "Inter-departmental coordination (Water, Telecom, PWD)" },
    { icon: <BarChart2 className="w-4 h-4" />, text: "Project analytics & resource planning dashboard" },
    { icon: <Bell className="w-4 h-4" />, text: "Automated conflict alert notifications" },
  ];

  const residentFeatures = [
    { icon: <Eye className="w-4 h-4" />, text: "Transparent view of all ongoing road projects" },
    { icon: <MessageSquare className="w-4 h-4" />, text: "Easy grievance submission with photo upload" },
    { icon: <Download className="w-4 h-4" />, text: "Auto-generated PDF grievance acknowledgement" },
    { icon: <Bell className="w-4 h-4" />, text: "Status updates & resolution tracking" },
    { icon: <MapPin className="w-4 h-4" />, text: "Location-based project discovery near you" },
  ];

  return (
    <section id="portals" className="py-24 bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 space-y-4">
          <span className="inline-block text-sm font-semibold text-teal-600 uppercase tracking-widest">
            Dual-Portal Design
          </span>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900">
            The Right Tools for{" "}
            <span className="bg-gradient-to-r from-teal-500 to-blue-500 bg-clip-text text-transparent">
              Every Stakeholder
            </span>
          </h2>
          <p className="text-slate-500 text-lg max-w-2xl mx-auto">
            Officials get the power of AI and spatial analytics. Residents get the transparency and voice they deserve.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-widest font-medium">For Officials</p>
                  <h3 className="text-white font-bold text-lg">Official Portal</h3>
                </div>
              </div>
              <div className="rounded-xl bg-slate-700/50 border border-white/10 aspect-video flex flex-col items-center justify-center gap-3 text-center p-4">
                <Layers className="w-10 h-10 text-teal-400/60" />
                <p className="text-slate-400 text-sm font-medium">[Insert Official Portal Screenshot Here]</p>
                <p className="text-slate-600 text-xs">GIS conflict map · ML risk scores · Department coordination</p>
              </div>
            </div>
            <div className="p-8 space-y-4 flex-1">
              <p className="text-slate-600 text-sm leading-relaxed">
                A powerful command center for municipal officers to manage, coordinate, and optimize road construction across all departments.
              </p>
              <ul className="space-y-3">
                {officialFeatures.map((f) => (
                  <li key={f.text} className="flex items-center gap-3 text-sm text-slate-700">
                    <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center flex-shrink-0">
                      {f.icon}
                    </span>
                    {f.text}
                  </li>
                ))}
              </ul>
              <Link
                href="/auth"
                className="mt-6 w-full inline-flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold px-6 py-3 rounded-xl transition-all"
              >
                <ShieldCheck className="w-5 h-5" />
                Enter Official Portal
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col">
            <div className="bg-gradient-to-br from-blue-800 to-indigo-900 p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-400/20 border border-blue-400/30 flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <p className="text-xs text-blue-300 uppercase tracking-widest font-medium">For Residents</p>
                  <h3 className="text-white font-bold text-lg">Resident Portal</h3>
                </div>
              </div>
              <div className="rounded-xl bg-blue-700/30 border border-white/10 aspect-video flex flex-col items-center justify-center gap-3 text-center p-4">
                <Users className="w-10 h-10 text-blue-300/60" />
                <p className="text-blue-200/70 text-sm font-medium">[Insert Resident Portal Screenshot Here]</p>
                <p className="text-blue-400/50 text-xs">Project tracker · Grievance form · PDF download</p>
              </div>
            </div>
            <div className="p-8 space-y-4 flex-1">
              <p className="text-slate-600 text-sm leading-relaxed">
                A transparent, citizen-first interface for residents to stay informed about road work near them and hold the system accountable.
              </p>
              <ul className="space-y-3">
                {residentFeatures.map((f) => (
                  <li key={f.text} className="flex items-center gap-3 text-sm text-slate-700">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                      {f.icon}
                    </span>
                    {f.text}
                  </li>
                ))}
              </ul>
              <Link
                href="/auth"
                className="mt-6 w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition-all"
              >
                <Users className="w-5 h-5" />
                Enter Resident Portal
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">Sanchal</span>
            <span className="text-slate-600 text-sm">· Municipal Road Conflict Monitor</span>
          </div>
          <nav className="flex items-center gap-6 text-sm">
            <button onClick={() => scrollTo("about")} className="hover:text-white transition-colors">About</button>
            <button onClick={() => scrollTo("stats")} className="hover:text-white transition-colors">The Impact</button>
            <button onClick={() => scrollTo("portals")} className="hover:text-white transition-colors">Portals</button>
            <Link href="/dashboard" className="hover:text-white transition-colors">Login</Link>
          </nav>
        </div>
        <div className="mt-8 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <p>© {new Date().getFullYear()} Sanchal. Built for smarter, accountable urban infrastructure.</p>
          <p>Made with &hearts; for Bharat&apos;s cities.</p>
        </div>
      </div>
    </footer>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <HeroSection />
      <StatsSection />
      <AboutSection />
      <PortalsSection />
      <Footer />
    </main>
  );
}
