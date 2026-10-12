import { setupTestDatabase, clearTestDatabase, teardownTestDatabase } from '../setup';
import { User, Campaign, Submission, PayoutLedger } from '../../src/models';
import { PayoutService } from '../../src/services/payoutService';
import { rupeesToPaise } from '@memed/shared';

describe('Budget Safety and Idempotency Integration Tests', () => {
  let brandId: string;
  let creatorId: string;
  let campaignId: string;
  let submissionId: string;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();

    const brand = await User.create({
      name: 'Test Brand',
      email: 'brand@test.com',
      passwordHash: 'dummyhash',
      role: 'brand',
    });
    brandId = brand._id.toString();

    const creator = await User.create({
      name: 'Test Creator',
      email: 'creator@test.com',
      passwordHash: 'dummyhash',
      role: 'creator',
    });
    creatorId = creator._id.toString();

    // Campaign with total budget ₹5,000 (500,000 paise)
    // Ladder: 10,000 views -> ₹1,000 (100,000 paise)
    //         50,000 views -> ₹3,000 (300,000 paise)
    //         100,000 views -> ₹6,000 (600,000 paise)
    const campaign = await Campaign.create({
      name: 'Summer Meme Blitz',
      platform: 'instagram',
      totalBudgetPaise: rupeesToPaise(5000), // 500,000 paise
      spentBudgetPaise: 0,
      milestones: [
        { views: 10000, payoutPaise: rupeesToPaise(1000) },
        { views: 50000, payoutPaise: rupeesToPaise(3000) },
        { views: 100000, payoutPaise: rupeesToPaise(6000) },
      ],
      brand: brandId,
      status: 'live',
    });
    campaignId = campaign._id.toString();

    const submission = await Submission.create({
      campaign: campaignId,
      creator: creatorId,
      postUrl: 'https://instagram.com/reel/C123abc/',
      views: 0,
      eligiblePayoutPaise: 0,
      paidAmountPaise: 0,
      status: 'pending',
    });
    submissionId = submission._id.toString();
  });

  it('1. Full payout when sufficient budget exists', async () => {
    // 15,000 views reaches first milestone: ₹1,000 (100,000 paise)
    const result = await PayoutService.processViewUpdate(submissionId, 15000);

    expect(result.payoutAllocatedPaise).toBe(100000);
    expect(result.paidAmountPaise).toBe(100000);
    expect(result.eligiblePayoutPaise).toBe(100000);
    expect(result.submission.status).toBe('paid');
    expect(result.campaignSpentPaise).toBe(100000);
    expect(result.campaignRemainingPaise).toBe(400000);

    // Verify ledger
    const ledgers = await PayoutLedger.find({ submission: submissionId });
    expect(ledgers.length).toBe(1);
    expect(ledgers[0].amountPaise).toBe(100000);
  });

  it('2. Repeated update with same or intermediate views does not double-pay', async () => {
    await PayoutService.processViewUpdate(submissionId, 15000);

    // Call again with same 15,000 views
    const repeatResult = await PayoutService.processViewUpdate(submissionId, 15000);
    expect(repeatResult.payoutAllocatedPaise).toBe(0);
    expect(repeatResult.paidAmountPaise).toBe(100000);

    // Call again with 25,000 views (still within 10k - 50k milestone bracket)
    const intermediateResult = await PayoutService.processViewUpdate(submissionId, 25000);
    expect(intermediateResult.payoutAllocatedPaise).toBe(0);
    expect(intermediateResult.paidAmountPaise).toBe(100000);

    const ledgers = await PayoutLedger.find({ submission: submissionId });
    expect(ledgers.length).toBe(1); // Still exactly 1 ledger entry!
  });

  it('3. Incremental milestone transition pays only the difference, not the total or sum', async () => {
    // Milestone 1 (10k views -> ₹1,000)
    await PayoutService.processViewUpdate(submissionId, 15000);

    // Milestone 2 (50k views -> ₹3,000)
    // Creator was already paid ₹1,000. New highest is ₹3,000. Incremental payout must be ₹2,000 (200,000 paise).
    const result2 = await PayoutService.processViewUpdate(submissionId, 55000);

    expect(result2.payoutAllocatedPaise).toBe(200000);
    expect(result2.paidAmountPaise).toBe(300000); // Total paid is now ₹3,000
    expect(result2.eligiblePayoutPaise).toBe(300000);
    expect(result2.campaignSpentPaise).toBe(300000);
    expect(result2.campaignRemainingPaise).toBe(200000);

    const ledgers = await PayoutLedger.find({ submission: submissionId });
    expect(ledgers.length).toBe(2);
  });

  it('4. Partial payout when only part of the eligible amount remains (budget cap protection)', async () => {
    // Campaign total budget is ₹5,000 (500,000 paise).
    // Let's directly hit 100,000 views (milestone payout is ₹6,000 = 600,000 paise).
    // Since only ₹5,000 is in the budget, it must pay ₹5,000 and clamp!
    const result = await PayoutService.processViewUpdate(submissionId, 100000);

    expect(result.payoutAllocatedPaise).toBe(500000); // Clamped to available budget
    expect(result.paidAmountPaise).toBe(500000);
    expect(result.eligiblePayoutPaise).toBe(600000); // Full eligible recorded
    expect(result.submission.status).toBe('partially_paid');
    expect(result.campaignSpentPaise).toBe(500000);
    expect(result.campaignRemainingPaise).toBe(0);

    // Campaign spending strictly equals budget
    const campaign = await Campaign.findById(campaignId);
    expect(campaign!.spentBudgetPaise).toBe(campaign!.totalBudgetPaise);
  });

  it('5. No payout when budget is exhausted', async () => {
    // Exhaust budget first
    await PayoutService.processViewUpdate(submissionId, 100000);

    // Create a 2nd submission from another creator
    const creator2 = await User.create({
      name: 'Creator 2',
      email: 'creator2@test.com',
      passwordHash: 'dummy',
      role: 'creator',
    });
    const sub2 = await Submission.create({
      campaign: campaignId,
      creator: creator2._id,
      postUrl: 'https://instagram.com/reel/C999xyz/',
      views: 0,
      eligiblePayoutPaise: 0,
      paidAmountPaise: 0,
      status: 'pending',
    });

    // Creator 2 updates views to 15,000 (eligible for ₹1,000)
    const result2 = await PayoutService.processViewUpdate(sub2._id.toString(), 15000);

    expect(result2.payoutAllocatedPaise).toBe(0);
    expect(result2.paidAmountPaise).toBe(0);
    expect(result2.eligiblePayoutPaise).toBe(100000);
    expect(result2.submission.status).toBe('pending');
    expect(result2.campaignSpentPaise).toBe(500000);
    expect(result2.campaignRemainingPaise).toBe(0);
  });

  it('6. Decreasing views do not claw back already paid funds', async () => {
    // Reach 50k views -> ₹3,000 paid
    await PayoutService.processViewUpdate(submissionId, 50000);

    // Incoming views drops to 5,000 (e.g. platform recalculation or stale event)
    const result = await PayoutService.processViewUpdate(submissionId, 5000);

    expect(result.paidAmountPaise).toBe(300000); // Remains ₹3,000
    expect(result.eligiblePayoutPaise).toBe(300000);
    expect(result.submission.views).toBe(50000); // Preserves highest confirmed views
    expect(result.payoutAllocatedPaise).toBe(0);

    const campaign = await Campaign.findById(campaignId);
    expect(campaign!.spentBudgetPaise).toBe(300000);
  });

  it('7. Later budget increase reconciles outstanding eligible amounts', async () => {
    // 100k views -> ₹6,000 eligible, but only ₹5,000 paid due to budget
    await PayoutService.processViewUpdate(submissionId, 100000);

    let sub = await Submission.findById(submissionId);
    expect(sub!.paidAmountPaise).toBe(500000);
    expect(sub!.eligiblePayoutPaise).toBe(600000);
    expect(sub!.status).toBe('partially_paid');

    // Brand adds ₹2,000 more to the campaign budget
    await Campaign.findByIdAndUpdate(campaignId, {
      $inc: { totalBudgetPaise: rupeesToPaise(2000) },
    });

    // Next view update event reconciles the remaining ₹1,000 (100,000 paise)
    const reconcileResult = await PayoutService.processViewUpdate(submissionId, 100000);

    expect(reconcileResult.payoutAllocatedPaise).toBe(100000);
    expect(reconcileResult.paidAmountPaise).toBe(600000);
    expect(reconcileResult.submission.status).toBe('paid');

    const updatedCampaign = await Campaign.findById(campaignId);
    expect(updatedCampaign!.spentBudgetPaise).toBe(600000);
  });
});
