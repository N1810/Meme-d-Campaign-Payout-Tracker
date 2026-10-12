import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import {
  CreateCampaignSchema,
  UpdateCampaignStatusSchema,
  CampaignDTO,
} from '../shared';
import { Campaign, Submission } from '../models';
import { cacheService } from '../services/cacheService';

export class CampaignController {
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const brandId = req.user!.userId;
      const validated = CreateCampaignSchema.parse(req.body);

      // Sort milestones ascending
      const sortedMilestones = [...validated.milestones].sort((a, b) => a.views - b.views);

      const campaign = await Campaign.create({
        name: validated.name,
        description: validated.description,
        platform: validated.platform,
        totalBudgetPaise: validated.totalBudgetPaise,
        spentBudgetPaise: 0,
        milestones: sortedMilestones,
        status: 'live',
        brand: brandId,
      });

      await cacheService.invalidateCampaigns();

      res.status(201).json({
        success: true,
        data: {
          id: campaign._id.toString(),
          name: campaign.name,
          description: campaign.description,
          platform: campaign.platform,
          totalBudgetPaise: campaign.totalBudgetPaise,
          spentBudgetPaise: campaign.spentBudgetPaise,
          remainingBudgetPaise: campaign.remainingBudgetPaise,
          milestones: campaign.milestones,
          status: campaign.status,
          brandId: campaign.brand.toString(),
          createdAt: campaign.createdAt.toISOString(),
          updatedAt: campaign.updatedAt.toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async listPublic(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
      const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || '10', 10)));
      const platform = req.query.platform as string;
      const skip = (page - 1) * limit;

      const cacheKey = `campaigns:list:p${page}:l${limit}:plt${platform || 'all'}`;
      const cached = await cacheService.get<{ campaigns: CampaignDTO[]; total: number }>(cacheKey);

      if (cached) {
        res.status(200).json({
          success: true,
          data: cached.campaigns,
          pagination: {
            page,
            limit,
            total: cached.total,
            totalPages: Math.ceil(cached.total / limit),
          },
        });
        return;
      }

      const query: Record<string, unknown> = { status: 'live' };
      if (platform && ['instagram', 'youtube'].includes(platform)) {
        query.platform = platform;
      }

      const [campaigns, total] = await Promise.all([
        Campaign.find(query)
          .populate('brand', 'name')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Campaign.countDocuments(query),
      ]);

      const formatted: CampaignDTO[] = campaigns.map((c) => ({
        id: c._id.toString(),
        name: c.name,
        description: c.description,
        platform: c.platform,
        totalBudgetPaise: c.totalBudgetPaise,
        spentBudgetPaise: c.spentBudgetPaise,
        remainingBudgetPaise: Math.max(0, c.totalBudgetPaise - c.spentBudgetPaise),
        milestones: c.milestones,
        status: c.status,
        brandId: (c.brand as unknown as { _id: string })._id?.toString() || c.brand.toString(),
        brandName: (c.brand as unknown as { name?: string })?.name,
        createdAt: (c as unknown as { createdAt: Date }).createdAt.toISOString(),
        updatedAt: (c as unknown as { updatedAt: Date }).updatedAt.toISOString(),
      }));

      await cacheService.set(cacheKey, { campaigns: formatted, total }, 30);

      res.status(200).json({
        success: true,
        data: formatted,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, error: 'Invalid campaign ID' });
        return;
      }

      const campaign = await Campaign.findById(id).populate('brand', 'name');
      if (!campaign) {
        res.status(404).json({ success: false, error: 'Campaign not found' });
        return;
      }

      const submissionCount = await Submission.countDocuments({ campaign: campaign._id });

