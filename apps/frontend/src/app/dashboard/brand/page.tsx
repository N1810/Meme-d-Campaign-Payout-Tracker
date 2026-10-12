'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CampaignDTO, formatINR } from '@memed/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import {
  Layers,
  Wallet,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  ArrowUpRight,
  Instagram,
  Youtube,
} from 'lucide-react';

export default function BrandDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<CampaignDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'brand')) {
      router.push('/login');
      return;
    }

    if (user?.role === 'brand') {
      fetchCampaigns();
    }
  }, [user, authLoading, router]);

  async function fetchCampaigns() {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getMyCampaigns();
      if (res.data) {
        setCampaigns(res.data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch campaigns');
    } finally {
      setLoading(false);
    }
  }

  const totalBudgetPaise = campaigns.reduce((acc, c) => acc + c.totalBudgetPaise, 0);
  const totalSpentPaise = campaigns.reduce((acc, c) => acc + c.spentBudgetPaise, 0);
  const totalRemainingPaise = Math.max(0, totalBudgetPaise - totalSpentPaise);
  const liveCampaignCount = campaigns.filter((c) => c.status === 'live').length;

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
          <h1 className="text-2xl font-bold text-slate-900">Brand Overview</h1>
          <p className="text-sm text-slate-500">
            Monitor budget allocation, active campaigns, and creator submissions
          </p>
        </div>
        <a href="/dashboard/brand/campaigns/new">
          <Button variant="primary" className="shadow-xs">
            <PlusCircle className="w-4 h-4 mr-2" />
            Create Campaign
          </Button>
        </a>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Campaigns"
          value={campaigns.length}
          subtitle={`${liveCampaignCount} active campaigns`}
          icon={<Layers className="w-5 h-5" />}
        />
        <StatCard
          title="Allocated Budget"
          value={formatINR(totalBudgetPaise)}
          subtitle="Total committed pool"
          icon={<Wallet className="w-5 h-5" />}
        />
        <StatCard
          title="Disbursed Payouts"
          value={formatINR(totalSpentPaise)}
          subtitle={`${totalBudgetPaise > 0 ? Math.round((totalSpentPaise / totalBudgetPaise) * 100) : 0}% budget utilized`}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
        />
        <StatCard
          title="Remaining Budget"
          value={formatINR(totalRemainingPaise)}
          subtitle="Available for milestones"
          icon={<Wallet className="w-5 h-5 text-indigo-600" />}
        />
      </div>

      {/* Campaign List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Your Campaigns</h2>
          <span className="text-xs text-slate-500">{campaigns.length} campaigns</span>
        </div>

        {campaigns.length === 0 ? (
          <div className="text-center py-16 px-4 space-y-3">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center mx-auto">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">No campaigns yet</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Create your first campaign with milestone ladders to start attracting creators.
            </p>
            <a href="/dashboard/brand/campaigns/new" className="inline-block mt-2">
              <Button variant="primary" size="sm">
                Create First Campaign
              </Button>
            </a>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                  <th className="py-3.5 px-6">Campaign</th>
                  <th className="py-3.5 px-6">Platform</th>
                  <th className="py-3.5 px-6">Total Budget</th>
                  <th className="py-3.5 px-6">Spent / Left</th>
                  <th className="py-3.5 px-6">Milestones</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {campaigns.map((camp) => {
                  const spentPct = camp.totalBudgetPaise > 0
                    ? Math.min(100, Math.round((camp.spentBudgetPaise / camp.totalBudgetPaise) * 100))
                    : 0;

                  return (
                    <tr key={camp.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6 font-medium text-slate-900">
                        <div>
                          <a
                            href={`/dashboard/brand/campaigns/${camp.id}`}
                            className="hover:text-indigo-600 transition-colors font-semibold"
                          >
                            {camp.name}
                          </a>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {camp.submissionCount || 0} creator submission{(camp.submissionCount || 0) === 1 ? '' : 's'}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5 capitalize text-xs font-medium">
                          {camp.platform === 'instagram' ? (
                            <Instagram className="w-4 h-4 text-pink-600" />
                          ) : (
                            <Youtube className="w-4 h-4 text-red-600" />
                          )}
                          {camp.platform}
                        </div>
                      </td>
                      <td className="py-4 px-6 font-semibold text-slate-900">
                        {formatINR(camp.totalBudgetPaise)}
                      </td>
                      <td className="py-4 px-6">
                        <div className="space-y-1 w-32">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-slate-900">{formatINR(camp.spentBudgetPaise)}</span>
                            <span className="text-slate-400">{spentPct}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-indigo-600 h-1.5 rounded-full transition-all"
                              style={{ width: `${spentPct}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-600">
                        {camp.milestones.length} tier{camp.milestones.length === 1 ? '' : 's'}
                      </td>
                      <td className="py-4 px-6">
                        <Badge variant={camp.status}>{camp.status}</Badge>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <a href={`/dashboard/brand/campaigns/${camp.id}`}>
                          <Button variant="outline" size="sm">
                            Manage
                            <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                          </Button>
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
