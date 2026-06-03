import request from 'supertest';
import app from '../../app';
import { User } from '../../models/user.model';
import { ComplianceCase } from '../../models/compliance-case.model';
import { AdminAuditLog } from '../../models/admin-audit-log.model';
import './setup';

describe('Compliance API integration', () => {
  const adminEmail = 'compliance-admin@example.com';
  const adminPassword = 'ChangeMe123';

  const validCreatePayload = {
    name: 'Vendor Risk Review',
    survey: 'vendor-onboarding-q1',
    title: 'Suspicious registration spike',
    description: 'Multiple accounts created from the same IP range within minutes.',
    category: 'account_abuse',
    severity: 'high',
  };

  async function loginAsAdmin(): Promise<string> {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password: adminPassword })
      .expect(200);

    return response.body.data.accessToken as string;
  }

  beforeEach(async () => {
    await User.create({
      name: 'Compliance Admin',
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      provider: 'credentials',
    });
  });

  describe('POST /api/v1/admin/compliance/cases', () => {
    it('creates a case with name and survey', async () => {
      const accessToken = await loginAsAdmin();

      const response = await request(app)
        .post('/api/v1/admin/compliance/cases')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(validCreatePayload)
        .expect(201);

      expect(response.body.data).toMatchObject({
        name: validCreatePayload.name,
        survey: validCreatePayload.survey,
        title: validCreatePayload.title,
        category: validCreatePayload.category,
        severity: validCreatePayload.severity,
        status: 'open',
      });

      const savedCase = await ComplianceCase.findById(response.body.data._id).lean();
      expect(savedCase).toMatchObject({
        name: validCreatePayload.name,
        survey: validCreatePayload.survey,
      });

      const auditLog = await AdminAuditLog.findOne({
        action: 'compliance.case.created',
      }).lean();

      expect(auditLog?.metadata).toMatchObject({
        name: validCreatePayload.name,
        survey: validCreatePayload.survey,
      });
    });

    it('returns 400 when name is missing', async () => {
      const accessToken = await loginAsAdmin();
      const withoutName = { ...validCreatePayload };
      delete (withoutName as { name?: string }).name;

      const response = await request(app)
        .post('/api/v1/admin/compliance/cases')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(withoutName)
        .expect(400);

      expect(response.body.data).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'name' })])
      );
    });
  });

  describe('GET /api/v1/admin/compliance/cases/:id', () => {
    it('returns a case by id including name and survey', async () => {
      const accessToken = await loginAsAdmin();
      const adminUser = await User.findOne({ email: adminEmail }).lean();

      const createdCase = await ComplianceCase.create({
        name: validCreatePayload.name,
        survey: validCreatePayload.survey,
        title: validCreatePayload.title,
        description: validCreatePayload.description,
        category: validCreatePayload.category,
        severity: validCreatePayload.severity,
        status: 'open',
        createdByAdminId: adminUser?._id,
      });

      const response = await request(app)
        .get(`/api/v1/admin/compliance/cases/${String(createdCase._id)}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        _id: String(createdCase._id),
        name: validCreatePayload.name,
        survey: validCreatePayload.survey,
      });
    });
  });

  describe('PATCH /api/v1/admin/compliance/cases/:id', () => {
    it('updates name and survey with audit logging', async () => {
      const accessToken = await loginAsAdmin();
      const adminUser = await User.findOne({ email: adminEmail }).lean();

      const createdCase = await ComplianceCase.create({
        name: 'Initial Name',
        survey: 'initial-survey',
        title: validCreatePayload.title,
        description: validCreatePayload.description,
        category: validCreatePayload.category,
        severity: 'medium',
        status: 'open',
        createdByAdminId: adminUser?._id,
      });

      const response = await request(app)
        .patch(`/api/v1/admin/compliance/cases/${String(createdCase._id)}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Updated Vendor Name',
          survey: 'vendor-onboarding-q2',
          reason: 'Corrected survey reference after review',
        })
        .expect(200);

      expect(response.body.data).toMatchObject({
        name: 'Updated Vendor Name',
        survey: 'vendor-onboarding-q2',
      });

      const auditLog = await AdminAuditLog.findOne({
        action: 'compliance.case.updated',
      }).lean();

      expect(auditLog?.metadata).toMatchObject({
        caseId: String(createdCase._id),
        changes: expect.objectContaining({
          name: 'Updated Vendor Name',
          survey: 'vendor-onboarding-q2',
        }),
      });
    });

    it('clears survey when null is sent', async () => {
      const accessToken = await loginAsAdmin();
      const adminUser = await User.findOne({ email: adminEmail }).lean();

      const createdCase = await ComplianceCase.create({
        name: validCreatePayload.name,
        survey: validCreatePayload.survey,
        title: validCreatePayload.title,
        description: validCreatePayload.description,
        category: validCreatePayload.category,
        severity: 'low',
        status: 'open',
        createdByAdminId: adminUser?._id,
      });

      await request(app)
        .patch(`/api/v1/admin/compliance/cases/${String(createdCase._id)}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          survey: null,
          reason: 'Survey no longer applicable to this case',
        })
        .expect(200);

      const savedCase = await ComplianceCase.findById(createdCase._id).lean();
      expect(savedCase?.survey).toBeUndefined();
    });
  });
});
