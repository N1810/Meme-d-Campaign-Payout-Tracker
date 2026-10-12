import mongoose, { ClientSession } from 'mongoose';
import { Submission, Campaign, PayoutLedger, ISubmission } from '../models';
import { calculateEligiblePayout } from './payoutEngine';
import { SpikeDetectionService } from './spikeService';
import { cacheService } from './cacheService';

export interface ViewUpdateResult {
  submission: ISubmission;
  payoutAllocatedPaise: number;
  eligiblePayoutPaise: number;
  paidAmountPaise: number;
  campaignSpentPaise: number;
  campaignRemainingPaise: number;
  spikeDetected: boolean;
  message: string;
}

export class PayoutService {
  /**
   * Atomically processes a view update with transactional budget protection, idempotency,
   * and automatic transaction retry on write conflicts.
   *
   * @param submissionId MongoDB ID of the submission
   * @param newViews The incoming total view count
   * @param customIdempotencyKey Optional client-provided idempotency key
   */
  public static async processViewUpdate(
    submissionId: string,
    newViews: number,
    customIdempotencyKey?: string,
  ): Promise<ViewUpdateResult> {
    if (!mongoose.Types.ObjectId.isValid(submissionId)) {
      throw new Error('Invalid submission ID');
    }

    if (typeof newViews !== 'number' || isNaN(newViews) || !Number.isInteger(newViews) || newViews < 0) {
      throw new Error('Views must be a non-negative integer');
    }

    const MAX_RETRIES = 5;
    let attempt = 0;

    while (attempt < MAX_RETRIES) {
      attempt++;
      let session: ClientSession | null = null;
      let useTransaction = false;

      try {
        session = await mongoose.startSession();
        session.startTransaction();
        useTransaction = true;
      } catch {
        if (session) {
          session.endSession();
          session = null;
        }
        useTransaction = false;
      }

      try {
        const result = await this.executeViewUpdate({
          submissionId,
          newViews,
          customIdempotencyKey,
          session: useTransaction ? session : null,
        });

        if (useTransaction && session) {
          await session.commitTransaction();
        }

        // Invalidate campaign caches
        await cacheService.invalidateCampaigns();

        return result;
      } catch (error: unknown) {
        if (useTransaction && session) {
          try {
            await session.abortTransaction();
          } catch {
            // Ignore abort error
          }
        }

        const isWriteConflict =
          error instanceof Error &&
          (error.message.includes('Write conflict') ||
            error.message.includes('TransientTransactionError') ||
            (error as { hasErrorLabel?: (l: string) => boolean }).hasErrorLabel?.('TransientTransactionError'));

        if (isWriteConflict && attempt < MAX_RETRIES) {
          // Jittered backoff before retrying
          await new Promise((resolve) => setTimeout(resolve, Math.random() * 50 + 20));
          continue;
        }

        throw error;
      } finally {
        if (session) {
          session.endSession();
        }
      }
    }

    throw new Error('Transaction aborted after exceeding maximum conflict retries');
  }

