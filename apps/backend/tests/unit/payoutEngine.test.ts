import { calculateEligiblePayout } from '../../src/services/payoutEngine';
import { Milestone, rupeesToPaise } from '@memed/shared';

describe('Payout Engine - calculateEligiblePayout', () => {
  const ladder: Milestone[] = [
    { views: 10000, payoutPaise: rupeesToPaise(500) }, // 50,000 paise (₹500)
    { views: 50000, payoutPaise: rupeesToPaise(2000) }, // 200,000 paise (₹2,000)
    { views: 100000, payoutPaise: rupeesToPaise(5000) }, // 500,000 paise (₹5,000)
  ];

  it('returns 0 paise when view count is below the first milestone', () => {
    const result = calculateEligiblePayout(5000, ladder);
    expect(result.eligiblePayoutPaise).toBe(0);
    expect(result.highestMilestoneReached).toBeNull();
    expect(result.nextMilestone).toEqual(ladder[0]);
    expect(result.viewsToNextMilestone).toBe(5000);
  });

  it('returns exact first milestone payout when exactly reaching 10,000 views', () => {
    const result = calculateEligiblePayout(10000, ladder);
    expect(result.eligiblePayoutPaise).toBe(50000); // ₹500 in paise
    expect(result.highestMilestoneReached?.views).toBe(10000);
    expect(result.nextMilestone?.views).toBe(50000);
    expect(result.viewsToNextMilestone).toBe(40000);
  });

  it('returns second milestone payout when views are between second and third milestone (60,000 views)', () => {
    const result = calculateEligiblePayout(60000, ladder);
    expect(result.eligiblePayoutPaise).toBe(200000); // ₹2,000 in paise
    expect(result.highestMilestoneReached?.views).toBe(50000);
    expect(result.nextMilestone?.views).toBe(100000);
    expect(result.viewsToNextMilestone).toBe(40000);
  });

  it('returns highest milestone payout (not the sum) when views exceed highest milestone (150,000 views)', () => {
    const result = calculateEligiblePayout(150000, ladder);
    // Highest is ₹5,000 (500,000 paise), NOT 500 + 2000 + 5000 = 7500!
    expect(result.eligiblePayoutPaise).toBe(500000);
    expect(result.highestMilestoneReached?.views).toBe(100000);
    expect(result.nextMilestone).toBeNull();
    expect(result.viewsToNextMilestone).toBeNull();
  });

  it('handles multiple milestones crossed in a single leap from 0 views', () => {
    const result = calculateEligiblePayout(120000, ladder);
    expect(result.eligiblePayoutPaise).toBe(500000);
    expect(result.highestMilestoneReached?.views).toBe(100000);
  });

  it('handles unsorted milestones safely by sorting ascending before calculating', () => {
    const unsortedLadder: Milestone[] = [
      { views: 100000, payoutPaise: 500000 },
      { views: 10000, payoutPaise: 50000 },
      { views: 50000, payoutPaise: 200000 },
    ];
    const result = calculateEligiblePayout(75000, unsortedLadder);
    expect(result.eligiblePayoutPaise).toBe(200000);
    expect(result.highestMilestoneReached?.views).toBe(50000);
  });

  it('returns 0 when milestones array is empty', () => {
    const result = calculateEligiblePayout(50000, []);
    expect(result.eligiblePayoutPaise).toBe(0);
    expect(result.highestMilestoneReached).toBeNull();
  });

  it('throws an error for negative view counts', () => {
    expect(() => calculateEligiblePayout(-100, ladder)).toThrow(
      'Views must be a non-negative integer',
    );
  });

  it('throws an error for non-integer or NaN view counts', () => {
    expect(() => calculateEligiblePayout(10.5, ladder)).toThrow(
      'Views must be a non-negative integer',
    );
    expect(() => calculateEligiblePayout(NaN, ladder)).toThrow(
      'Views must be a non-negative integer',
    );
  });

  it('throws an error for invalid milestone data', () => {
    const malformedLadder: Milestone[] = [
      { views: -100, payoutPaise: 5000 },
    ];
    expect(() => calculateEligiblePayout(1000, malformedLadder)).toThrow();
  });
});
