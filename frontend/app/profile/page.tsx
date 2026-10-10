"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BriefcaseBusiness, Home, LogOut, Mail, MapPin, ShieldCheck, UserRound } from "lucide-react";

interface ProfileUser {
  id: number;
  email: string;
  role: "official" | "resident";
  full_name: string;
  age: number | null;
  profession_department: string | null;
  address_location: string | null;
  home_zone: string | null;
  created_at: string;
}

function initials(fullName: string): string {
  return fullName.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "SC";
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("sanchal_user");
    if (!storedUser) {
      router.replace("/auth");
      return;
    }
    try {
      const profile = JSON.parse(storedUser) as ProfileUser;
      startTransition(() => {
        setUser(profile);
        setLoaded(true);
      });
    } catch {
      localStorage.removeItem("sanchal_user");
      localStorage.removeItem("sanchal_token");
      router.replace("/auth");
      return;
    }
  }, [router]);

  function logOut() {
    localStorage.removeItem("sanchal_user");
    localStorage.removeItem("sanchal_token");
    router.replace("/auth");
  }

  if (!loaded || !user) return null;

  const isOfficial = user.role === "official";
  const dashboardHref = isOfficial ? "/dashboard" : "/resident-dashboard";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={() => router.push(dashboardHref)}
          className="mb-7 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-700"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </button>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-gradient-to-r from-blue-50 via-white to-teal-50 px-6 py-8 sm:px-9">
            <div className="flex flex-wrap items-center gap-5">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-blue-700 text-2xl font-bold text-white ring-4 ring-white shadow-sm">
                {initials(user.full_name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-xs font-bold uppercase tracking-wider text-blue-700">Sanchal account</p>
                <h1 className="break-words text-2xl font-bold sm:text-3xl">{user.full_name}</h1>
                <span className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${isOfficial ? "bg-teal-100 text-teal-800" : "bg-blue-100 text-blue-800"}`}>
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {isOfficial ? "Municipal Official" : "Resident"}
                </span>
              </div>
            </div>
          </div>

          <div className="px-6 py-7 sm:px-9">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-500">Profile details</h2>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <dt className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Mail className="h-4 w-4" /> Email</dt>
                <dd className="mt-2 break-all text-sm font-medium">{user.email}</dd>
              </div>
              {isOfficial ? (
                <>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <dt className="flex items-center gap-2 text-xs font-semibold text-slate-500"><BriefcaseBusiness className="h-4 w-4" /> Department / Office</dt>
                    <dd className="mt-2 text-sm font-medium">{user.profession_department || "Not provided"}</dd>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <dt className="flex items-center gap-2 text-xs font-semibold text-slate-500"><MapPin className="h-4 w-4" /> Office location</dt>
                    <dd className="mt-2 text-sm font-medium">{user.address_location || "Not provided"}</dd>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <dt className="flex items-center gap-2 text-xs font-semibold text-slate-500"><UserRound className="h-4 w-4" /> Age</dt>
                    <dd className="mt-2 text-sm font-medium">{user.age ?? "Not provided"}</dd>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <dt className="flex items-center gap-2 text-xs font-semibold text-slate-500"><Home className="h-4 w-4" /> Home zone</dt>
                    <dd className="mt-2 text-sm font-medium">{user.home_zone || "Not provided"}</dd>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
                    <dt className="flex items-center gap-2 text-xs font-semibold text-slate-500"><MapPin className="h-4 w-4" /> Address</dt>
                    <dd className="mt-2 text-sm font-medium">{user.address_location || "Not provided"}</dd>
                  </div>
                </>
              )}
            </dl>

            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() => router.push(dashboardHref)}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Back to Dashboard
              </button>
              <button
                type="button"
                onClick={logOut}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                <LogOut className="h-4 w-4" /> Log Out
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}