import { Milestone } from '@memed/shared';

export interface PayoutCalculationResult {
  eligiblePayoutPaise: number;
  highestMilestoneReached: Milestone | null;
  nextMilestone: Milestone | null;
  viewsToNextMilestone: number | null;
}

/**
 * Pure function to calculate eligible payout based on views and milestones.
 *
 * Rules:
 * - Milestone thresholds and payouts must be valid non-negative numbers.
 * - Negative view counts or invalid inputs throw an error.
 * - Finds the highest milestone where milestone.views <= views.
 * - Returns that milestone's payout (NOT the sum of all milestones).
 * - Returns 0 if views are below the lowest milestone.
 * - Handles unsorted milestones safely by normalizing and sorting ascending.
 */
export function calculateEligiblePayout(
  views: number,
  milestones: Milestone[],
): PayoutCalculationResult {
  if (typeof views !== 'number' || isNaN(views) || !Number.isInteger(views) || views < 0) {
    throw new Error('Views must be a non-negative integer');
  }

  if (!Array.isArray(milestones) || milestones.length === 0) {
    return {
      eligiblePayoutPaise: 0,
      highestMilestoneReached: null,
      nextMilestone: null,
      viewsToNextMilestone: null,
    };
  }

  // Normalize, validate and sort milestones ascending by views
  const sortedMilestones = [...milestones].sort((a, b) => a.views - b.views);

  for (const m of sortedMilestones) {
    if (
      typeof m.views !== 'number' ||
      isNaN(m.views) ||
      m.views <= 0 ||
      typeof m.payoutPaise !== 'number' ||
      isNaN(m.payoutPaise) ||
      m.payoutPaise < 0
    ) {
      throw new Error('Milestones must have positive views and non-negative payoutPaise');
    }
  }

  let highestReached: Milestone | null = null;
  let nextMilestone: Milestone | null = null;

  for (const m of sortedMilestones) {
    if (views >= m.views) {
      highestReached = m;
    } else {
      if (!nextMilestone) {
        nextMilestone = m;
      }
    }
  }

  const eligiblePayoutPaise = highestReached ? highestReached.payoutPaise : 0;
  const viewsToNextMilestone = nextMilestone ? Math.max(0, nextMilestone.views - views) : null;

  return {
    eligiblePayoutPaise,
    highestMilestoneReached: highestReached,
    nextMilestone,
    viewsToNextMilestone,
  };
}
