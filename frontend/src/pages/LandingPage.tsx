import React from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Zap,
  Shield,
  Layers,
  History,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { Button } from '../components/common/Button';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-brand-500 selection:text-white">
      {/* Top Navbar */}
      <nav className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 px-6 lg:px-12 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-cyan-400 flex items-center justify-center font-black text-white text-base shadow-lg shadow-brand-500/20">
            S
          </div>
          <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            SyncSpace
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
            Log In
          </Link>
          <Link to="/register">
            <Button size="sm">
              Get Started Free
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-6 lg:px-12 pt-20 pb-24 max-w-6xl mx-auto text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-400 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          Powered by Yjs CRDTs & Redis Pub/Sub
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-4xl mx-auto leading-[1.1]">
          The real-time workspace where teams create{' '}
          <span className="bg-gradient-to-r from-brand-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent">
            without conflicts.
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed">
          SyncSpace unites Notion-like fluid rich text with Figma-grade live multi-cursor collaboration. Mathematically proven conflict-free convergence for hyper-productive teams.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link to="/register" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto text-base px-8 py-3.5 shadow-xl shadow-brand-500/25">
              Start Collaborating Free
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <Link to="/login" className="w-full sm:w-auto">
            <Button size="lg" variant="secondary" className="w-full sm:w-auto text-base px-8 py-3.5">
              Explore Demo Accounts
            </Button>
          </Link>
        </div>

        {/* Live Visual Mock of CRDT Editing */}
        <div className="pt-12 max-w-4xl mx-auto">
          <div className="rounded-2xl border border-slate-700/80 bg-slate-800/60 p-4 shadow-2xl backdrop-blur-xl text-left">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-3 mb-4 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                <span className="ml-2 font-mono text-slate-400">syncspace://acme/product-spec</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 font-medium">3 Collaborators Live</span>
              </div>
            </div>

            <div className="p-6 bg-slate-900/90 rounded-xl space-y-4 border border-slate-800 font-sans relative overflow-hidden">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <span>🚀</span> 2026 Product Launch Specifications
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed relative">
                Our mission is to build seamless collaborative workflows. Documents synchronize instantly using state vectors and CRDT updates.
                {/* Alice's Caret */}
                <span className="inline-block relative">
                  <span className="border-l-2 border-brand-500 h-4 inline-block align-middle ml-0.5 animate-pulse" />
                  <span className="absolute -top-6 -left-2 bg-brand-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                    Alice
                  </span>
                </span>
              </p>

              <div className="p-3.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-slate-200 space-y-2">
                <div className="flex items-center justify-between font-semibold text-slate-300">
                  <span>Architecture Decisions</span>
                  {/* Bob's Caret */}
                  <span className="relative">
                    <span className="border-l-2 border-emerald-400 h-4 inline-block align-middle animate-pulse" />
                    <span className="absolute -top-5 right-0 bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap">
                      Bob (typing...)
                    </span>
                  </span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  PostgreSQL durable byte storage ensures zero data loss upon disconnects, while Redis Pub/Sub distributes changes across cluster instances.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="px-6 lg:px-12 py-20 bg-slate-950/60 border-t border-slate-800">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Built for speed, scale and zero lost edits
            </h2>
            <p className="text-slate-400 text-sm sm:text-base">
              Engineered with modern distributed protocols so you never have to worry about merge conflicts or overwrites.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Yjs CRDT Synchronization</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Conflict-Free Replicated Data Types mathematically converge updates from multiple users regardless of network order or latency.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Live Carets & Awareness</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                See teammate names, assigned cursor colors, selections and typing indicators updated in sub-50ms over WebSocket channels.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Redis Pub/Sub Scaling</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Horizontal multi-instance architecture relays document updates seamlessly across multiple backend pods without broadcast loops.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <History className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Generation-Safe Version Restore</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Milestone snapshots and monotonic generation bumping guarantee clean history restore without corrupting CRDT update graphs.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Threaded Comments & Resolve</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Collaborate asynchronously with inline threaded discussions, resolutions, and instant notifications right on the canvas.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white">Enterprise Role Enforcement</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Owner, Admin, Editor, Commenter, and Viewer roles enforced rigorously on both REST APIs and real-time WebSocket binary packets.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800 py-8 px-6 lg:px-12 text-center text-xs text-slate-500 space-y-2">
        <p>SyncSpace — FS-02 Real-Time Collaborative Document Workspace</p>
        <p>Nexvia Technologies Full-Stack Development Internship</p>
      </footer>
    </div>
  );
};
