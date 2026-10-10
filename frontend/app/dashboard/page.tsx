"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Clock3, HardHat, Loader2, LogOut, MapPin, ShieldCheck, X } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
type WorkStatus = "Pending" | "Ongoing" | "Completed";
interface Work {
  id: number; title: string; description: string; department: string; contractor_id: number;
  zone: string; block: string; start_date: string; estimated_completion: string;
  status: WorkStatus; cost: number; conflicts_detected: string | null; ml_delay_risk_score: number | null;
}
interface Grievance {
  id: number; resident_id: number; zone: string; block: string; issue_type: string;
  description: string; photo_url: string | null; status: string;
}
interface StoredUser { id: number; email: string; full_name: string; role: string; zone: string; block: string; }

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState("");
  const [startDate, setStartDate] = useState("");
  const [completion, setCompletion] = useState("");
  const [cost, setCost] = useState("");
  const [conflictsDetected, setConflictsDetected] = useState("");
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
    if (!worksResponse.ok || !grievancesResponse.ok) throw new Error("Could not load your zone data. Please sign in again.");
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
      if (parsed.role !== "official") { router.replace("/resident-dashboard"); return; }
      setUser(parsed);
    } catch { router.replace("/auth"); return; }
    void loadData(token).catch((cause: unknown) => {
      if (alive) setError(cause instanceof Error ? cause.message : "Could not load dashboard data.");
    }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [loadData, router]);

  function tokenOrThrow(): string {
    const token = localStorage.getItem("sanchal_token");
    if (!token) throw new Error("Your session has expired. Please sign in again.");
    return token;
  }

  function openPasswordModal(action: () => Promise<void>) {
    setModalActionCallback(() => action);
    setModalPassword("");
    setModalError("");
    setIsPasswordModalOpen(true);
  }

  function workPayload(status: WorkStatus = "Pending") {
    return {
      title: title.trim(), description: description.trim(), department: department.trim(),
      start_date: startDate, estimated_completion: completion, status, cost: Number(cost),
      conflicts_detected: conflictsDetected.trim() || null,
    };
  }

  function handleCreateWork(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    openPasswordModal(async () => {
      const response = await fetch(`${API_BASE_URL}/api/works`, {
        method: "POST", headers: { Authorization: `Bearer ${tokenOrThrow()}`, "Content-Type": "application/json" },
        body: JSON.stringify(workPayload()),
      });
      const result = await response.json() as { detail?: string };
      if (!response.ok) throw new Error(result.detail ?? "Could not submit work.");
      setTitle(""); setDescription(""); setDepartment(""); setStartDate(""); setCompletion(""); setCost(""); setConflictsDetected("");
      await loadData(tokenOrThrow());
    });
  }

  function handleStatusUpdate(work: Work, nextStatus: WorkStatus) {
    setError("");
    openPasswordModal(async () => {
      const response = await fetch(`${API_BASE_URL}/api/works/${work.id}`, {
        method: "PUT", headers: { Authorization: `Bearer ${tokenOrThrow()}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          title: work.title, description: work.description, department: work.department,
          start_date: work.start_date, estimated_completion: work.estimated_completion,
          status: nextStatus, cost: work.cost, conflicts_detected: work.conflicts_detected,
        }),
      });
      const result = await response.json() as { detail?: string };
      if (!response.ok) throw new Error(result.detail ?? "Could not update work status.");
      await loadData(tokenOrThrow());
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

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div><p className="flex items-center gap-2 text-sm font-semibold text-teal-700"><ShieldCheck className="h-4 w-4" /> Official workspace</p>
            <h1 className="mt-2 text-2xl font-bold">{user ? `Welcome, ${user.full_name}` : "Sanchal dashboard"}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500"><MapPin className="h-4 w-4" />{user?.zone} · {user?.block}</p>
          </div>
          <button onClick={logout} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold hover:bg-gray-50"><LogOut className="h-4 w-4" /> Log out</button>
        </header>

        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {loading ? <div className="flex items-center gap-2 py-12 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Loading zone data…</div> : <>
          <section className="grid gap-4 sm:grid-cols-3">
            <Summary label="Works in your block" value={works.length} icon={<HardHat className="h-5 w-5" />} />
            <Summary label="Open grievances" value={grievances.filter((item) => item.status !== "Resolved").length} icon={<AlertCircle className="h-5 w-5" />} />
            <Summary label="Completed works" value={works.filter((item) => item.status === "Completed").length} icon={<CheckCircle2 className="h-5 w-5" />} />
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">Submit New Work</h2>
            <p className="mt-1 text-sm text-slate-500">New work is assigned to your registered zone and block.</p>
            <form onSubmit={handleCreateWork} className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Work title"><input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} /></Field>
              <Field label="Department"><input required value={department} onChange={(e) => setDepartment(e.target.value)} className={inputClass} /></Field>
              <Field label="Start date"><input required type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} /></Field>
              <Field label="Estimated completion"><input required type="date" value={completion} onChange={(e) => setCompletion(e.target.value)} className={inputClass} /></Field>
              <Field label="Estimated cost (₹)"><input required min="0" type="number" value={cost} onChange={(e) => setCost(e.target.value)} className={inputClass} /></Field>
              <Field label="Detected conflicts (optional)"><input value={conflictsDetected} onChange={(e) => setConflictsDetected(e.target.value)} className={inputClass} /></Field>
              <Field label="Description"><textarea required rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} /></Field>
              <div className="flex items-end"><button type="submit" className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800">Submit New Work</button></div>
            </form>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold">Works in your zone and block</h2>
            {works.length === 0 ? <Empty>No works have been submitted for this block.</Empty> : <div className="grid gap-4 lg:grid-cols-2">
              {works.map((work) => <article key={work.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-semibold uppercase tracking-wide text-teal-700">{work.department}</p><h3 className="mt-1 text-lg font-bold">{work.title}</h3></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{work.status}</span></div>
                <p className="mt-3 text-sm text-slate-600">{work.description}</p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600"><p>Starts <strong className="block text-slate-900">{work.start_date}</strong></p><p>Est. completion <strong className="block text-slate-900">{work.estimated_completion}</strong></p><p>Cost <strong className="block text-slate-900">₹{work.cost.toLocaleString("en-IN")}</strong></p></div>
                <div className="mt-4 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-3"><span className="flex items-center gap-2 text-sm font-semibold text-amber-900"><Clock3 className="h-4 w-4" /> ML delay risk</span><strong className="text-lg text-amber-900">{work.ml_delay_risk_score ?? 0}%</strong></div>
                <div className="mt-4 flex flex-wrap gap-2">{(["Pending", "Ongoing", "Completed"] as WorkStatus[]).filter((item) => item !== work.status).map((next) => <button key={next} type="button" onClick={() => handleStatusUpdate(work, next)} className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold hover:border-teal-600 hover:text-teal-700">Update status to {next}</button>)}</div>
              </article>)}
            </div>}
          </section>

          <section className="space-y-4"><h2 className="text-xl font-bold">Grievances in your zone and block</h2>
            {grievances.length === 0 ? <Empty>No grievances have been reported for this block.</Empty> : <div className="grid gap-4 lg:grid-cols-2">{grievances.map((item) => <article key={item.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><div className="flex justify-between gap-3"><h3 className="font-bold">{item.issue_type}</h3><span className="text-xs font-semibold text-blue-700">{item.status}</span></div><p className="mt-2 text-sm text-slate-600">{item.description}</p></article>)}</div>}
          </section>
        </>}
      </div>
      {isPasswordModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !modalLoading) setIsPasswordModalOpen(false); }}>
        <form onSubmit={confirmPassword} role="dialog" aria-modal="true" aria-labelledby="password-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
          <div className="flex items-start justify-between"><div><h2 id="password-title" className="text-lg font-bold">Confirm your password</h2><p className="mt-1 text-sm text-slate-500">Re-enter your password to continue.</p></div><button type="button" disabled={modalLoading} onClick={() => setIsPasswordModalOpen(false)} aria-label="Close" className="rounded p-1 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
          <input autoFocus required type="password" value={modalPassword} onChange={(event) => setModalPassword(event.target.value)} className={`${inputClass} mt-5`} placeholder="Password" />
          {modalError && <p role="alert" className="mt-2 text-sm font-medium text-red-600">{modalError}</p>}
          <button disabled={modalLoading} type="submit" className="mt-5 w-full rounded-lg bg-teal-700 px-4 py-2.5 font-semibold text-white disabled:opacity-60">{modalLoading ? "Verifying…" : "Confirm"}</button>
        </form>
      </div>}
    </main>
  );
}

const inputClass = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block space-y-1.5 text-sm font-medium text-slate-700">{label}{children}</label>; }
function Summary({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) { return <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><span className="rounded-xl bg-teal-50 p-3 text-teal-700">{icon}</span><div><p className="text-sm text-slate-500">{label}</p><p className="text-2xl font-bold">{value}</p></div></div>; }
function Empty({ children }: { children: React.ReactNode }) { return <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">{children}</div>; }
