'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SubmissionDTO, formatINR } from '@/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import {
  Send,
  ExternalLink,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Zap,
} from 'lucide-react';

export default function CreatorSubmissionsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [submissions, setSubmissions] = useState<SubmissionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View Simulator Modal State
  const [simulatingSub, setSimulatingSub] = useState<SubmissionDTO | null>(null);
  const [simulatedViews, setSimulatedViews] = useState<number>(0);
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<{
    allocatedPaise: number;
    newTotalViews: number;
    message: string;
  } | null>(null);
  const [simError, setSimError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'creator')) {
      router.push('/login');
      return;
    }

    if (user?.role === 'creator') {
      fetchSubmissions();
    }
  }, [user, authLoading, router]);

  async function fetchSubmissions() {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getMySubmissions();
      if (res.data) {
        setSubmissions(res.data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch submissions');
    } finally {
      setLoading(false);
    }
  }

  const handleOpenSimulate = (sub: SubmissionDTO) => {
    setSimulatingSub(sub);
    setSimulatedViews(sub.views + 10000);
    setSimResult(null);
    setSimError(null);
  };

  const handleRunSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simulatingSub) return;

    try {
      setSimulating(true);
      setSimError(null);
      setSimResult(null);

      const res = await api.updateViews(simulatingSub.id, Number(simulatedViews));
      if (res.data) {
        setSimResult({
          allocatedPaise: res.data.payoutAllocatedPaise,
          newTotalViews: res.data.views,
          message: res.message || 'Views updated and payout processed atomically.',
        });
        await fetchSubmissions();
      }
    } catch (err: unknown) {
      setSimError(err instanceof Error ? err.message : 'Failed to process view update');
    } finally {
      setSimulating(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Your Submissions</h1>
          <p className="text-sm text-slate-500">
            Track performance metrics, view growth, and simulated milestone payouts
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchSubmissions}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>
          <a href="/dashboard/creator/campaigns">
            <Button variant="primary" size="sm">
              <Send className="w-3.5 h-3.5 mr-1.5" />
              New Submission
            </Button>
          </a>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Submissions List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Active Campaign Posts</h2>
            <p className="text-xs text-slate-500">Live view updates automatically adjust eligible milestones</p>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {submissions.length} submission{submissions.length === 1 ? '' : 's'}
          </span>
        </div>

        {submissions.length === 0 ? (
          <div className="text-center py-16 px-4 space-y-3">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center mx-auto">
              <Send className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">No submissions yet</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              You haven&apos;t submitted any posts yet. Browse active campaigns to start earning.
            </p>
            <a href="/dashboard/creator/campaigns" className="inline-block mt-2">
              <Button variant="primary" size="sm">
                Browse Active Campaigns
              </Button>
            </a>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                  <th className="py-3.5 px-6">Campaign</th>
                  <th className="py-3.5 px-6">Post URL</th>
                  <th className="py-3.5 px-6">Current Views</th>
                  <th className="py-3.5 px-6">Earned / Eligible</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Security</th>
                  <th className="py-3.5 px-6 text-right">Simulation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {submissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 font-semibold text-slate-900">
                      {sub.campaignName || 'Campaign'}
                    </td>
                    <td className="py-4 px-6">
                      <a
                        href={sub.postUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:underline max-w-[180px] truncate"
                      >
                        <span className="truncate">{sub.postUrl}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </td>
                    <td className="py-4 px-6 font-mono font-semibold text-slate-900">
                      {sub.views.toLocaleString('en-IN')}
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-semibold text-emerald-600">
                        {formatINR(sub.paidAmountPaise)}
                      </div>
                      {sub.eligiblePayoutPaise > sub.paidAmountPaise && (
                        <div className="text-xs text-orange-600 font-medium">
                          Eligible: {formatINR(sub.eligiblePayoutPaise)}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <Badge variant={sub.status}>{sub.status}</Badge>
                    </td>
                    <td className="py-4 px-6">
                      {sub.spikeDetected ? (
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Spike Flagged
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Normal</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenSimulate(sub)}
                        className="text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 border border-indigo-100"
                      >
                        <Zap className="w-3.5 h-3.5 mr-1" />
                        Simulate Views
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Update Simulation Modal */}
      {simulatingSub && (
        <Modal
          isOpen={!!simulatingSub}
          onClose={() => setSimulatingSub(null)}
          title="Simulate Platform View Update"
          description={`Update views for post in ${simulatingSub.campaignName || 'Campaign'}. This invokes the atomic payout transaction engine.`}
        >
          {simError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{simError}</span>
            </div>
          )}

          {simResult && (
            <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4" />
                <span>Simulation Processed Successfully</span>
              </div>
              <p>{simResult.message}</p>
              <div className="pt-1 flex items-center justify-between font-semibold">
                <span>Incremental Payout Disbursed:</span>
                <span className="text-emerald-700">{formatINR(simResult.allocatedPaise)}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleRunSimulation} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1 text-slate-600">
              <div className="flex justify-between">
                <span>Currently Stored Views:</span>
                <span className="font-mono font-semibold text-slate-900">
                  {simulatingSub.views.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total Paid so far:</span>
                <span className="font-mono font-semibold text-emerald-600">
                  {formatINR(simulatingSub.paidAmountPaise)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                New View Count to Simulate
              </label>
              <input
                type="number"
                min="0"
                required
                value={simulatedViews}
                onChange={(e) => setSimulatedViews(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Try setting higher than milestones (e.g. 10,000, 50,000, or a 500,000+ spike) to test transactional responses.
              </span>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-[11px] text-slate-400">Quick add:</span>
              <button
                type="button"
                onClick={() => setSimulatedViews(simulatingSub.views + 10000)}
                className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded font-medium text-slate-700"
              >
                +10k
              </button>
              <button
                type="button"
                onClick={() => setSimulatedViews(simulatingSub.views + 50000)}
                className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded font-medium text-slate-700"
              >
                +50k
              </button>
              <button
                type="button"
                onClick={() => setSimulatedViews(simulatingSub.views + 600000)}
                className="px-2 py-1 text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 rounded font-medium"
              >
                +600k (Test Spike)
              </button>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSimulatingSub(null)}
              >
                Close
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={simulating}>
                <Zap className="w-3.5 h-3.5 mr-1" />
                Dispatch View Update
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
