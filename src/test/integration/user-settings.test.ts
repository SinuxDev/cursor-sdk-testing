import request from 'supertest';
import app from '../../app';
import { AdminAuditLog } from '../../models/admin-audit-log.model';
import { User } from '../../models/user.model';
import './setup';

describe('User settings integration', () => {
  async function loginAndGetToken(email: string, password: string): Promise<string> {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    return response.body.data.accessToken as string;
  }

  async function createUserAndToken(input: {
    name: string;
    email: string;
    password: string;
    role: 'attendee' | 'organizer' | 'admin';
  }): Promise<string> {
    await User.create({
      name: input.name,
      email: input.email,
      password: input.password,
      role: input.role,
      provider: 'credentials',
    });

    return loginAndGetToken(input.email, input.password);
  }

  it('allows attendee to update profile/preferences/attendee settings and blocks organizer/admin settings', async () => {
    const token = await createUserAndToken({
      name: 'Attendee User',
      email: 'attendee.settings@example.com',
      password: 'Password1',
      role: 'attendee',
    });

    const snapshotResponse = await request(app)
      .get('/api/v1/settings/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(snapshotResponse.body.success).toBe(true);
    expect(snapshotResponse.body.data.profile).toMatchObject({
      email: 'attendee.settings@example.com',
      role: 'attendee',
    });

    const profileResponse = await request(app)
      .patch('/api/v1/settings/me/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Attendee Updated',
        avatar: 'https://cdn.example.com/avatar-attendee.png',
      })
      .expect(200);

    expect(profileResponse.body.data).toMatchObject({
      name: 'Attendee Updated',
      avatar: 'https://cdn.example.com/avatar-attendee.png',
    });

    const preferencesResponse = await request(app)
      .patch('/api/v1/settings/me/preferences')
      .set('Authorization', `Bearer ${token}`)
      .send({
        timezone: 'Asia/Yangon',
        locale: 'en-MM',
        notifications: {
          eventReminders: false,
          eventUpdates: true,
        },
      })
      .expect(200);

    expect(preferencesResponse.body.data).toMatchObject({
      timezone: 'Asia/Yangon',
      locale: 'en-MM',
      notifications: expect.objectContaining({
        eventReminders: false,
        eventUpdates: true,
      }),
    });

    const attendeeSettingsResponse = await request(app)
      .patch('/api/v1/settings/me/attendee')
      .set('Authorization', `Bearer ${token}`)
      .send({
        interests: ['music', 'technology'],
        preferredAttendanceModes: ['online', 'hybrid'],
        directMessagesEnabled: false,
      })
      .expect(200);

    expect(attendeeSettingsResponse.body.data).toMatchObject({
      interests: ['music', 'technology'],
      preferredAttendanceModes: ['online', 'hybrid'],
      directMessagesEnabled: false,
    });

    const organizerDenied = await request(app)
      .patch('/api/v1/settings/me/organizer')
      .set('Authorization', `Bearer ${token}`)
      .send({ organizationName: 'No Access Org' })
      .expect(403);

    expect(organizerDenied.body).toMatchObject({
      success: false,
      message: 'Only organizer or admin users can update organizer settings',
    });

    const adminDenied = await request(app)
      .patch('/api/v1/settings/me/admin')
      .set('Authorization', `Bearer ${token}`)
      .send({ requireMfaForAdmins: true })
      .expect(403);

    expect(adminDenied.body).toMatchObject({
      success: false,
      message: 'Only admins can update admin settings',
    });
  });

  it('allows organizer to update organizer settings and blocks admin settings', async () => {
    const token = await createUserAndToken({
      name: 'Organizer User',
      email: 'organizer.settings@example.com',
      password: 'Password1',
      role: 'organizer',
    });

    const organizerResponse = await request(app)
      .patch('/api/v1/settings/me/organizer')
      .set('Authorization', `Bearer ${token}`)
      .send({
        organizationName: 'EventForge Organizers',
        supportEmail: 'support@eventforge.test',
        defaultEventTimezone: 'Asia/Yangon',
        defaultCurrency: 'MMK',
        payout: {
          accountLast4: '1234',
          payoutSchedule: 'weekly',
        },
      })
      .expect(200);

    expect(organizerResponse.body.data).toMatchObject({
      organizationName: 'EventForge Organizers',
      supportEmail: 'support@eventforge.test',
      defaultEventTimezone: 'Asia/Yangon',
      defaultCurrency: 'MMK',
      payout: expect.objectContaining({
        accountLast4: '1234',
        payoutSchedule: 'weekly',
      }),
    });

    const adminDenied = await request(app)
      .patch('/api/v1/settings/me/admin')
      .set('Authorization', `Bearer ${token}`)
      .send({ requireMfaForAdmins: true })
      .expect(403);

    expect(adminDenied.body).toMatchObject({
      success: false,
      message: 'Only admins can update admin settings',
    });
  });

  it('allows admin to update admin settings and writes an audit log entry', async () => {
    const token = await createUserAndToken({
      name: 'Admin User',
      email: 'admin.settings@example.com',
      password: 'Password1',
      role: 'admin',
    });

    const response = await request(app)
      .patch('/api/v1/settings/me/admin')
      .set('Authorization', `Bearer ${token}`)
      .send({
        securityAlertsEmail: 'security@eventforge.test',
        requireMfaForAdmins: true,
        defaultAuditRetentionDays: 730,
        strictIpLogging: true,
        emailCampaignApprovalRequired: true,
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      securityAlertsEmail: 'security@eventforge.test',
      requireMfaForAdmins: true,
      defaultAuditRetentionDays: 730,
      strictIpLogging: true,
      emailCampaignApprovalRequired: true,
    });

    const adminUser = await User.findOne({ email: 'admin.settings@example.com' }).lean();
    expect(adminUser?.adminSettings).toMatchObject({
      securityAlertsEmail: 'security@eventforge.test',
      requireMfaForAdmins: true,
      defaultAuditRetentionDays: 730,
      strictIpLogging: true,
      emailCampaignApprovalRequired: true,
    });

    const auditLog = await AdminAuditLog.findOne({ action: 'admin.settings.updated' })
      .sort({ createdAt: -1 })
      .lean();

    expect(auditLog).toBeTruthy();
    expect(auditLog?.reason).toBe('Admin updated security and governance settings');
    expect(auditLog?.metadata).toEqual(
      expect.objectContaining({
        updatedFields: expect.arrayContaining([
          'securityAlertsEmail',
          'requireMfaForAdmins',
          'defaultAuditRetentionDays',
          'strictIpLogging',
          'emailCampaignApprovalRequired',
        ]),
      })
    );
  });

  it('changes password for credential users and rejects old password', async () => {
    const token = await createUserAndToken({
      name: 'Password User',
      email: 'password.settings@example.com',
      password: 'Password1',
      role: 'attendee',
    });

    await request(app)
      .post('/api/v1/settings/me/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        currentPassword: 'Password1',
        newPassword: 'NewPassword1',
      })
      .expect(200);

    await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'password.settings@example.com', password: 'Password1' })
      .expect(401);

    await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'password.settings@example.com', password: 'NewPassword1' })
      .expect(200);
  });
});
