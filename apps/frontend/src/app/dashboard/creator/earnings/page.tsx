'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CreatorEarningsSummary, SubmissionDTO, formatINR } from '@memed/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import {
  Wallet,
  ShieldCheck,
  Clock,
  Send,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';

export default function CreatorEarningsPage() {
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
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Earnings & Audit Breakdown</h1>
        <p className="text-sm text-slate-500">
          Transparent accounting with exact integer paise precision and campaign audit logs
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard
          title="Actual Paid Earnings"
          value={formatINR(earnings?.totalEarnedPaise || 0)}
          subtitle="Directly settled from funded campaigns"
          icon={<Wallet className="w-5 h-5 text-emerald-600" />}
        />
        <StatCard
          title="Total Eligible Payout"
          value={formatINR(earnings?.totalEligiblePaise || 0)}
          subtitle="Earned based on verified milestone view counts"
          icon={<ShieldCheck className="w-5 h-5 text-indigo-600" />}
        />
        <StatCard
          title="Pending / Unfunded"
          value={formatINR(earnings?.pendingPayoutPaise || 0)}
          subtitle="Outstanding if a campaign reached its budget cap"
          icon={<Clock className="w-5 h-5 text-amber-600" />}
        />
      </div>

      {/* Audit Explainer Card */}
      <div className="p-6 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-start gap-4">
        <HelpCircle className="w-6 h-6 text-indigo-600 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs text-indigo-950">
          <h4 className="font-bold text-sm text-indigo-900">How Are Earnings Protected?</h4>
          <p>
            • <strong>Paid Earnings:</strong> Represents funds guaranteed and transferred via atomic MongoDB transaction reservations.
          </p>
          <p>
            • <strong>Eligible Payout:</strong> Reflects highest milestone reached. If a brand campaign runs out of budget, your eligible amount is securely recorded as outstanding. Once a brand increases budget, subsequent updates automatically disburse the pending difference.
          </p>
        </div>
      </div>

      {/* Submissions Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Earnings Per Submission</h2>
          <span className="text-xs text-slate-500">{submissions.length} total entries</span>
        </div>

        {submissions.length === 0 ? (
          <div className="text-center py-12 px-4 text-sm text-slate-500">
            No submissions recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-slate-500 text-xs uppercase tracking-wider font-semibold">
                  <th className="py-3.5 px-6">Campaign</th>
                  <th className="py-3.5 px-6">Post Link</th>
                  <th className="py-3.5 px-6">Confirmed Views</th>
                  <th className="py-3.5 px-6">Eligible Amount</th>
                  <th className="py-3.5 px-6">Paid Amount</th>
                  <th className="py-3.5 px-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {submissions.map((sub) => {
                  const pendingDiff = Math.max(0, sub.eligiblePayoutPaise - sub.paidAmountPaise);

                  return (
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
                      <td className="py-4 px-6 font-semibold text-slate-900">
                        {formatINR(sub.eligiblePayoutPaise)}
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-semibold text-emerald-600">
                          {formatINR(sub.paidAmountPaise)}
                        </span>
                        {pendingDiff > 0 && (
                          <div className="text-xs text-amber-600">
                            (Unfunded: {formatINR(pendingDiff)})
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <Badge variant={sub.status}>{sub.status}</Badge>
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
