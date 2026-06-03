import request from 'supertest';
import app from '../../app';
import { AppealRequest } from '../../models/appeal-request.model';
import { User } from '../../models/user.model';
import { emailService } from '../../services/email.service';
import './setup';

describe('Admin appeal status email integration', () => {
  const adminEmail = 'appeal-admin@example.com';
  const adminPassword = 'ChangeMe123';

  async function loginAsAdmin(): Promise<string> {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password: adminPassword })
      .expect(200);

    return response.body.data.accessToken as string;
  }

  beforeEach(async () => {
    await User.create({
      name: 'Appeal Platform Admin',
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      provider: 'credentials',
    });
  });

  it.each([
    {
      status: 'submitted',
      expectedSubject: 'We received your EventForge appeal',
      expectedBody: 'Current status: Submitted',
    },
    {
      status: 'in_review',
      expectedSubject: 'Your EventForge appeal is now in review',
      expectedBody: 'Current status: In review',
    },
    {
      status: 'resolved',
      expectedSubject: 'Your EventForge appeal has been resolved',
      expectedBody: 'Current status: Resolved',
    },
    {
      status: 'rejected',
      expectedSubject: 'Update on your EventForge appeal',
      expectedBody: 'Current status: Rejected',
    },
  ])('sends status email when admin updates appeal to $status', async (testCase) => {
    const sendTextEmailSpy = jest
      .spyOn(emailService, 'sendTextEmail')
      .mockResolvedValue({ messageId: `appeal-email-${testCase.status}` });

    const appeal = await AppealRequest.create({
      referenceCode: `APR-TEST-${testCase.status.toUpperCase()}`,
      fullName: 'Appeal User',
      workEmail: 'appeal.user@example.com',
      company: 'EventForge QA',
      accountEmail: 'appeal.account@example.com',
      issueType: 'policy_warning',
      timeline: 'Timeline details for the appeal request flow.',
      whatHappened: 'This is a detailed explanation about what happened to the account recently.',
      correctiveActions:
        'This includes detailed corrective actions and policy improvements already taken.',
      evidenceLinks: ['https://example.com/evidence/1'],
      consent: true,
      source: 'public-website',
      status: 'submitted',
    });

    const accessToken = await loginAsAdmin();

    const response = await request(app)
      .patch(`/api/v1/appeals/admin/${String(appeal._id)}/status`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: testCase.status })
      .expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: 'Appeal request status updated successfully',
      data: {
        _id: String(appeal._id),
        status: testCase.status,
      },
    });

    expect(sendTextEmailSpy).toHaveBeenCalledTimes(1);
    expect(sendTextEmailSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'appeal.user@example.com',
        subject: testCase.expectedSubject,
        text: expect.stringContaining(testCase.expectedBody),
        html: expect.stringContaining('Appeal status update'),
      })
    );

    sendTextEmailSpy.mockRestore();
  });
});
