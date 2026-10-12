'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CreatorEarningsSummary, SubmissionDTO, formatINR } from '@memed/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import {
  Wallet,
  Clock,
  Send,
  Sparkles,
  ExternalLink,
  Film,
  TrendingUp,
} from 'lucide-react';

export default function CreatorDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [earnings, setEarnings] = useState<CreatorEarningsSummary | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'creator')) {
      router.push('/login');
      return;
    }

    if (user?.role === 'creator') {
      loadData();
    }
  }, [user, authLoading, router]);

  async function loadData() {
    try {
      setLoading(true);
      const [earnRes, subsRes] = await Promise.all([
        api.getMyEarnings(),
        api.getMySubmissions(),
      ]);

      if (earnRes.data) setEarnings(earnRes.data);
      if (subsRes.data) setSubmissions(subsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Creator Dashboard</h1>
          <p className="text-sm text-slate-500">
            Track views, milestone achievements, and actual deposited earnings
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a href="/dashboard/creator/campaigns">
            <Button variant="primary">
              <Film className="w-4 h-4 mr-2" />
              Browse Campaigns
            </Button>
          </a>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Paid Earnings"
          value={formatINR(earnings?.totalEarnedPaise || 0)}
          subtitle="Directly settled in your balance"
          icon={<Wallet className="w-5 h-5 text-emerald-600" />}
        />
        <StatCard
          title="Total Eligible Payout"
          value={formatINR(earnings?.totalEligiblePaise || 0)}
          subtitle="Earned across all reached tiers"
          icon={<TrendingUp className="w-5 h-5 text-indigo-600" />}
        />
        <StatCard
          title="Pending / Unfunded"
          value={formatINR(earnings?.pendingPayoutPaise || 0)}
          subtitle="Awaiting campaign budget replenishment"
          icon={<Clock className="w-5 h-5 text-amber-600" />}
        />
        <StatCard
          title="Active Submissions"
          value={submissions.length}
          subtitle="Monitored campaign posts"
          icon={<Send className="w-5 h-5 text-indigo-600" />}
        />
      </div>

      {/* Recent Submissions */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Your Recent Submissions</h2>
            <p className="text-xs text-slate-500">Monitor views and payouts per post</p>
          </div>
          <a href="/dashboard/creator/submissions">
            <Button variant="ghost" size="sm">
              View All & Test Views
            </Button>
          </a>
        </div>

        {submissions.length === 0 ? (
          <div className="text-center py-16 px-4 space-y-3">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">No submissions yet</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Browse live campaigns, create great content, and submit your post link to begin earning.
            </p>
            <a href="/dashboard/creator/campaigns" className="inline-block mt-2">
              <Button variant="primary" size="sm">
                Explore Live Campaigns
              </Button>
            </a>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                  <th className="py-3.5 px-6">Campaign</th>
                  <th className="py-3.5 px-6">Post Link</th>
                  <th className="py-3.5 px-6">Views</th>
                  <th className="py-3.5 px-6">Paid Amount</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {submissions.slice(0, 5).map((sub) => (
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
                    <td className="py-4 px-6 font-semibold text-emerald-600">
                      {formatINR(sub.paidAmountPaise)}
                    </td>
                    <td className="py-4 px-6">
                      <Badge variant={sub.status}>{sub.status}</Badge>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <a href="/dashboard/creator/submissions">
                        <Button variant="outline" size="sm">
                          Manage
                        </Button>
                      </a>
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
