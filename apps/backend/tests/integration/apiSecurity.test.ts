import request from 'supertest';
import { setupTestDatabase, clearTestDatabase, teardownTestDatabase } from '../setup';
import { createApp } from '../../src/app';
import { Campaign, Submission } from '../../src/models';
import { rupeesToPaise } from '@memed/shared';

describe('API and Security Integration Tests', () => {
  const app = createApp();

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  it('handles signup and login flows with proper validation', async () => {
    // 1. Signup brand
    const signupRes = await request(app).post('/api/auth/signup').send({
      name: 'Acme Brand',
      email: 'acme@test.com',
      password: 'password123',
      role: 'brand',
    });
    expect(signupRes.status).toBe(201);
    expect(signupRes.body.success).toBe(true);
    expect(signupRes.body.data.user.email).toBe('acme@test.com');
    expect(signupRes.body.data.user.passwordHash).toBeUndefined();

    // 2. Duplicate signup rejected
    const dupRes = await request(app).post('/api/auth/signup').send({
      name: 'Acme Brand 2',
      email: 'acme@test.com',
      password: 'password123',
      role: 'brand',
    });
    expect(dupRes.status).toBe(409);

    // 3. Login with correct credentials
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'acme@test.com',
      password: 'password123',
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.token).toBeDefined();

    // 4. Login with invalid password
    const badLoginRes = await request(app).post('/api/auth/login').send({
      email: 'acme@test.com',
      password: 'wrongpassword',
    });
    expect(badLoginRes.status).toBe(401);
  });

  it('enforces role-based authorization: Creator cannot create campaign, Brand cannot submit post', async () => {
    // Register creator
    const creatorRes = await request(app).post('/api/auth/signup').send({
      name: 'Creator One',
      email: 'creator1@test.com',
      password: 'password123',
      role: 'creator',
    });
    const creatorToken = creatorRes.body.data.token;

    // Register brand
    const brandRes = await request(app).post('/api/auth/signup').send({
      name: 'Brand One',
      email: 'brand1@test.com',
      password: 'password123',
      role: 'brand',
    });
    const brandToken = brandRes.body.data.token;

    // Creator attempts to create a campaign -> 403 Forbidden
    const createCampRes = await request(app)
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        name: 'Forbidden Campaign',
        platform: 'instagram',
        totalBudgetPaise: rupeesToPaise(10000),
        milestones: [{ views: 10000, payoutPaise: rupeesToPaise(500) }],
      });
    expect(createCampRes.status).toBe(403);

    // Brand creates campaign -> 201 Created
    const validCampRes = await request(app)
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${brandToken}`)
      .send({
        name: 'Authorized Campaign',
        platform: 'instagram',
        totalBudgetPaise: rupeesToPaise(10000),
        milestones: [{ views: 10000, payoutPaise: rupeesToPaise(500) }],
      });
    expect(validCampRes.status).toBe(201);
    const campaignId = validCampRes.body.data.id;

    // Brand attempts to submit post -> 403 Forbidden (creator only)
    const brandSubmitRes = await request(app)
      .post(`/api/campaigns/${campaignId}/submissions`)
      .set('Authorization', `Bearer ${brandToken}`)
      .send({
        postUrl: 'https://instagram.com/reel/C123456/',
      });
    expect(brandSubmitRes.status).toBe(403);

    // Creator submits post -> 201 Created
    const creatorSubmitRes = await request(app)
      .post(`/api/campaigns/${campaignId}/submissions`)
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        postUrl: 'https://instagram.com/reel/C123456/',
      });
    expect(creatorSubmitRes.status).toBe(201);
  });

  it('validates submission URL against campaign platform (Instagram vs YouTube)', async () => {
    const brandRes = await request(app).post('/api/auth/signup').send({
      name: 'Brand One',
      email: 'brand2@test.com',
      password: 'password123',
      role: 'brand',
    });
    const brandToken = brandRes.body.data.token;

    const creatorRes = await request(app).post('/api/auth/signup').send({
      name: 'Creator One',
      email: 'creator2@test.com',
      password: 'password123',
      role: 'creator',
    });
    const creatorToken = creatorRes.body.data.token;

    // Create YouTube campaign
    const campRes = await request(app)
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${brandToken}`)
      .send({
        name: 'YouTube Shorts Blitz',
        platform: 'youtube',
        totalBudgetPaise: rupeesToPaise(20000),
        milestones: [{ views: 10000, payoutPaise: rupeesToPaise(1000) }],
      });
    const campaignId = campRes.body.data.id;

    // Try submitting Instagram URL to YouTube campaign -> 400 Bad Request
    const badUrlRes = await request(app)
      .post(`/api/campaigns/${campaignId}/submissions`)
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        postUrl: 'https://instagram.com/p/C987654/',
      });
    expect(badUrlRes.status).toBe(400);
    expect(badUrlRes.body.error).toContain('Invalid post URL for platform');

    // Submit valid YouTube URL -> 201 Created
    const goodUrlRes = await request(app)
      .post(`/api/campaigns/${campaignId}/submissions`)
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({
        postUrl: 'https://youtube.com/shorts/dQw4w9WgXcQ',
      });
    expect(goodUrlRes.status).toBe(201);
  });

  it('prevents creator from accessing another creator’s private submission', async () => {
    // Creator 1
    const c1Res = await request(app).post('/api/auth/signup').send({
      name: 'Creator 1',
      email: 'c1@test.com',
      password: 'password123',
      role: 'creator',
    });
    const c1Token = c1Res.body.data.token;

    // Creator 2
    const c2Res = await request(app).post('/api/auth/signup').send({
      name: 'Creator 2',
      email: 'c2@test.com',
      password: 'password123',
      role: 'creator',
    });
    const c2Token = c2Res.body.data.token;

    // Brand
    const bRes = await request(app).post('/api/auth/signup').send({
      name: 'Brand',
      email: 'b@test.com',
      password: 'password123',
      role: 'brand',
    });
    const bToken = bRes.body.data.token;

    const campRes = await request(app)
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${bToken}`)
      .send({
        name: 'Private Test Campaign',
        platform: 'instagram',
        totalBudgetPaise: rupeesToPaise(5000),
        milestones: [{ views: 10000, payoutPaise: rupeesToPaise(500) }],
      });
    const campaignId = campRes.body.data.id;

    // C1 submits
    const subRes = await request(app)
      .post(`/api/campaigns/${campaignId}/submissions`)
      .set('Authorization', `Bearer ${c1Token}`)
      .send({
        postUrl: 'https://instagram.com/reel/C11111/',
      });
    const submissionId = subRes.body.data.id;

    // C2 tries to read C1's submission -> 403 Forbidden
    const unauthReadRes = await request(app)
      .get(`/api/submissions/${submissionId}`)
      .set('Authorization', `Bearer ${c2Token}`);
    expect(unauthReadRes.status).toBe(403);

    // C1 reads own submission -> 200 OK
    const authReadRes = await request(app)
      .get(`/api/submissions/${submissionId}`)
      .set('Authorization', `Bearer ${c1Token}`);
    expect(authReadRes.status).toBe(200);
  });

  it('preserves required exception: PATCH /api/submissions/:id/views does NOT require a role check', async () => {
    // Brand
    const bRes = await request(app).post('/api/auth/signup').send({
      name: 'Brand',
      email: 'b2@test.com',
      password: 'password123',
      role: 'brand',
    });
    const bToken = bRes.body.data.token;

    // Creator
    const cRes = await request(app).post('/api/auth/signup').send({
      name: 'Creator',
      email: 'c3@test.com',
      password: 'password123',
      role: 'creator',
    });
    const cToken = cRes.body.data.token;

    const campRes = await request(app)
      .post('/api/campaigns')
      .set('Authorization', `Bearer ${bToken}`)
      .send({
        name: 'Simulated Views Campaign',
        platform: 'instagram',
        totalBudgetPaise: rupeesToPaise(10000),
        milestones: [{ views: 10000, payoutPaise: rupeesToPaise(500) }],
      });
    const campaignId = campRes.body.data.id;

    const subRes = await request(app)
      .post(`/api/campaigns/${campaignId}/submissions`)
      .set('Authorization', `Bearer ${cToken}`)
      .send({
        postUrl: 'https://instagram.com/reel/C22222/',
      });
    const submissionId = subRes.body.data.id;

    // Request WITHOUT any Authorization token header
    const updateViewsRes = await request(app)
      .patch(`/api/submissions/${submissionId}/views`)
      .send({ views: 12000 });

    expect(updateViewsRes.status).toBe(200);
    expect(updateViewsRes.body.success).toBe(true);
    expect(updateViewsRes.body.data.views).toBe(12000);
    expect(updateViewsRes.body.data.paidAmountPaise).toBe(50000); // ₹500 paid
  });
});
