'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CampaignDTO, formatINR, CampaignPlatform, isValidPostUrl } from '@/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import {
  Film,
  Instagram,
  Youtube,
  Send,
  AlertCircle,
  CheckCircle,
  Coins,
} from 'lucide-react';

export default function CreatorCampaignsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [campaigns, setCampaigns] = useState<CampaignDTO[]>([]);
  const [platformFilter, setPlatformFilter] = useState<'all' | CampaignPlatform>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Submit Modal state
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignDTO | null>(null);
  const [postUrl, setPostUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'creator')) {
      router.push('/login');
      return;
    }

    if (user?.role === 'creator') {
      fetchCampaigns();
    }
  }, [user, authLoading, platformFilter, router]);

  async function fetchCampaigns() {
    try {
      setLoading(true);
      setError(null);
      const platformQuery = platformFilter === 'all' ? undefined : platformFilter;
      const res = await api.getPublicCampaigns(1, 50, platformQuery);
      if (res.data) {
        setCampaigns(res.data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch campaigns');
    } finally {
      setLoading(false);
    }
  }

  const handleOpenSubmit = (campaign: CampaignDTO) => {
    setSelectedCampaign(campaign);
    setPostUrl('');
    setSubmitError(null);
    setSubmitSuccess(null);
  };

  const handleCloseSubmit = () => {
    setSelectedCampaign(null);
    setPostUrl('');
    setSubmitError(null);
    setSubmitSuccess(null);
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign) return;

    setSubmitError(null);
    setSubmitSuccess(null);

    if (!isValidPostUrl(selectedCampaign.platform, postUrl)) {
      setSubmitError(
        `Please provide a valid ${selectedCampaign.platform === 'instagram' ? 'Instagram Reel/Post' : 'YouTube Video/Shorts'} link.`,
      );
      return;
    }

    try {
      setSubmitting(true);
      await api.submitPost(selectedCampaign.id, { postUrl: postUrl.trim() });
      setSubmitSuccess('Post submitted successfully! Redirecting to submissions...');
      setTimeout(() => {
        handleCloseSubmit();
        router.push('/dashboard/creator/submissions');
      }, 1200);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit post');
    } finally {
      setSubmitting(false);
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
      {/* Header and Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Browse Active Campaigns</h1>
          <p className="text-sm text-slate-500">
            Submit your content to verified brand campaigns and unlock tiered payouts
          </p>
        </div>

        {/* Platform filter buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 rounded-xl">
          <button
            onClick={() => setPlatformFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              platformFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Platforms
          </button>
          <button
            onClick={() => setPlatformFilter('instagram')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              platformFilter === 'instagram'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Instagram className="w-3.5 h-3.5 text-pink-600" />
            Instagram
          </button>
          <button
            onClick={() => setPlatformFilter('youtube')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              platformFilter === 'youtube'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Youtube className="w-3.5 h-3.5 text-red-600" />
            YouTube
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Campaign Cards Grid */}
      {campaigns.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 text-center py-16 px-4 space-y-3">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center mx-auto">
            <Film className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">No campaigns found</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">
            Check back soon or try selecting a different platform filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((camp) => (
            <div
              key={camp.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-xs hover:border-indigo-200 hover:shadow-sm transition-all"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {camp.platform === 'instagram' ? (
                      <Instagram className="w-4 h-4 text-pink-600" />
                    ) : (
                      <Youtube className="w-4 h-4 text-red-600" />
                    )}
                    {camp.platform}
                  </div>
                  <Badge variant={camp.status}>{camp.status}</Badge>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900">{camp.name}</h3>
                  {camp.brandName && (
                    <p className="text-xs text-slate-500 mt-0.5">by {camp.brandName}</p>
                  )}
                  {camp.description && (
                    <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                      {camp.description}
                    </p>
                  )}
                </div>

                {/* Milestones Ladder */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase tracking-wider">
                    <span>Payout Ladder</span>
                    <Coins className="w-3.5 h-3.5 text-indigo-600" />
                  </div>
                  <div className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                    {camp.milestones.map((m, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="font-mono text-slate-600">
                          {m.views.toLocaleString('en-IN')} views
                        </span>
                        <span className="font-semibold text-emerald-600">
                          {formatINR(m.payoutPaise)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-5 border-t border-slate-100 mt-5 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block">Remaining Budget</span>
                  <span className="text-sm font-bold text-slate-900">
                    {formatINR(camp.remainingBudgetPaise)}
                  </span>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleOpenSubmit(camp)}
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Submit Post
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Post Submission Modal */}
      {selectedCampaign && (
        <Modal
          isOpen={!!selectedCampaign}
          onClose={handleCloseSubmit}
          title={`Submit Post for ${selectedCampaign.name}`}
          description={`Submit your verified ${selectedCampaign.platform} URL to enroll in milestone payouts.`}
        >
          {submitError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {submitSuccess && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{submitSuccess}</span>
            </div>
          )}

          <form onSubmit={handlePostSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                {selectedCampaign.platform === 'instagram'
                  ? 'Instagram Reel / Post URL'
                  : 'YouTube Video / Shorts URL'}
              </label>
              <input
                type="url"
                required
                value={postUrl}
                onChange={(e) => setPostUrl(e.target.value)}
                placeholder={
                  selectedCampaign.platform === 'instagram'
                    ? 'https://www.instagram.com/reel/C123abc/'
                    : 'https://youtube.com/shorts/dQw4w9WgXcQ'
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Must be an active, publicly viewable post matching the campaign platform.
              </span>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleCloseSubmit}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={submitting}>
                <Send className="w-3.5 h-3.5 mr-1.5" />
                Confirm Submission
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
