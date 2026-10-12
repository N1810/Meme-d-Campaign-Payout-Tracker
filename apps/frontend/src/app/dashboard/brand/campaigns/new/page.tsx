'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { rupeesToPaise, CampaignPlatform } from '@/shared';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import {
  Plus,
  Trash2,
  ArrowLeft,
  AlertCircle,
  Instagram,
  Youtube,
  Sparkles,
} from 'lucide-react';

interface MilestoneRow {
  views: number;
  payoutRupees: number;
}

export default function NewCampaignPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [platform, setPlatform] = useState<CampaignPlatform>('instagram');
  const [totalBudgetRupees, setTotalBudgetRupees] = useState<number>(50000);
  const [milestones, setMilestones] = useState<MilestoneRow[]>([
    { views: 10000, payoutRupees: 500 },
    { views: 50000, payoutRupees: 2000 },
    { views: 100000, payoutRupees: 5000 },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddMilestone = () => {
    const last = milestones[milestones.length - 1];
    const newViews = last ? last.views + 50000 : 10000;
    const newPayout = last ? last.payoutRupees + 2000 : 500;
    setMilestones([...milestones, { views: newViews, payoutRupees: newPayout }]);
  };

  const handleRemoveMilestone = (index: number) => {
    if (milestones.length <= 1) {
      setError('A campaign must contain at least one milestone tier');
      return;
    }
    const updated = milestones.filter((_, i) => i !== index);
    setMilestones(updated);
  };

  const handleMilestoneChange = (
    index: number,
    field: 'views' | 'payoutRupees',
    value: number,
  ) => {
    const updated = [...milestones];
    updated[index][field] = Math.max(0, value);
    setMilestones(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Campaign name is required');
      return;
    }

    if (!totalBudgetRupees || totalBudgetRupees <= 0) {
      setError('Total budget must be greater than zero');
      return;
    }

    if (milestones.length === 0) {
      setError('At least one milestone is required');
      return;
    }

    // Check unique views
    const viewCounts = milestones.map((m) => m.views);
    if (new Set(viewCounts).size !== viewCounts.length) {
      setError('Milestone view thresholds must be unique');
      return;
    }

    // Check view > 0
    if (milestones.some((m) => m.views <= 0)) {
      setError('Milestone views must be positive numbers');
      return;
    }

    try {
      setLoading(true);
      await api.createCampaign({
        name: name.trim(),
        description: description.trim() || undefined,
        platform,
        totalBudgetPaise: rupeesToPaise(totalBudgetRupees),
        milestones: milestones.map((m) => ({
          views: Number(m.views),
          payoutPaise: rupeesToPaise(Number(m.payoutRupees)),
        })),
      });

      router.push('/dashboard/brand');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <a href="/dashboard/brand" className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </a>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Create New Campaign</h1>
          <p className="text-sm text-slate-500">
            Define budget limits and view-based performance milestone rewards
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-8 shadow-xs">
        {/* Basic Details */}
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-2">
            1. Campaign Details
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Campaign Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Summer Product Launch Reels"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief context and instructions for creators..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Platform
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPlatform('instagram')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-sm font-medium transition-all ${
                    platform === 'instagram'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Instagram className="w-4 h-4 text-pink-600" />
                  Instagram
                </button>
                <button
                  type="button"
                  onClick={() => setPlatform('youtube')}
                  className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-sm font-medium transition-all ${
                    platform === 'youtube'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Youtube className="w-4 h-4 text-red-600" />
                  YouTube
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Total Budget (₹ INR) *
              </label>
              <input
                type="number"
                min="100"
                step="100"
                required
                value={totalBudgetRupees}
                onChange={(e) => setTotalBudgetRupees(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Stored in integer paise: {(totalBudgetRupees * 100).toLocaleString('en-IN')} paise
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Milestone Ladder */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                2. Milestone Ladder
              </h2>
              <p className="text-xs text-slate-500">
                Creators earn the payout of the highest threshold reached.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddMilestone}
              className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Milestone
            </Button>
          </div>

          <div className="space-y-3">
            {milestones.map((m, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200"
              >
                <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-semibold text-xs flex items-center justify-center shrink-0">
                  {idx + 1}
                </div>

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-0.5">
                      View Threshold
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={m.views}
                      onChange={(e) => handleMilestoneChange(idx, 'views', Number(e.target.value))}
                      placeholder="e.g. 10000"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-0.5">
                      Payout Reward (₹ INR)
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={m.payoutRupees}
                      onChange={(e) => handleMilestoneChange(idx, 'payoutRupees', Number(e.target.value))}
                      placeholder="e.g. 500"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveMilestone(idx)}
                  className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors shrink-0"
                  title="Remove row"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <a href="/dashboard/brand">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </a>
          <Button type="submit" isLoading={loading} variant="primary">
            <Sparkles className="w-4 h-4 mr-2" />
            Launch Campaign
          </Button>
        </div>
      </form>
    </div>
  );
}
