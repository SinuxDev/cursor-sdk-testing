import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../app';
import { Event } from '../../models/event.model';
import { Rsvp } from '../../models/rsvp.model';
import { User } from '../../models/user.model';

describe('RSVP integration (persistent db)', () => {
  jest.setTimeout(30000);

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

  async function createPublishedEvent(
    organizerId: string,
    suffix: string,
    capacity: number,
    rsvpLimit?: number
  ) {
    const startDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3);
    const endDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 4);

    return Event.create({
      title: `RSVP Event ${suffix}`,
      shortSummary: 'An event built for RSVP integration checks and ticket generation.',
      description:
        'This published event is used by integration tests to validate RSVP registration, waitlist handling, and ticket retrieval.',
      category: 'conference',
      attendanceMode: 'in_person',
      startDateTime: startDate,
      endDateTime: endDate,
      timezone: 'Asia/Yangon',
      registrationOpenAt: new Date(Date.now() - 1000 * 60 * 60),
      registrationCloseAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
      capacity,
      ...(rsvpLimit !== undefined ? { rsvpLimit } : {}),
      visibility: 'public',
      status: 'published',
      organizerName: 'Organizer RSVP Team',
      contactEmail: `organizer-rsvp+${suffix}@example.com`,
      tickets: [{ name: 'General', type: 'free', quantity: 500 }],
      attendeeQuestions: [],
      organizerId: new mongoose.Types.ObjectId(organizerId),
      publishedAt: new Date(),
    });
  }

  it('handles register, waitlist, ticket fetch, and promotion after cancellation', async () => {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const firstRsvpKey = `rsvp-${suffix}-attendee1`;
    const secondRsvpKey = `rsvp-${suffix}-attendee2`;
    const organizerEmail = `organizer.rsvp.${suffix}@example.com`;
    const attendeeOneEmail = `attendee.one.rsvp.${suffix}@example.com`;
    const attendeeTwoEmail = `attendee.two.rsvp.${suffix}@example.com`;

    const organizer = await User.create({
      name: 'Organizer RSVP',
      email: organizerEmail,
      password: 'Password1',
      role: 'organizer',
      provider: 'credentials',
    });

    await User.create({
      name: 'RSVP Attendee One',
      email: attendeeOneEmail,
      password: 'Password1',
      role: 'attendee',
      provider: 'credentials',
    });

    await User.create({
      name: 'RSVP Attendee Two',
      email: attendeeTwoEmail,
      password: 'Password1',
      role: 'attendee',
      provider: 'credentials',
    });

    const event = await createPublishedEvent(String(organizer._id), suffix, 1);

    const attendeeOneToken = await loginAndGetToken(attendeeOneEmail, 'Password1');
    const attendeeTwoToken = await loginAndGetToken(attendeeTwoEmail, 'Password1');

    await request(app)
      .post(`/api/v1/events/${String(event._id)}/rsvp`)
      .set('Authorization', `Bearer ${attendeeOneToken}`)
      .send({
        formResponses: [{ question: 'Dietary', answer: 'Vegetarian' }],
      })
      .expect(400);

    const firstRsvpResponse = await request(app)
      .post(`/api/v1/events/${String(event._id)}/rsvp`)
      .set('Authorization', `Bearer ${attendeeOneToken}`)
      .set('Idempotency-Key', firstRsvpKey)
      .send({
        formResponses: [{ question: 'Dietary', answer: 'Vegetarian' }],
      })
      .expect(201);

    expect(firstRsvpResponse.body.success).toBe(true);
    expect(firstRsvpResponse.body.data).toMatchObject({
      status: 'registered',
    });
    expect(firstRsvpResponse.body.data.ticketId).toBeTruthy();

    const replayFirstRsvpResponse = await request(app)
      .post(`/api/v1/events/${String(event._id)}/rsvp`)
      .set('Authorization', `Bearer ${attendeeOneToken}`)
      .set('Idempotency-Key', firstRsvpKey)
      .send({
        formResponses: [{ question: 'Dietary', answer: 'Vegetarian' }],
      })
      .expect(201);

    expect(replayFirstRsvpResponse.headers['idempotency-replayed']).toBe('true');
    expect(replayFirstRsvpResponse.body).toEqual(firstRsvpResponse.body);

    await request(app)
      .post(`/api/v1/events/${String(event._id)}/rsvp`)
      .set('Authorization', `Bearer ${attendeeOneToken}`)
      .set('Idempotency-Key', firstRsvpKey)
      .send({
        formResponses: [{ question: 'Dietary', answer: 'No peanuts' }],
      })
      .expect(422);

    const secondRsvpResponse = await request(app)
      .post(`/api/v1/events/${String(event._id)}/rsvp`)
      .set('Authorization', `Bearer ${attendeeTwoToken}`)
      .set('Idempotency-Key', secondRsvpKey)
      .send({
        formResponses: [{ question: 'Accessibility', answer: 'No requirements' }],
      })
      .expect(201);

    expect(secondRsvpResponse.body.success).toBe(true);
    expect(secondRsvpResponse.body.data).toMatchObject({
      status: 'waitlisted',
      waitlistPosition: 1,
      ticketId: null,
    });

    const firstTicketResponse = await request(app)
      .get(`/api/v1/rsvps/${firstRsvpResponse.body.data.rsvpId}/ticket`)
      .set('Authorization', `Bearer ${attendeeOneToken}`)
      .expect(200);

    expect(firstTicketResponse.body.success).toBe(true);
    expect(firstTicketResponse.body.data).toMatchObject({
      rsvpId: firstRsvpResponse.body.data.rsvpId,
      status: 'registered',
    });
    expect(firstTicketResponse.body.data.qrCode).toContain(`evt_${String(event._id)}`);
    expect(firstTicketResponse.body.data.shortCode).toMatch(
      /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/
    );

    const waitlistedTicketAttempt = await request(app)
      .get(`/api/v1/rsvps/${secondRsvpResponse.body.data.rsvpId}/ticket`)
      .set('Authorization', `Bearer ${attendeeTwoToken}`)
      .expect(400);

    expect(waitlistedTicketAttempt.body).toMatchObject({
      success: false,
      message: 'Ticket is only available for registered RSVPs',
    });

    const cancelFirstRsvpResponse = await request(app)
      .delete(`/api/v1/rsvps/${firstRsvpResponse.body.data.rsvpId}`)
      .set('Authorization', `Bearer ${attendeeOneToken}`)
      .expect(200);

    expect(cancelFirstRsvpResponse.body.success).toBe(true);
    expect(cancelFirstRsvpResponse.body.data).toMatchObject({
      status: 'cancelled',
      promotedRsvpId: secondRsvpResponse.body.data.rsvpId,
    });

    const promotedTicketResponse = await request(app)
      .get(`/api/v1/rsvps/${secondRsvpResponse.body.data.rsvpId}/ticket`)
      .set('Authorization', `Bearer ${attendeeTwoToken}`)
      .expect(200);

    expect(promotedTicketResponse.body.success).toBe(true);
    expect(promotedTicketResponse.body.data).toMatchObject({
      rsvpId: secondRsvpResponse.body.data.rsvpId,
      status: 'registered',
    });

    const promotedRsvp = await Rsvp.findById(secondRsvpResponse.body.data.rsvpId).lean();
    expect(promotedRsvp?.status).toBe('registered');
  });

  it('uses rsvpLimit instead of capacity for registration caps', async () => {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const organizerEmail = `organizer.rsvp-limit.${suffix}@example.com`;
    const attendeeEmails = [
      `attendee.a.rsvp-limit.${suffix}@example.com`,
      `attendee.b.rsvp-limit.${suffix}@example.com`,
      `attendee.c.rsvp-limit.${suffix}@example.com`,
    ];

    const organizer = await User.create({
      name: 'Organizer RSVP Limit',
      email: organizerEmail,
      password: 'Password1',
      role: 'organizer',
      provider: 'credentials',
    });

    for (const [index, email] of attendeeEmails.entries()) {
      await User.create({
        name: `RSVP Limit Attendee ${index + 1}`,
        email,
        password: 'Password1',
        role: 'attendee',
        provider: 'credentials',
      });
    }

    const event = await createPublishedEvent(String(organizer._id), suffix, 50, 2);
    const tokens = await Promise.all(
      attendeeEmails.map((email) => loginAndGetToken(email, 'Password1'))
    );

    const firstResponse = await request(app)
      .post(`/api/v1/events/${String(event._id)}/rsvp`)
      .set('Authorization', `Bearer ${tokens[0]}`)
      .set('Idempotency-Key', `rsvp-limit-${suffix}-1`)
      .send({})
      .expect(201);

    const secondResponse = await request(app)
      .post(`/api/v1/events/${String(event._id)}/rsvp`)
      .set('Authorization', `Bearer ${tokens[1]}`)
      .set('Idempotency-Key', `rsvp-limit-${suffix}-2`)
      .send({})
      .expect(201);

    const thirdResponse = await request(app)
      .post(`/api/v1/events/${String(event._id)}/rsvp`)
      .set('Authorization', `Bearer ${tokens[2]}`)
      .set('Idempotency-Key', `rsvp-limit-${suffix}-3`)
      .send({})
      .expect(201);

    expect(firstResponse.body.data.status).toBe('registered');
    expect(secondResponse.body.data.status).toBe('registered');
    expect(thirdResponse.body.data).toMatchObject({
      status: 'waitlisted',
      waitlistPosition: 1,
      ticketId: null,
    });
  });
});
