import Link from "next/link";
import { ShieldCheck, AlertTriangle, Activity } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 selection:bg-blue-500/30">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
        <div className="flex justify-center mb-6">
          <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-2xl">
            <Activity className="w-10 h-10 text-blue-400" />
          </div>
        </div>
        
        <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight bg-gradient-to-br from-white to-zinc-500 text-transparent bg-clip-text">
          SANCHAL
        </h1>
        
        <p className="text-xl md:text-2xl text-zinc-400 font-light max-w-2xl mx-auto leading-relaxed">
          AI-powered municipal platform to coordinate road works, predict delays, and resolve spatial conflicts.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
          <Link 
            href="/dashboard" 
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-semibold transition-all shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)]"
          >
            <ShieldCheck className="w-5 h-5" />
            Enter Officer Portal
          </Link>
          
          <button className="flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 px-8 py-4 rounded-xl font-semibold transition-all">
            <AlertTriangle className="w-5 h-5" />
            Citizen Grievance
          </button>
        </div>
      </div>
    </main>
  );
}