"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Clock3, HardHat, Loader2, LogOut, MapPin, MessageSquare, ShieldCheck, X } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
interface Work {
  id: number; title: string; description: string; department: string; contractor_id: number;
  zone: string; block: string; start_date: string; estimated_completion: string;
  status: "Pending" | "Ongoing" | "Completed"; cost: number; conflicts_detected: string | null;
  ml_delay_risk_score: number | null;
}
interface Grievance {
  id: number; resident_id: number; zone: string; block: string; issue_type: string;
  description: string; photo_url: string | null; status: string;
}
interface StoredUser { id: number; email: string; full_name: string; role: string; zone: string; block: string; }
const ISSUE_TYPES = ["Unfilled pothole", "Abandoned digging site", "Water leak", "Damaged footpath", "Other neighborhood issue"];

export default function ResidentDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [issueType, setIssueType] = useState(ISSUE_TYPES[0]);
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [modalPassword, setModalPassword] = useState("");
  const [modalError, setModalError] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalActionCallback, setModalActionCallback] = useState<(() => Promise<void>) | null>(null);

  const loadData = useCallback(async (token: string) => {
    const headers = { Authorization: `Bearer ${token}` };
    const [worksResponse, grievancesResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/api/works`, { headers }),
      fetch(`${API_BASE_URL}/api/grievances`, { headers }),
    ]);
    if (!worksResponse.ok || !grievancesResponse.ok) throw new Error("Could not load your neighborhood data. Please sign in again.");
    const [nextWorks, nextGrievances] = await Promise.all([
      worksResponse.json() as Promise<Work[]>, grievancesResponse.json() as Promise<Grievance[]>,
    ]);
    setWorks(nextWorks);
    setGrievances(nextGrievances);
  }, []);

  useEffect(() => {
    let alive = true;
    const storedUser = localStorage.getItem("sanchal_user");
    const token = localStorage.getItem("sanchal_token");
    if (!storedUser || !token) { router.replace("/auth"); return; }
    try {
      const parsed = JSON.parse(storedUser) as StoredUser;
      if (parsed.role !== "resident") { router.replace("/dashboard"); return; }
      setUser(parsed);
    } catch { router.replace("/auth"); return; }
    void loadData(token).catch((cause: unknown) => {
      if (alive) setError(cause instanceof Error ? cause.message : "Could not load dashboard data.");
    }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [loadData, router]);

  function openPasswordModal(action: () => Promise<void>) {
    setModalActionCallback(() => action);
    setModalPassword(""); setModalError(""); setIsPasswordModalOpen(true);
  }

  function handleReportSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (!description.trim()) { setError("Please describe the issue before submitting."); return; }
    openPasswordModal(async () => {
      const token = localStorage.getItem("sanchal_token");
      if (!token) throw new Error("Your session has expired. Please sign in again.");
      const response = await fetch(`${API_BASE_URL}/api/grievances`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ issue_type: issueType, description: description.trim(), photo_url: photoUrl.trim() || null }),
      });
      const result = await response.json() as { detail?: string };
      if (!response.ok) throw new Error(result.detail ?? "Could not submit your grievance.");
      setDescription(""); setPhotoUrl("");
      await loadData(token);
    });
  }

  async function confirmPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !modalActionCallback) return;
    setModalLoading(true); setModalError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/verify-password`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, password: modalPassword }),
      });
      const result = await response.json() as { verified?: boolean; detail?: string };
      if (!response.ok || !result.verified) throw new Error(response.status === 401 ? "Incorrect password" : result.detail ?? "Password verification failed.");
      await modalActionCallback();
      setIsPasswordModalOpen(false); setModalActionCallback(null);
    } catch (cause) {
      setModalError(cause instanceof Error ? cause.message : "The action could not be completed.");
    } finally { setModalLoading(false); }
  }

  function logout() {
    localStorage.removeItem("sanchal_user"); localStorage.removeItem("sanchal_token"); router.push("/auth");
  }

  const openGrievances = grievances.filter((item) => item.status !== "Resolved").length;
  const myGrievances = grievances.filter((item) => item.resident_id === user?.id);
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div><p className="flex items-center gap-2 text-sm font-semibold text-blue-700"><ShieldCheck className="h-4 w-4" /> Resident portal</p>
            <h1 className="mt-2 text-2xl font-bold">{user ? `Welcome, ${user.full_name}` : "Neighborhood dashboard"}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500"><MapPin className="h-4 w-4" />{user?.zone} · {user?.block}</p>
          </div>
          <button onClick={logout} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold hover:bg-gray-50"><LogOut className="h-4 w-4" /> Log out</button>
        </header>
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {loading ? <div className="flex items-center gap-2 py-12 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Loading neighborhood data…</div> : <>
          <section className="grid gap-4 sm:grid-cols-3">
            <Summary label="Works in your block" value={works.length} icon={<HardHat className="h-5 w-5" />} />
            <Summary label="Open reports" value={openGrievances} icon={<MessageSquare className="h-5 w-5" />} />
            <Summary label="Completed works" value={works.filter((item) => item.status === "Completed").length} icon={<CheckCircle2 className="h-5 w-5" />} />
          </section>
          <section className="space-y-4">
            <div><h2 className="text-xl font-bold">Works near you</h2><p className="mt-1 text-sm text-slate-500">Live work records for your registered zone and block.</p></div>
            {works.length === 0 ? <Empty>No works have been listed for this block.</Empty> : <div className="grid gap-4 lg:grid-cols-2">{works.map((work) => {
              const risk = Math.max(0, Math.min(100, work.ml_delay_risk_score ?? 0));
              return <article key={work.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{work.department}</p><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{work.status}</span></div>
                <h3 className="mt-2 text-lg font-bold">{work.title}</h3><p className="mt-2 text-sm text-slate-600">{work.description}</p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><p className="text-slate-500">Starts<strong className="mt-1 block text-slate-900">{work.start_date}</strong></p><p className="text-slate-500">Estimated completion<strong className="mt-1 block text-slate-900">{work.estimated_completion}</strong></p></div>
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3"><div className="flex items-center justify-between gap-2"><span className="flex items-center gap-2 text-sm font-semibold text-amber-900"><Clock3 className="h-4 w-4" /> ML Delay Risk Score</span><strong className="text-lg text-amber-900">{risk}%</strong></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-amber-100"><div className="h-full rounded-full bg-amber-500" style={{ width: `${risk}%` }} /></div></div>
                {work.conflicts_detected && <p className="mt-3 text-sm text-slate-600"><strong>Detected conflicts:</strong> {work.conflicts_detected}</p>}
              </article>;
            })}</div>}
          </section>
          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.8fr)]">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-5"><h2 className="text-xl font-bold">Report an Issue</h2><p className="mt-1 text-sm text-slate-500">Your report will be visible to officials in your block.</p></div>
              <form onSubmit={handleReportSubmit} className="space-y-4">
                <label className="block space-y-1.5 text-sm font-medium text-slate-700">Issue type<select value={issueType} onChange={(event) => setIssueType(event.target.value)} className={inputClass}>{ISSUE_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
                <label className="block space-y-1.5 text-sm font-medium text-slate-700">Description<textarea required rows={4} maxLength={1000} value={description} onChange={(event) => setDescription(event.target.value)} className={inputClass} placeholder="Describe the issue and where you noticed it…" /></label>
                <label className="block space-y-1.5 text-sm font-medium text-slate-700">Photo URL (optional)<input type="url" value={photoUrl} onChange={(event) => setPhotoUrl(event.target.value)} className={inputClass} placeholder="https://…" /></label>
                <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">Submit Grievance <MessageSquare className="h-4 w-4" /></button>
              </form>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">Your recent reports</h2>
              <div className="mt-4 space-y-3">{myGrievances.length === 0 ? <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">You have not submitted any reports yet.</p> : myGrievances.map((item) => <article key={item.id} className="rounded-xl border border-gray-200 p-4"><div className="flex justify-between gap-3"><h3 className="font-semibold">{item.issue_type}</h3><span className="shrink-0 text-xs font-semibold text-blue-700">{item.status}</span></div><p className="mt-2 text-sm text-slate-600">{item.description}</p></article>)}</div>
            </div>
          </section>
        </>}
      </div>
      {isPasswordModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !modalLoading) setIsPasswordModalOpen(false); }}>
        <form onSubmit={confirmPassword} role="dialog" aria-modal="true" aria-labelledby="password-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
          <div className="flex items-start justify-between"><div><h2 id="password-title" className="text-lg font-bold">Confirm your password</h2><p className="mt-1 text-sm text-slate-500">Re-enter your password to submit this grievance.</p></div><button type="button" disabled={modalLoading} onClick={() => setIsPasswordModalOpen(false)} aria-label="Close" className="rounded p-1 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
          <input autoFocus required type="password" value={modalPassword} onChange={(event) => setModalPassword(event.target.value)} className={`${inputClass} mt-5`} placeholder="Password" />
          {modalError && <p role="alert" className="mt-2 text-sm font-medium text-red-600">{modalError}</p>}
          <button disabled={modalLoading} type="submit" className="mt-5 w-full rounded-lg bg-blue-700 px-4 py-2.5 font-semibold text-white disabled:opacity-60">{modalLoading ? "Verifying…" : "Confirm"}</button>
        </form>
      </div>}
    </main>
  );
}

const inputClass = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";
function Summary({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) { return <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><span className="rounded-xl bg-blue-50 p-3 text-blue-700">{icon}</span><div><p className="text-sm text-slate-500">{label}</p><p className="text-2xl font-bold">{value}</p></div></div>; }
function Empty({ children }: { children: React.ReactNode }) { return <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">{children}</div>; }
