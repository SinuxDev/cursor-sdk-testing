import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../app';
import { AppealRequest } from '../../models/appeal-request.model';
import { User } from '../../models/user.model';

describe('Appeal request integration (persistent db)', () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sinux-boilerplate';

  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }

    try {
      await mongoose.connection.collection('users').dropIndex('phoneNumber_1');
    } catch {
      // Ignore when index does not exist.
    }
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  async function loginAndGetToken(email: string, password: string): Promise<string> {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    return response.body.data.accessToken as string;
  }

  it('creates public appeal and supports admin listing + status update', async () => {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const adminEmail = `admin.appeal.${suffix}@example.com`;
    const workEmail = `appeal.work.${suffix}@example.com`;
    const accountEmail = `appeal.account.${suffix}@example.com`;

    await User.create({
      name: 'Appeal Admin',
      email: adminEmail,
      password: 'Password1',
      role: 'admin',
      provider: 'credentials',
    });

    const createResponse = await request(app)
      .post('/api/v1/appeals')
      .send({
        fullName: 'Appeal Test User',
        workEmail,
        company: 'EventForge Labs',
        accountEmail,
        issueType: 'policy_warning',
        timeline: 'On Monday our team account got a policy warning after a content review cycle.',
        whatHappened:
          'We received a warning after publishing an event page and we believe the policy trigger was inaccurate for the posted details.',
        correctiveActions:
          'We reviewed the policy guidelines, updated event copy, removed questionable terms, and implemented a second review step before publishing.',
        evidenceLinks: ['https://example.com/evidence/policy-warning'],
        consent: true,
        source: 'public-website',
      })
      .expect(201);

    expect(createResponse.body.success).toBe(true);
    expect(createResponse.body.data).toMatchObject({
      referenceCode: expect.stringMatching(/^APR-/),
    });

    const createdAppeal = await AppealRequest.findOne({ workEmail }).lean();
    expect(createdAppeal).toBeTruthy();
    expect(createdAppeal).toMatchObject({
      workEmail,
      accountEmail,
      status: 'submitted',
      issueType: 'policy_warning',
    });

    const adminToken = await loginAndGetToken(adminEmail, 'Password1');

    const listResponse = await request(app)
      .get('/api/v1/appeals/admin')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ status: 'submitted', q: workEmail })
      .expect(200);

    expect(listResponse.body.success).toBe(true);
    expect(Array.isArray(listResponse.body.data.data)).toBe(true);
    expect(listResponse.body.data.data.length).toBeGreaterThan(0);
    expect(listResponse.body.data.data[0]).toMatchObject({
      workEmail,
      status: 'submitted',
    });

    const appealId = String(listResponse.body.data.data[0]._id);

    const updateResponse = await request(app)
      .patch(`/api/v1/appeals/admin/${appealId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'in_review' })
      .expect(200);

    expect(updateResponse.body.success).toBe(true);
    expect(updateResponse.body.data).toMatchObject({
      _id: appealId,
      status: 'in_review',
      workEmail,
    });
  });
});