      res.status(200).json({
        success: true,
        data: {
          id: campaign._id.toString(),
          name: campaign.name,
          description: campaign.description,
          platform: campaign.platform,
          totalBudgetPaise: campaign.totalBudgetPaise,
          spentBudgetPaise: campaign.spentBudgetPaise,
          remainingBudgetPaise: campaign.remainingBudgetPaise,
          milestones: campaign.milestones,
          status: campaign.status,
          brandId: campaign.brand._id.toString(),
          brandName: (campaign.brand as unknown as { name?: string }).name,
          submissionCount,
          createdAt: campaign.createdAt.toISOString(),
          updatedAt: campaign.updatedAt.toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getMine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const brandId = req.user!.userId;
      const campaigns = await Campaign.find({ brand: brandId }).sort({ createdAt: -1 });

      const campaignIds = campaigns.map((c) => c._id);
      const submissionCounts = await Submission.aggregate([
        { $match: { campaign: { $in: campaignIds } } },
        { $group: { _id: '$campaign', count: { $sum: 1 } } },
      ]);

      const countMap = new Map<string, number>(
        submissionCounts.map((s) => [s._id.toString(), s.count]),
      );

      const formatted = campaigns.map((c) => ({
        id: c._id.toString(),
        name: c.name,
        description: c.description,
        platform: c.platform,
        totalBudgetPaise: c.totalBudgetPaise,
        spentBudgetPaise: c.spentBudgetPaise,
        remainingBudgetPaise: c.remainingBudgetPaise,
        milestones: c.milestones,
        status: c.status,
        brandId: c.brand.toString(),
        submissionCount: countMap.get(c._id.toString()) || 0,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      }));

      res.status(200).json({
        success: true,
        data: formatted,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const brandId = req.user!.userId;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, error: 'Invalid campaign ID' });
        return;
      }

      const validated = UpdateCampaignStatusSchema.parse(req.body);

      const campaign = await Campaign.findById(id);
      if (!campaign) {
        res.status(404).json({ success: false, error: 'Campaign not found' });
        return;
      }

      if (campaign.brand.toString() !== brandId) {
        res.status(403).json({ success: false, error: 'Forbidden: You do not own this campaign' });
        return;
      }

      campaign.status = validated.status;
      await campaign.save();
      await cacheService.invalidateCampaigns();

      res.status(200).json({
        success: true,
        data: {
          id: campaign._id.toString(),
          status: campaign.status,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getSubmissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const brandId = req.user!.userId;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, error: 'Invalid campaign ID' });
        return;
      }

      const campaign = await Campaign.findById(id);
      if (!campaign) {
        res.status(404).json({ success: false, error: 'Campaign not found' });
        return;
      }

      if (campaign.brand.toString() !== brandId) {
        res.status(403).json({ success: false, error: 'Forbidden: You do not own this campaign' });
        return;
      }

      const submissions = await Submission.find({ campaign: campaign._id })
        .populate('creator', 'name email')
        .sort({ createdAt: -1 });

      const formatted = submissions.map((s) => ({
        id: s._id.toString(),
        campaignId: campaign._id.toString(),
        campaignName: campaign.name,
        campaignPlatform: campaign.platform,
        creatorId: s.creator._id.toString(),
        creatorName: (s.creator as unknown as { name?: string }).name,
        creatorEmail: (s.creator as unknown as { email?: string }).email,
        postUrl: s.postUrl,
        views: s.views,
        eligiblePayoutPaise: s.eligiblePayoutPaise,
        paidAmountPaise: s.paidAmountPaise,
        status: s.status,
        spikeDetected: s.spikeDetected,
        lastPayoutProcessedAt: s.lastPayoutProcessedAt?.toISOString(),
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      }));

      res.status(200).json({
        success: true,
        data: formatted,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getBudget(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, error: 'Invalid campaign ID' });
        return;
      }

      const campaign = await Campaign.findById(id);
      if (!campaign) {
        res.status(404).json({ success: false, error: 'Campaign not found' });
        return;
      }

      // Check ownership if user is brand
      if (req.user && req.user.role === 'brand' && campaign.brand.toString() !== req.user.userId) {
        res.status(403).json({ success: false, error: 'Forbidden: Access denied' });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          campaignId: campaign._id.toString(),
          campaignName: campaign.name,
          totalBudgetPaise: campaign.totalBudgetPaise,
          spentBudgetPaise: campaign.spentBudgetPaise,
          remainingBudgetPaise: campaign.remainingBudgetPaise,
          status: campaign.status,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
