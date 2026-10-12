import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import {
  CreateSubmissionSchema,
  UpdateViewsSchema,
  isValidPostUrl,
} from '../shared';
import { Submission, Campaign } from '../models';
import { PayoutService } from '../services/payoutService';

export class SubmissionController {
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id: campaignId } = req.params;
      const creatorId = req.user!.userId;

      if (!mongoose.Types.ObjectId.isValid(campaignId)) {
        res.status(400).json({ success: false, error: 'Invalid campaign ID' });
        return;
      }

      const validated = CreateSubmissionSchema.parse(req.body);

      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        res.status(404).json({ success: false, error: 'Campaign not found' });
        return;
      }

      if (campaign.status !== 'live') {
        res.status(400).json({
          success: false,
          error: `Cannot submit to a campaign with status '${campaign.status}'`,
        });
        return;
      }

      // Validate URL against campaign's platform
      if (!isValidPostUrl(campaign.platform, validated.postUrl)) {
        res.status(400).json({
          success: false,
          error: `Invalid post URL for platform '${campaign.platform}'. Please provide a valid ${campaign.platform} link.`,
        });
        return;
      }

      // Check for duplicate submission by this creator for this campaign
      const existing = await Submission.findOne({
        campaign: campaign._id,
        creator: creatorId,
      });

      if (existing) {
        res.status(409).json({
          success: false,
          error: 'You have already submitted a post for this campaign',
        });
        return;
      }

      const submission = await Submission.create({
        campaign: campaign._id,
        creator: creatorId,
        postUrl: validated.postUrl,
        views: 0,
        eligiblePayoutPaise: 0,
        paidAmountPaise: 0,
        status: 'pending',
        spikeDetected: false,
      });

      res.status(201).json({
        success: true,
        data: {
          id: submission._id.toString(),
          campaignId: campaign._id.toString(),
          campaignName: campaign.name,
          campaignPlatform: campaign.platform,
          creatorId,
          postUrl: submission.postUrl,
          views: submission.views,
          eligiblePayoutPaise: submission.eligiblePayoutPaise,
          paidAmountPaise: submission.paidAmountPaise,
          status: submission.status,
          spikeDetected: submission.spikeDetected,
          createdAt: submission.createdAt.toISOString(),
          updatedAt: submission.updatedAt.toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getMine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const creatorId = req.user!.userId;

      const submissions = await Submission.find({ creator: creatorId })
        .populate('campaign', 'name platform milestones totalBudgetPaise spentBudgetPaise status')
        .sort({ createdAt: -1 });

      const formatted = submissions.map((s) => {
        const campaign = s.campaign as unknown as {
          _id: string;
          name: string;
          platform: string;
          status: string;
        };

        return {
          id: s._id.toString(),
          campaignId: campaign ? campaign._id.toString() : s.campaign.toString(),
          campaignName: campaign ? campaign.name : 'Unknown Campaign',
          campaignPlatform: campaign ? campaign.platform : 'instagram',
          creatorId: s.creator.toString(),
          postUrl: s.postUrl,
          views: s.views,
          eligiblePayoutPaise: s.eligiblePayoutPaise,
          paidAmountPaise: s.paidAmountPaise,
          status: s.status,
          spikeDetected: s.spikeDetected,
          lastPayoutProcessedAt: s.lastPayoutProcessedAt?.toISOString(),
          createdAt: s.createdAt.toISOString(),
          updatedAt: s.updatedAt.toISOString(),
        };
      });

      res.status(200).json({
        success: true,
        data: formatted,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const currentUserId = req.user!.userId;
      const currentUserRole = req.user!.role;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, error: 'Invalid submission ID' });
        return;
      }

      const submission = await Submission.findById(id).populate('campaign');
      if (!submission) {
        res.status(404).json({ success: false, error: 'Submission not found' });
        return;
      }

      const campaign = submission.campaign as unknown as {
        _id: string;
        name: string;
        platform: string;
        brand: { toString(): string };
      };

      // Authorization check: Only the creator who owns it OR the brand who owns the campaign can view it
      const isOwnerCreator = submission.creator.toString() === currentUserId;
      const isOwnerBrand =
        currentUserRole === 'brand' && campaign.brand.toString() === currentUserId;

      if (!isOwnerCreator && !isOwnerBrand) {
        res.status(403).json({
          success: false,
          error: 'Forbidden: You do not have permission to view this submission',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          id: submission._id.toString(),
          campaignId: campaign._id.toString(),
          campaignName: campaign.name,
          campaignPlatform: campaign.platform,
          creatorId: submission.creator.toString(),
          postUrl: submission.postUrl,
          views: submission.views,
          eligiblePayoutPaise: submission.eligiblePayoutPaise,
          paidAmountPaise: submission.paidAmountPaise,
          status: submission.status,
          spikeDetected: submission.spikeDetected,
          lastPayoutProcessedAt: submission.lastPayoutProcessedAt?.toISOString(),
          createdAt: submission.createdAt.toISOString(),
          updatedAt: submission.updatedAt.toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Simulation view update endpoint.
   * NOTE: As strictly mandated by specification, this endpoint does NOT require a role check.
   */
  public static async updateViews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, error: 'Invalid submission ID' });
        return;
      }

      const validated = UpdateViewsSchema.parse(req.body);
      const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

      const result = await PayoutService.processViewUpdate(
        id,
        validated.views,
        idempotencyKey,
      );

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          submissionId: result.submission._id.toString(),
          views: result.submission.views,
          eligiblePayoutPaise: result.eligiblePayoutPaise,
          paidAmountPaise: result.paidAmountPaise,
          payoutAllocatedPaise: result.payoutAllocatedPaise,
          status: result.submission.status,
          spikeDetected: result.spikeDetected,
          campaignSpentPaise: result.campaignSpentPaise,
          campaignRemainingPaise: result.campaignRemainingPaise,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getEarnings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const creatorId = req.user!.userId;

      const submissions = await Submission.find({ creator: creatorId });

      let totalEarnedPaise = 0;
      let totalEligiblePaise = 0;

      for (const s of submissions) {
        totalEarnedPaise += s.paidAmountPaise;
        totalEligiblePaise += s.eligiblePayoutPaise;
      }

      const pendingPayoutPaise = Math.max(0, totalEligiblePaise - totalEarnedPaise);

      res.status(200).json({
        success: true,
        data: {
          totalEarnedPaise,
          totalEligiblePaise,
          totalSubmissions: submissions.length,
          pendingPayoutPaise,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
