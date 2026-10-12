import { z } from 'zod';

export type UserRole = 'brand' | 'creator';
export type CampaignPlatform = 'instagram' | 'youtube';
export type CampaignStatus = 'live' | 'paused' | 'completed';
export type SubmissionStatus = 'pending' | 'partially_paid' | 'paid';

export interface Milestone {
  views: number; // View threshold (e.g. 10000)
  payoutPaise: number; // Payout in integer paise (e.g. 50000 for ₹500)
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface CampaignDTO {
  id: string;
  name: string;
  description?: string;
  platform: CampaignPlatform;
  totalBudgetPaise: number;
  spentBudgetPaise: number;
  remainingBudgetPaise: number;
  milestones: Milestone[];
  status: CampaignStatus;
  brandId: string;
  brandName?: string;
  submissionCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionDTO {
  id: string;
  campaignId: string;
  campaignName?: string;
  campaignPlatform?: CampaignPlatform;
  creatorId: string;
  creatorName?: string;
  creatorEmail?: string;
  postUrl: string;
  views: number;
  eligiblePayoutPaise: number;
  paidAmountPaise: number;
  status: SubmissionStatus;
  spikeDetected: boolean;
  lastPayoutProcessedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayoutLedgerDTO {
  id: string;
  submissionId: string;
  campaignId: string;
  creatorId: string;
  amountPaise: number;
  eligiblePayoutBeforePaise: number;
  eligiblePayoutAfterPaise: number;
  idempotencyKey: string;
  createdAt: string;
}

export interface CreatorEarningsSummary {
  totalEarnedPaise: number; // Actually paid amount received
  totalEligiblePaise: number; // Total eligible payout earned across submissions
  totalSubmissions: number;
  pendingPayoutPaise: number; // totalEligiblePaise - totalEarnedPaise (unfunded or pending)
}

export interface CampaignBudgetSummary {
  campaignId: string;
  campaignName: string;
  totalBudgetPaise: number;
  spentBudgetPaise: number;
  remainingBudgetPaise: number;
  status: CampaignStatus;
}

// Currency Conversion Helpers
export const RUPEES_TO_PAISE = 100;

export function rupeesToPaise(rupees: number): number {
  if (typeof rupees !== 'number' || isNaN(rupees)) {
    throw new Error('Invalid rupee value');
  }
  return Math.round(rupees * RUPEES_TO_PAISE);
}

export function paiseToRupees(paise: number): number {
  if (typeof paise !== 'number' || isNaN(paise)) {
    return 0;
  }
  return paise / RUPEES_TO_PAISE;
}

export function formatINR(paise: number): string {
  const rupees = paiseToRupees(paise);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: paise % 100 === 0 ? 0 : 2,
  }).format(rupees);
}

// Validation Schemas
export const SignupSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
  role: z.enum(['brand', 'creator'], {
    errorMap: () => ({ message: 'Role must be either brand or creator' }),
  }),
});
export type SignupInput = z.infer<typeof SignupSchema>;

export const LoginSchema = z.object({
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const MilestoneSchema = z.object({
  views: z.number().int('Views must be an integer').positive('Milestone views must be greater than 0'),
  payoutPaise: z.number().int('Payout must be in integer paise').nonnegative('Payout must be non-negative'),
});

export const CreateCampaignSchema = z.object({
  name: z.string().trim().min(3, 'Campaign name must be at least 3 characters').max(120),
  description: z.string().trim().max(1000).optional(),
  platform: z.enum(['instagram', 'youtube']),
  totalBudgetPaise: z
    .number()
    .int('Total budget must be in integer paise')
    .positive('Total budget must be greater than zero'),
  milestones: z
    .array(MilestoneSchema)
    .min(1, 'At least one milestone is required')
    .refine((milestones) => {
      const viewsList = milestones.map((m) => m.views);
      return new Set(viewsList).size === viewsList.length;
    }, 'Milestone view thresholds must be unique'),
});
export type CreateCampaignInput = z.infer<typeof CreateCampaignSchema>;

export const UpdateCampaignStatusSchema = z.object({
  status: z.enum(['live', 'paused', 'completed']),
});
export type UpdateCampaignStatusInput = z.infer<typeof UpdateCampaignStatusSchema>;

// URL verification for Instagram and YouTube
const INSTAGRAM_REGEX = /^(https?:\/\/)?(www\.)?instagram\.com\/(p|reel|tv)\/[\w-]+\/?(\?.*)?$/i;
const YOUTUBE_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[\w-]{6,}\/?(\?.*)?$/i;

export function isValidPostUrl(platform: CampaignPlatform, url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (platform === 'instagram') {
    return INSTAGRAM_REGEX.test(trimmed);
  }
  if (platform === 'youtube') {
    return YOUTUBE_REGEX.test(trimmed);
  }
  return false;
}

export const CreateSubmissionSchema = z.object({
  postUrl: z.string().trim().url('Must be a valid URL'),
});
export type CreateSubmissionInput = z.infer<typeof CreateSubmissionSchema>;

export const UpdateViewsSchema = z.object({
  views: z.number().int('Views must be an integer').min(0, 'Views must be non-negative'),
});
export type UpdateViewsInput = z.infer<typeof UpdateViewsSchema>;

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  details?: unknown;
}
