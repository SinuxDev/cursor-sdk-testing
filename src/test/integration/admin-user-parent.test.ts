import request from 'supertest';
import app from '../../app';
import { User } from '../../models/user.model';
import { AdminAuditLog } from '../../models/admin-audit-log.model';
import './setup';

describe('Admin user parent integration', () => {
  const adminEmail = 'admin@example.com';
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
      name: 'Platform Admin',
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      provider: 'credentials',
    });
  });

  it('lists users with populated parent and filters by parentId', async () => {
    const parentUser = await User.create({
      name: 'Parent Organizer',
      email: 'parent@example.com',
      password: 'Password1',
      role: 'organizer',
      provider: 'credentials',
    });

    const childUser = await User.create({
      name: 'Child Attendee',
      email: 'child@example.com',
      password: 'Password1',
      role: 'attendee',
      provider: 'credentials',
      parent: parentUser._id,
    });

    const accessToken = await loginAsAdmin();

    const listResponse = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const listedChild = listResponse.body.data.data.find(
      (user: { _id: string }) => String(user._id) === String(childUser._id)
    );

    expect(listedChild.parent).toMatchObject({
      _id: String(parentUser._id),
      name: 'Parent Organizer',
      email: 'parent@example.com',
      role: 'organizer',
    });

    const filteredResponse = await request(app)
      .get(`/api/v1/admin/users?parentId=${String(parentUser._id)}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(filteredResponse.body.data.data).toHaveLength(1);
    expect(filteredResponse.body.data.data[0]).toMatchObject({
      _id: String(childUser._id),
      email: 'child@example.com',
    });
  });

  it('assigns and clears a user parent with audit logging', async () => {
    const parentUser = await User.create({
      name: 'New Parent',
      email: 'new-parent@example.com',
      password: 'Password1',
      role: 'organizer',
      provider: 'credentials',
    });

    const targetUser = await User.create({
      name: 'Assignable User',
      email: 'assignable@example.com',
      password: 'Password1',
      role: 'attendee',
      provider: 'credentials',
    });

    const accessToken = await loginAsAdmin();
    const reason = 'Assigning organizer ownership for support escalation';

    const assignResponse = await request(app)
      .patch(`/api/v1/admin/users/${String(targetUser._id)}/parent`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        parentId: String(parentUser._id),
        reason,
      })
      .expect(200);

    expect(assignResponse.body).toMatchObject({
      success: true,
      message: 'User parent updated successfully',
    });
    expect(assignResponse.body.data.parent).toMatchObject({
      _id: String(parentUser._id),
      name: 'New Parent',
      email: 'new-parent@example.com',
    });

    const clearResponse = await request(app)
      .patch(`/api/v1/admin/users/${String(targetUser._id)}/parent`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        parentId: null,
        reason: 'Removing parent assignment after ownership transfer',
      })
      .expect(200);

    expect(clearResponse.body.data.parent).toBeNull();

    const auditLogs = await AdminAuditLog.find({
      targetUserId: targetUser._id,
      action: 'user.parent.updated',
    })
      .sort({ createdAt: 1 })
      .lean();

    expect(auditLogs).toHaveLength(2);
    expect(auditLogs[0].metadata).toMatchObject({
      previousParentId: null,
      nextParentId: String(parentUser._id),
    });
    expect(auditLogs[1].metadata).toMatchObject({
      previousParentId: String(parentUser._id),
      nextParentId: null,
    });
  });

  it('rejects circular parent assignments', async () => {
    const parentUser = await User.create({
      name: 'Top Parent',
      email: 'top-parent@example.com',
      password: 'Password1',
      role: 'organizer',
      provider: 'credentials',
    });

    const childUser = await User.create({
      name: 'Nested Child',
      email: 'nested-child@example.com',
      password: 'Password1',
      role: 'attendee',
      provider: 'credentials',
      parent: parentUser._id,
    });

    const accessToken = await loginAsAdmin();

    const response = await request(app)
      .patch(`/api/v1/admin/users/${String(parentUser._id)}/parent`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        parentId: String(childUser._id),
        reason: 'Attempting invalid hierarchy update',
      })
      .expect(400);

    expect(response.body).toMatchObject({
      success: false,
      message: 'Parent assignment would create a circular hierarchy',
    });
  });
});
