import { setupTestDatabase, clearTestDatabase, teardownTestDatabase } from '../setup';
import { User, Campaign, Submission, PayoutLedger } from '../../src/models';
import { PayoutService } from '../../src/services/payoutService';
import { rupeesToPaise } from '@memed/shared';

describe('Concurrency and Race Condition Tests', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  it('guarantees two simultaneous updates to the same submission do not double-pay', async () => {
    const brand = await User.create({
      name: 'Brand Concurrent',
      email: 'bc@test.com',
      passwordHash: 'dummy',
      role: 'brand',
    });

    const creator = await User.create({
      name: 'Creator Concurrent',
      email: 'cc@test.com',
      passwordHash: 'dummy',
      role: 'creator',
    });

    // Campaign with ₹5,000 budget
    const campaign = await Campaign.create({
      name: 'Concurrency Test Campaign',
      platform: 'instagram',
      totalBudgetPaise: rupeesToPaise(5000),
      spentBudgetPaise: 0,
      milestones: [
        { views: 10000, payoutPaise: rupeesToPaise(1000) },
        { views: 50000, payoutPaise: rupeesToPaise(3000) },
      ],
      brand: brand._id,
      status: 'live',
    });

    const submission = await Submission.create({
      campaign: campaign._id,
      creator: creator._id,
      postUrl: 'https://instagram.com/reel/Cconcur123/',
      views: 0,
      eligiblePayoutPaise: 0,
      paidAmountPaise: 0,
      status: 'pending',
    });

    const submissionId = submission._id.toString();

    // Fire 2 concurrent updates for the exact same submission to 10,000 views
    const [res1, res2] = await Promise.all([
      PayoutService.processViewUpdate(submissionId, 10000),
      PayoutService.processViewUpdate(submissionId, 10000),
    ]);

    // Re-fetch database state
    const updatedSub = await Submission.findById(submissionId);
    const updatedCamp = await Campaign.findById(campaign._id);
    const ledgers = await PayoutLedger.find({ submission: submission._id });

    // Payout should strictly be ₹1,000 (100,000 paise), never ₹2,000
    expect(updatedSub!.paidAmountPaise).toBe(100000);
    expect(updatedCamp!.spentBudgetPaise).toBe(100000);

    // Sum of ledgers must equal campaign spent budget
    const totalLedgerAllocated = ledgers.reduce((acc, l) => acc + l.amountPaise, 0);
    expect(totalLedgerAllocated).toBe(updatedCamp!.spentBudgetPaise);
    expect(totalLedgerAllocated).toBe(100000);
  });

  it('guarantees simultaneous updates across different submissions cannot exceed total campaign budget', async () => {
    const brand = await User.create({
      name: 'Brand Overspend',
      email: 'bo@test.com',
      passwordHash: 'dummy',
      role: 'brand',
    });

    // Campaign has total budget of only ₹1,500 (150,000 paise)
    const campaign = await Campaign.create({
      name: 'Limited Budget Campaign',
      platform: 'instagram',
      totalBudgetPaise: rupeesToPaise(1500),
      spentBudgetPaise: 0,
      milestones: [
        { views: 10000, payoutPaise: rupeesToPaise(1000) }, // ₹1,000 each
      ],
      brand: brand._id,
      status: 'live',
    });

    // Two different creators
    const creatorA = await User.create({
      name: 'Creator A',
      email: 'ca@test.com',
      passwordHash: 'dummy',
      role: 'creator',
    });

    const creatorB = await User.create({
      name: 'Creator B',
      email: 'cb@test.com',
      passwordHash: 'dummy',
      role: 'creator',
    });

    const subA = await Submission.create({
      campaign: campaign._id,
      creator: creatorA._id,
      postUrl: 'https://instagram.com/reel/CsubA/',
      views: 0,
      status: 'pending',
    });

    const subB = await Submission.create({
      campaign: campaign._id,
      creator: creatorB._id,
      postUrl: 'https://instagram.com/reel/CsubB/',
      views: 0,
      status: 'pending',
    });

    // Both creators simultaneously hit 10,000 views (total demand = ₹2,000, but budget is only ₹1,500)
    await Promise.allSettled([
      PayoutService.processViewUpdate(subA._id.toString(), 10000),
      PayoutService.processViewUpdate(subB._id.toString(), 10000),
    ]);

    const updatedCamp = await Campaign.findById(campaign._id);
    const ledgers = await PayoutLedger.find({ campaign: campaign._id });

    // Crucial financial assertion: spent budget must NEVER exceed total budget
    expect(updatedCamp!.spentBudgetPaise).toBeLessThanOrEqual(updatedCamp!.totalBudgetPaise);

    const totalLedgerAllocated = ledgers.reduce((acc, l) => acc + l.amountPaise, 0);
    expect(totalLedgerAllocated).toBe(updatedCamp!.spentBudgetPaise);
    expect(totalLedgerAllocated).toBeLessThanOrEqual(rupeesToPaise(1500));
  });
});
