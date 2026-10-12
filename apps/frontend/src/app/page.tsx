import { Sparkles, ShieldCheck, Zap, Coins, TrendingUp, CheckCircle, ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="space-y-20 py-8">
      {/* Hero Section */}
      <section className="text-center max-w-4xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Atomic Budget Protection • Integer Paise Precision</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
          Automated View-Based Payouts for{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
            Creator Campaigns
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
          Brands set fixed campaign budgets and milestone ladders. Creators submit Instagram reels and YouTube shorts, watch their views grow, and receive guaranteed, race-condition-free payouts.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <a
            href="/signup?role=creator"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
          >
            Join as a Creator
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="/signup?role=brand"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white border border-slate-300 text-slate-800 font-semibold shadow-xs hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
          >
            Launch Campaign as Brand
          </a>
        </div>
      </section>

      {/* Feature Pillars */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-indigo-200 transition-all space-y-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Coins className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Highest Milestone Payout</h3>
          <p className="text-sm text-slate-600">
            Creators earn the payout of the highest milestone reached, never an arbitrary accumulation or unverified sum.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-indigo-200 transition-all space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Zero Budget Overspend</h3>
          <p className="text-sm text-slate-600">
            Transactions are ACID-isolated on MongoDB. Campaigns mathematically never pay out a single paise beyond their total budget.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-indigo-200 transition-all space-y-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Idempotent Payout Ledger</h3>
          <p className="text-sm text-slate-600">
            Repeated views or erratic webhook retries will never double-pay. An immutable ledger records every transaction.
          </p>
        </div>
      </section>

      {/* Workflow Explainer */}
      <section className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-sm space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">How The Payout Ladder Works</h2>
          <p className="text-sm text-slate-600">
            Transparent milestones designed for performance-driven creator partnerships.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="border border-slate-200 rounded-xl p-5 bg-slate-50 space-y-2">
            <span className="text-xs font-semibold text-indigo-600">Step 1</span>
            <h4 className="font-semibold text-slate-900">Brand Configures Ladder</h4>
            <p className="text-xs text-slate-600">
              E.g. 10k views = ₹500, 50k views = ₹2,000, 100k views = ₹5,000 with a ₹50,000 budget cap.
            </p>
          </div>

          <div className="border border-slate-200 rounded-xl p-5 bg-slate-50 space-y-2">
            <span className="text-xs font-semibold text-indigo-600">Step 2</span>
            <h4 className="font-semibold text-slate-900">Creator Submits Post</h4>
            <p className="text-xs text-slate-600">
              Validated Instagram Reel or YouTube Shorts URL tied uniquely to the creator profile.
            </p>
          </div>

          <div className="border border-slate-200 rounded-xl p-5 bg-slate-50 space-y-2">
            <span className="text-xs font-semibold text-indigo-600">Step 3</span>
            <h4 className="font-semibold text-slate-900">Real-Time View Tracking</h4>
            <p className="text-xs text-slate-600">
              Simulated or synchronized platform views track progress toward upcoming milestone tiers.
            </p>
          </div>

          <div className="border border-slate-200 rounded-xl p-5 bg-slate-50 space-y-2">
            <span className="text-xs font-semibold text-indigo-600">Step 4</span>
            <h4 className="font-semibold text-slate-900">Instant Ledger Settlement</h4>
            <p className="text-xs text-slate-600">
              Highest milestone tier is computed and paid atomically. Funds are recorded in immutable ledger entries.
            </p>
          </div>
        </div>
      </section>

      {/* Example Table */}
      <section className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 space-y-6">
        <div className="max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-300 text-xs font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            Example Payout Mechanics
          </div>
          <h3 className="text-2xl font-bold">Predictable, Mathematical Fairness</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                <th className="py-3 px-4">Views Reached</th>
                <th className="py-3 px-4">Milestone Ladder</th>
                <th className="py-3 px-4">Eligible Payout</th>
                <th className="py-3 px-4">Calculation Rationale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              <tr>
                <td className="py-3 px-4 font-mono">5,000 views</td>
                <td className="py-3 px-4">Below 10k threshold</td>
                <td className="py-3 px-4 font-bold text-white">₹0</td>
                <td className="py-3 px-4 text-xs text-slate-400">Has not reached lowest tier</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-mono">10,000 views</td>
                <td className="py-3 px-4">10,000 views → ₹500</td>
                <td className="py-3 px-4 font-bold text-emerald-400">₹500</td>
                <td className="py-3 px-4 text-xs text-slate-400">First milestone reached</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-mono">60,000 views</td>
                <td className="py-3 px-4">50,000 views → ₹2,000</td>
                <td className="py-3 px-4 font-bold text-emerald-400">₹2,000</td>
                <td className="py-3 px-4 text-xs text-slate-400">Tier 2 reached (paid difference ₹1,500)</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-mono">150,000 views</td>
                <td className="py-3 px-4">100,000 views → ₹5,000</td>
                <td className="py-3 px-4 font-bold text-emerald-400">₹5,000</td>
                <td className="py-3 px-4 text-xs text-slate-400">Top tier reached (NOT sum ₹500+₹2k+₹5k)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