  private static async executeViewUpdate(options: {
    submissionId: string;
    newViews: number;
    customIdempotencyKey?: string;
    session: ClientSession | null;
  }): Promise<ViewUpdateResult> {
    const { submissionId, newViews, customIdempotencyKey, session } = options;
    const sessionOption = session ? { session } : {};

    // 1. Fetch submission
    const submission = await Submission.findById(submissionId, null, sessionOption);
    if (!submission) {
      throw new Error('Submission not found');
    }

    // 2. Fetch associated campaign
    const campaign = await Campaign.findById(submission.campaign, null, sessionOption);
    if (!campaign) {
      throw new Error('Associated campaign not found');
    }

    // Check campaign status: paused or completed campaigns do not process view rewards
    if (campaign.status !== 'live') {
      return {
        submission,
        payoutAllocatedPaise: 0,
        eligiblePayoutPaise: submission.eligiblePayoutPaise,
        paidAmountPaise: submission.paidAmountPaise,
        campaignSpentPaise: campaign.spentBudgetPaise,
        campaignRemainingPaise: Math.max(0, campaign.totalBudgetPaise - campaign.spentBudgetPaise),
        spikeDetected: submission.spikeDetected,
        message: `Campaign is currently ${campaign.status}. No payouts allocated.`,
      };
    }

    // 3. Stale update check / Views decrease policy
    // Policy: If incoming views are strictly lower than stored views, we preserve stored views
    // to prevent artificial regression or clawbacks.
    const effectiveViews = Math.max(submission.views, newViews);

    // 4. Spike detection check
    const isSpike = SpikeDetectionService.isSpike(
      submission.views,
      newViews,
      submission.lastPayoutProcessedAt,
    );
    if (isSpike) {
      submission.spikeDetected = true;
    }

    // 5. Calculate new eligible payout via pure calculation engine
    const { eligiblePayoutPaise } = calculateEligiblePayout(
      effectiveViews,
      campaign.milestones,
    );

    // Policy: Never claw back money. Eligible payout cannot drop below what was already paid.
    const safeEligiblePayoutPaise = Math.max(
      eligiblePayoutPaise,
      submission.eligiblePayoutPaise,
      submission.paidAmountPaise,
    );

    // 6. Calculate unpaid incremental eligible amount
    const previouslyPaidPaise = submission.paidAmountPaise;
    const incrementalEligiblePaise = Math.max(0, safeEligiblePayoutPaise - previouslyPaidPaise);

    // If views are updated without crossing any new milestone and no outstanding unpaid eligible amount
    if (incrementalEligiblePaise === 0) {
      submission.views = effectiveViews;
      submission.eligiblePayoutPaise = safeEligiblePayoutPaise;
      if (submission.paidAmountPaise >= safeEligiblePayoutPaise && safeEligiblePayoutPaise > 0) {
        submission.status = 'paid';
      }
      await submission.save(sessionOption);

      return {
        submission,
        payoutAllocatedPaise: 0,
        eligiblePayoutPaise: safeEligiblePayoutPaise,
        paidAmountPaise: submission.paidAmountPaise,
        campaignSpentPaise: campaign.spentBudgetPaise,
        campaignRemainingPaise: Math.max(0, campaign.totalBudgetPaise - campaign.spentBudgetPaise),
        spikeDetected: submission.spikeDetected,
        message: 'Views updated. No incremental payout required.',
      };
    }

    // 7. Atomic budget check and reservation
    // Available budget in campaign
    const availableBudgetPaise = Math.max(0, campaign.totalBudgetPaise - campaign.spentBudgetPaise);

    if (availableBudgetPaise === 0) {
      // Budget is completely exhausted! Record eligible amount, set status to partially_paid or pending
      submission.views = effectiveViews;
      submission.eligiblePayoutPaise = safeEligiblePayoutPaise;
      submission.status = submission.paidAmountPaise > 0 ? 'partially_paid' : 'pending';
      await submission.save(sessionOption);

      return {
        submission,
        payoutAllocatedPaise: 0,
        eligiblePayoutPaise: safeEligiblePayoutPaise,
        paidAmountPaise: submission.paidAmountPaise,
        campaignSpentPaise: campaign.spentBudgetPaise,
        campaignRemainingPaise: 0,
        spikeDetected: submission.spikeDetected,
        message: 'Campaign budget exhausted. Outstanding eligible payout recorded.',
      };
    }

    // Amount we can actually pay right now (clamped by remaining budget)
    const payableAmountPaise = Math.min(incrementalEligiblePaise, availableBudgetPaise);

    // 8. Atomically update campaign budget with safety guard
    const updatedCampaign = await Campaign.findOneAndUpdate(
      {
        _id: campaign._id,
        $expr: {
          $lte: [
            { $add: ['$spentBudgetPaise', payableAmountPaise] },
            '$totalBudgetPaise',
          ],
        },
      },
      {
        $inc: { spentBudgetPaise: payableAmountPaise },
      },
      {
        new: true,
        ...sessionOption,
      },
    );

    if (!updatedCampaign) {
      throw new Error('Concurrent budget contention: Available budget was exceeded');
    }

    // 9. Generate unique idempotency key for this payout event
    const idempotencyKey =
      customIdempotencyKey ||
      `payout_${submission._id}_v${effectiveViews}_paid${previouslyPaidPaise + payableAmountPaise}`;

    // 10. Record in PayoutLedger
    await PayoutLedger.create(
      [
        {
          submission: submission._id,
          campaign: campaign._id,
          creator: submission.creator,
          amountPaise: payableAmountPaise,
          eligiblePayoutBeforePaise: submission.eligiblePayoutPaise,
          eligiblePayoutAfterPaise: safeEligiblePayoutPaise,
          idempotencyKey,
        },
      ],
      sessionOption,
    );

    // 11. Update submission state
    submission.views = effectiveViews;
    submission.eligiblePayoutPaise = safeEligiblePayoutPaise;
    submission.paidAmountPaise = previouslyPaidPaise + payableAmountPaise;
    submission.lastPayoutProcessedAt = new Date();

    if (submission.paidAmountPaise >= safeEligiblePayoutPaise) {
      submission.status = 'paid';
    } else {
      submission.status = 'partially_paid';
    }

    await submission.save(sessionOption);

    return {
      submission,
      payoutAllocatedPaise: payableAmountPaise,
      eligiblePayoutPaise: safeEligiblePayoutPaise,
      paidAmountPaise: submission.paidAmountPaise,
      campaignSpentPaise: updatedCampaign.spentBudgetPaise,
      campaignRemainingPaise: Math.max(0, updatedCampaign.totalBudgetPaise - updatedCampaign.spentBudgetPaise),
      spikeDetected: submission.spikeDetected,
      message:
        payableAmountPaise === incrementalEligiblePaise
          ? `Payout of ${payableAmountPaise / 100} INR successfully allocated.`
          : `Partial payout of ${payableAmountPaise / 100} INR allocated (budget capped).`,
    };
  }
}
