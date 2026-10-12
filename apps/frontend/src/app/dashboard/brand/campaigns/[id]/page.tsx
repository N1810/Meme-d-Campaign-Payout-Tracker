'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { CampaignDTO, SubmissionDTO, formatINR, CampaignStatus } from '@/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  ArrowLeft,
  ExternalLink,
  AlertTriangle,
  Wallet,
  Play,
  Pause,
  CheckCircle,
  AlertCircle,
  Instagram,
  Youtube,
} from 'lucide-react';

export default function BrandCampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const campaignId = resolvedParams.id;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [campaign, setCampaign] = useState<CampaignDTO | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'brand')) {
      router.push('/login');
      return;
    }

    if (user?.role === 'brand') {
      loadData();
    }
  }, [user, authLoading, campaignId, router]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const [campRes, subsRes] = await Promise.all([
        api.getCampaignById(campaignId),
        api.getCampaignSubmissions(campaignId),
      ]);

      if (campRes.data) setCampaign(campRes.data);
      if (subsRes.data) setSubmissions(subsRes.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load campaign');
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(newStatus: CampaignStatus) {
    try {
      setStatusUpdating(true);
      await api.updateCampaignStatus(campaignId, newStatus);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update campaign status');
    } finally {
      setStatusUpdating(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Campaign not found</p>
      </div>
    );
  }

  const spentPct = campaign.totalBudgetPaise > 0
    ? Math.min(100, Math.round((campaign.spentBudgetPaise / campaign.totalBudgetPaise) * 100))
    : 0;

  return (
    <div className="space-y-8">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <a
            href="/dashboard/brand"
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </a>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{campaign.name}</h1>
              <Badge variant={campaign.status}>{campaign.status}</Badge>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
              <span>Platform: <span className="font-semibold capitalize">{campaign.platform}</span></span>
              <span>•</span>
              <span>Created: {new Date(campaign.createdAt).toLocaleDateString()}</span>
            </p>
          </div>
        </div>

        {/* Status Actions */}
        <div className="flex items-center gap-2">
          {campaign.status === 'live' && (
            <Button
              variant="outline"
              size="sm"
              isLoading={statusUpdating}
              onClick={() => handleStatusChange('paused')}
              className="text-amber-700 border-amber-300 hover:bg-amber-50"
            >
              <Pause className="w-4 h-4 mr-1.5" />
              Pause Campaign
            </Button>
          )}

          {campaign.status === 'paused' && (
            <Button
              variant="outline"
              size="sm"
              isLoading={statusUpdating}
              onClick={() => handleStatusChange('live')}
              className="text-emerald-700 border-emerald-300 hover:bg-emerald-50"
            >
              <Play className="w-4 h-4 mr-1.5" />
              Resume Campaign
            </Button>
          )}

          {campaign.status !== 'completed' && (
            <Button
              variant="outline"
              size="sm"
              isLoading={statusUpdating}
              onClick={() => handleStatusChange('completed')}
              className="text-slate-600 hover:bg-slate-100"
            >
              <CheckCircle className="w-4 h-4 mr-1.5" />
              Complete
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Budget Breakdown & Milestone Ladder Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Budget Progress Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Budget Utilization
            </span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Wallet className="w-4 h-4" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-slate-900">
                {formatINR(campaign.spentBudgetPaise)}
              </span>
              <span className="text-xs text-slate-500">
                of {formatINR(campaign.totalBudgetPaise)}
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all"
                style={{ width: `${spentPct}%` }}
              ></div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>Remaining Budget:</span>
            <span className="font-semibold text-indigo-700">
              {formatINR(campaign.remainingBudgetPaise)}
            </span>
          </div>
        </div>

        {/* Milestone Ladder Display */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Milestone Payout Ladder
            </span>
            <span className="text-xs text-slate-400">Highest tier achieved is awarded</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {campaign.milestones.map((m, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1"
              >
                <div className="text-xs font-semibold text-slate-500">
                  Threshold {idx + 1}
                </div>
                <div className="text-base font-bold text-slate-900 font-mono">
                  {m.views.toLocaleString('en-IN')} views
                </div>
                <div className="text-sm font-semibold text-emerald-600">
                  {formatINR(m.payoutPaise)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Submissions Section */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Creator Submissions</h2>
            <p className="text-xs text-slate-500">Posts submitted by verified creators</p>
          </div>
          <span className="text-xs font-medium text-slate-500">
            {submissions.length} submission{submissions.length === 1 ? '' : 's'}
          </span>
        </div>

        {submissions.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-2">
            <p className="text-sm text-slate-500">No creators have submitted posts yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                  <th className="py-3.5 px-6">Creator</th>
                  <th className="py-3.5 px-6">Post Link</th>
                  <th className="py-3.5 px-6">Views</th>
                  <th className="py-3.5 px-6">Eligible / Paid</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Security Flags</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {submissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-semibold text-slate-900">
                        {sub.creatorName || 'Creator'}
                      </div>
                      <div className="text-xs text-slate-400">{sub.creatorEmail}</div>
                    </td>
                    <td className="py-4 px-6">
                      <a
                        href={sub.postUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:underline max-w-[200px] truncate"
                      >
                        {campaign.platform === 'instagram' ? (
                          <Instagram className="w-3.5 h-3.5 text-pink-600 shrink-0" />
                        ) : (
                          <Youtube className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        )}
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
                        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold animate-pulse">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          View Spike Detected
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Normal</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
