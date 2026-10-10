"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Users,
  Mail,
  Lock,
  User,
  MapPin,
  Briefcase,
  Home,
  Eye,
  EyeOff,
  ChevronRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
type Role = "official" | "resident";
type Mode = "login" | "signup";

interface AuthUser {
  id: number;
  email: string;
  role: Role;
  full_name: string;
  age: number | null;
  profession_department: string | null;
  address_location: string | null;
  home_zone: string | null;
  created_at: string;
}

interface AuthResponse {
  token: string;
  user: AuthUser;
}

interface SignupOfficialData {
  fullName: string;
  age: string;
  profession: string;
  officeAddress: string;
  email: string;
  password: string;
}

interface SignupResidentData {
  fullName: string;
  homeAddress: string;
  homeZone: string;
  email: string;
  password: string;
}

// ─────────────────────────────────────────────
// ROLE SELECTOR COMPONENT
// ─────────────────────────────────────────────
function RoleSelector({
  selected,
  onSelect,
}: {
  selected: Role | null;
  onSelect: (r: Role) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={() => onSelect("official")}
        className={`relative flex flex-col items-center gap-2.5 p-4 rounded-2xl border-2 transition-all duration-200 ${
          selected === "official"
            ? "border-teal-600 bg-teal-600 shadow-lg shadow-teal-200"
            : "border-gray-300 bg-white hover:border-teal-400 hover:bg-teal-50"
        }`}
      >
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-200 ${
            selected === "official"
              ? "bg-white/20 text-white"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div className="text-center">
          <p
            className={`font-semibold text-sm transition-colors duration-200 ${
              selected === "official" ? "text-white" : "text-gray-700"
            }`}
          >
            Municipal Official
          </p>
          <p className={`text-xs mt-0.5 transition-colors duration-200 ${
            selected === "official" ? "text-teal-100" : "text-gray-400"
          }`}>Manage &amp; coordinate</p>
        </div>
        {selected === "official" && (
          <CheckCircle2 className="absolute top-2 right-2 w-4 h-4 text-white" />
        )}
      </button>

      <button
        type="button"
        onClick={() => onSelect("resident")}
        className={`relative flex flex-col items-center gap-2.5 p-4 rounded-2xl border-2 transition-all duration-200 ${
          selected === "resident"
            ? "border-blue-600 bg-blue-600 shadow-lg shadow-blue-200"
            : "border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50"
        }`}
      >
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-200 ${
            selected === "resident"
              ? "bg-white/20 text-white"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          <Users className="w-6 h-6" />
        </div>
        <div className="text-center">
          <p
            className={`font-semibold text-sm transition-colors duration-200 ${
              selected === "resident" ? "text-white" : "text-gray-700"
            }`}
          >
            Resident
          </p>
          <p className={`text-xs mt-0.5 transition-colors duration-200 ${
            selected === "resident" ? "text-blue-100" : "text-gray-400"
          }`}>Track &amp; report</p>
        </div>
        {selected === "resident" && (
          <CheckCircle2 className="absolute top-2 right-2 w-4 h-4 text-white" />
        )}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// INPUT COMPONENT
// ─────────────────────────────────────────────
function Input({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  icon,
  suffix,
}: {
  label: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  icon: React.ReactNode;
  suffix?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="relative flex items-center">
        <span className="absolute left-3.5 text-slate-400">{icon}</span>
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-slate-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm"
        />
        {suffix && (
          <span className="absolute right-3.5 text-slate-400">{suffix}</span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// LOGIN FORM
// ─────────────────────────────────────────────
function LoginForm({ role }: { role: Role }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json() as AuthResponse & { detail?: string };
      if (!response.ok) throw new Error(data.detail ?? "Unable to log in. Please try again.");
      if (data.user.role !== role) {
        throw new Error(`This account is registered as a ${data.user.role}, not a ${role}.`);
      }
      localStorage.setItem("sanchal_user", JSON.stringify(data.user));
      localStorage.setItem("sanchal_token", data.token);
      router.push(data.user.role === "official" ? "/dashboard" : "/resident-dashboard");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to log in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const accent = role === "official" ? "teal" : "blue";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Email Address"
        type="email"
        placeholder={role === "official" ? "official@sanchal.com" : "resident@sanchal.com"}
        value={email}
        onChange={setEmail}
        icon={<Mail className="w-4 h-4" />}
      />
      <Input
        label="Password"
        type={showPassword ? "text" : "password"}
        placeholder="Enter your password"
        value={password}
        onChange={setPassword}
        icon={<Lock className="w-4 h-4" />}
        suffix={
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        }
      />

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className={`w-full flex items-center justify-center gap-2 font-semibold py-3.5 rounded-xl transition-all duration-200 text-white shadow-md ${
          accent === "teal"
            ? "bg-teal-600 hover:bg-teal-700 hover:shadow-lg hover:-translate-y-0.5 disabled:bg-teal-300 disabled:shadow-none disabled:translate-y-0"
            : "bg-blue-600 hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 disabled:bg-blue-300 disabled:shadow-none disabled:translate-y-0"
        }`}
      >
        {loading ? (
          <span className="animate-pulse">Authenticating...</span>
        ) : (
          <>
            Login
            <ChevronRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
}

// ─────────────────────────────────────────────
// SIGNUP FORM
// ─────────────────────────────────────────────
function SignupForm({ role }: { role: Role }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // Official fields
  const [official, setOfficial] = useState<SignupOfficialData>({
    fullName: "",
    age: "",
    profession: "",
    officeAddress: "",
    email: "",
    password: "",
  });

  // Resident fields
  const [resident, setResident] = useState<SignupResidentData>({
    fullName: "",
    homeAddress: "",
    homeZone: "",
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const signupData = role === "official"
      ? {
          role,
          full_name: official.fullName,
          age: official.age ? Number(official.age) : null,
          profession_department: official.profession,
          address_location: official.officeAddress,
          email: official.email,
          password: official.password,
        }
      : {
          role,
          full_name: resident.fullName,
          home_zone: resident.homeZone,
          address_location: resident.homeAddress,
          email: resident.email,
          password: resident.password,
        };

    try {
      const response = await fetch(`${API_BASE_URL}/api/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signupData),
      });
      const data = await response.json() as AuthResponse & { detail?: string };
      if (!response.ok) {
        const detail = Array.isArray(data.detail)
          ? data.detail.map((item: { msg?: string }) => item.msg).filter(Boolean).join(" ")
          : data.detail;
        throw new Error(detail ?? "Unable to create your account. Please try again.");
      }
      localStorage.setItem("sanchal_user", JSON.stringify(data.user));
      localStorage.setItem("sanchal_token", data.token);
      setSuccess(true);
      window.setTimeout(() => {
        router.push(data.user.role === "official" ? "/dashboard" : "/resident-dashboard");
      }, 900);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create your account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const accent = role === "official" ? "teal" : "blue";

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${accent === "teal" ? "bg-teal-100" : "bg-blue-100"}`}>
          <CheckCircle2 className={`w-8 h-8 ${accent === "teal" ? "text-teal-500" : "text-blue-500"}`} />
        </div>
        <div>
          <p className="font-bold text-slate-800 text-lg">Account Created!</p>
          <p className="text-slate-500 text-sm mt-1">Redirecting to your portal...</p>
        </div>
      </div>
    );
  }

  const pwdSuffix = (
    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="text-slate-400 hover:text-slate-600 transition-colors"
    >
      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </button>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      {role === "official" ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Full Name"
              placeholder="Rajesh Kumar"
              value={official.fullName}
              onChange={(v) => setOfficial({ ...official, fullName: v })}
              icon={<User className="w-4 h-4" />}
            />
            <Input
              label="Age"
              type="number"
              placeholder="35"
              value={official.age}
              onChange={(v) => setOfficial({ ...official, age: v })}
              icon={<User className="w-4 h-4" />}
            />
          </div>
          <Input
            label="Profession / Department"
            placeholder="PWD Engineer, Water Dept..."
            value={official.profession}
            onChange={(v) => setOfficial({ ...official, profession: v })}
            icon={<Briefcase className="w-4 h-4" />}
          />
          <Input
            label="Office Address / Location"
            placeholder="Municipal Corporation, Block B..."
            value={official.officeAddress}
            onChange={(v) => setOfficial({ ...official, officeAddress: v })}
            icon={<MapPin className="w-4 h-4" />}
          />
          <Input
            label="Official Email"
            type="email"
            placeholder="you@municipality.gov.in"
            value={official.email}
            onChange={(v) => setOfficial({ ...official, email: v })}
            icon={<Mail className="w-4 h-4" />}
          />
          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            placeholder="Create a strong password"
            value={official.password}
            onChange={(v) => setOfficial({ ...official, password: v })}
            icon={<Lock className="w-4 h-4" />}
            suffix={pwdSuffix}
          />
        </>
      ) : (
        <>
          <Input
            label="Full Name"
            placeholder="Priya Sharma"
            value={resident.fullName}
            onChange={(v) => setResident({ ...resident, fullName: v })}
            icon={<User className="w-4 h-4" />}
          />
          <Input
            label="Home Address / Zone"
            placeholder="Ward 12, Sector 4, Nagpur..."
            value={resident.homeAddress}
            onChange={(v) => setResident({ ...resident, homeAddress: v })}
            icon={<Home className="w-4 h-4" />}
          />
          <Input
            label="Home Zone"
            placeholder="Zone 9"
            value={resident.homeZone}
            onChange={(v) => setResident({ ...resident, homeZone: v })}
            icon={<MapPin className="w-4 h-4" />}
          />
          <Input
            label="Email Address"
            type="email"
            placeholder="you@gmail.com"
            value={resident.email}
            onChange={(v) => setResident({ ...resident, email: v })}
            icon={<Mail className="w-4 h-4" />}
          />
          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            placeholder="Create a strong password"
            value={resident.password}
            onChange={(v) => setResident({ ...resident, password: v })}
            icon={<Lock className="w-4 h-4" />}
            suffix={pwdSuffix}
          />
        </>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className={`w-full flex items-center justify-center gap-2 font-semibold py-3.5 rounded-xl transition-all duration-200 text-white shadow-md mt-2 ${
          accent === "teal"
            ? "bg-teal-600 hover:bg-teal-700 hover:shadow-lg hover:-translate-y-0.5 disabled:bg-teal-300 disabled:shadow-none disabled:translate-y-0"
            : "bg-blue-600 hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 disabled:bg-blue-300 disabled:shadow-none disabled:translate-y-0"
        }`}
      >
        {loading ? (
          <span className="animate-pulse">Creating Account...</span>
        ) : (
          <>
            Create Account
            <ChevronRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
}

// ─────────────────────────────────────────────
// MAIN AUTH PAGE
// ─────────────────────────────────────────────
export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [role, setRole] = useState<Role | null>(null);

  const accentColor =
    role === "official"
      ? "from-teal-600 to-teal-800"
      : role === "resident"
      ? "from-blue-600 to-indigo-800"
      : "from-slate-700 to-slate-900";

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col items-center justify-center p-4">
      {/* Background decorations */}
      <div className="fixed top-0 left-0 w-96 h-96 bg-teal-400/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-96 h-96 bg-blue-400/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Back to home */}
      <div className="w-full max-w-md mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
        {/* Gradient Header */}
        <div className={`bg-gradient-to-br ${accentColor} px-8 py-6 flex flex-col items-center gap-3 transition-all duration-500`}>
          <span className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-[#3d1f00]">
            <Image
              src="/sanchal-logo.png"
              alt="Sanchal Logo"
              fill
              priority
              sizes="112px"
              className="object-contain"
            />
          </span>
          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Sanchal</h1>
            <p className="text-white/60 text-xs mt-0.5 uppercase tracking-widest font-medium">
              Smart Civic Coordination
            </p>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="px-6 pt-5 pb-0">
          <div className="flex bg-gray-100 border border-gray-200 rounded-xl p-1 gap-1">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                mode === "login"
                  ? "bg-teal-600 text-white shadow-md"
                  : "text-gray-500 hover:text-gray-800 hover:bg-white border border-transparent hover:border-gray-200"
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                mode === "signup"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-gray-500 hover:text-gray-800 hover:bg-white border border-transparent hover:border-gray-200"
              }`}
            >
              Sign Up
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Role Label */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2.5">
              Select your portal
            </p>
            <RoleSelector selected={role} onSelect={setRole} />
          </div>

          {/* Form — only shown once role is selected */}
          {role ? (
            <div className="pt-1">
              <div className="border-t border-gray-200 mb-4" />
              {mode === "login" ? (
                <LoginForm key={`login-${role}`} role={role} />
              ) : (
                <SignupForm key={`signup-${role}`} role={role} />
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400 text-sm">
              <p>← Select a portal above to continue</p>
            </div>
          )}
        </div>

        {/* Footer note */}
        <div className="px-6 pb-5 text-center">
          <p className="text-xs text-slate-400">
            By continuing, you agree to Sanchal&apos;s{" "}
            <span className="underline cursor-pointer hover:text-slate-600">Terms of Service</span>
          </p>
        </div>
      </div>
    </main>
  );
}
