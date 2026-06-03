import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../app';
import { Event } from '../../models/event.model';
import { Rsvp } from '../../models/rsvp.model';
import { Ticket } from '../../models/ticket.model';
import { User } from '../../models/user.model';

const SHORT_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateShortCode(): string {
  let value = '';

  for (let index = 0; index < 8; index += 1) {
    const charIndex = Math.floor(Math.random() * SHORT_CODE_ALPHABET.length);
    value += SHORT_CODE_ALPHABET[charIndex];
  }

  return value;
}

describe('Event check-in integration (persistent db)', () => {
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

  async function createPublishedEvent(organizerId: string, suffix: string) {
    const startDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3);
    const endDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 4);

    return Event.create({
      title: `Check-in Event ${suffix}`,
      shortSummary: 'A complete integration test event for attendee check-in.',
      description:
        'This event is created during integration tests to validate check-in scanner and ticket lookup flows.',
      category: 'technology',
      attendanceMode: 'in_person',
      startDateTime: startDate,
      endDateTime: endDate,
      timezone: 'Asia/Yangon',
      registrationOpenAt: new Date(Date.now() - 1000 * 60 * 60),
      registrationCloseAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
      capacity: 300,
      visibility: 'public',
      status: 'published',
      organizerName: 'Organizer Integration Team',
      contactEmail: `organizer+${suffix}@example.com`,
      tickets: [{ name: 'General', type: 'free', quantity: 300 }],
      attendeeQuestions: [],
      organizerId: new mongoose.Types.ObjectId(organizerId),
      publishedAt: new Date(),
    });
  }

  it('supports scanner and ticket lookup check-in flows', async () => {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const firstScannerKey = `checkin-scanner-${suffix}-1`;
    const secondScannerKey = `checkin-scanner-${suffix}-2`;
    const lookupKey = `checkin-lookup-${suffix}`;
    const undoKey = `checkin-undo-${suffix}`;
    const organizerEmail = `organizer.checkin.${suffix}@example.com`;
    const attendeeOneEmail = `attendee.one.${suffix}@example.com`;
    const attendeeTwoEmail = `attendee.two.${suffix}@example.com`;
    const shortCodeOne = generateShortCode();
    let shortCodeTwo = generateShortCode();

    while (shortCodeTwo === shortCodeOne) {
      shortCodeTwo = generateShortCode();
    }

    const organizer = await User.create({
      name: 'Organizer CheckIn',
      email: organizerEmail,
      password: 'Password1',
      role: 'organizer',
      provider: 'credentials',
    });

    const attendeeOne = await User.create({
      name: 'Attendee One',
      email: attendeeOneEmail,
      password: 'Password1',
      role: 'attendee',
      provider: 'credentials',
    });

    const attendeeTwo = await User.create({
      name: 'Attendee Two',
      email: attendeeTwoEmail,
      password: 'Password1',
      role: 'attendee',
      provider: 'credentials',
    });

    const event = await createPublishedEvent(String(organizer._id), suffix);

    const rsvpOne = await Rsvp.create({
      event: event._id,
      user: attendeeOne._id,
      status: 'registered',
      formResponses: [],
    });

    const ticketOne = await Ticket.create({
      event: event._id,
      user: attendeeOne._id,
      rsvp: rsvpOne._id,
      qrCode: `evt_${String(event._id)}:rsvp_${String(rsvpOne._id)}:${suffix}:01`,
      shortCode: shortCodeOne,
      isCheckedIn: false,
    });

    const rsvpTwo = await Rsvp.create({
      event: event._id,
      user: attendeeTwo._id,
      status: 'registered',
      formResponses: [],
    });

    const ticketTwo = await Ticket.create({
      event: event._id,
      user: attendeeTwo._id,
      rsvp: rsvpTwo._id,
      qrCode: `evt_${String(event._id)}:rsvp_${String(rsvpTwo._id)}:${suffix}:02`,
      shortCode: shortCodeTwo,
      isCheckedIn: false,
    });

    const organizerToken = await loginAndGetToken(organizerEmail, 'Password1');

    await request(app)
      .post(`/api/v1/events/${String(event._id)}/check-in`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ qrCode: ticketOne.qrCode, source: 'scanner' })
      .expect(400);

    const scannerResponse = await request(app)
      .post(`/api/v1/events/${String(event._id)}/check-in`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .set('Idempotency-Key', firstScannerKey)
      .send({ qrCode: ticketOne.qrCode, source: 'scanner' })
      .expect(200);

    expect(scannerResponse.body.success).toBe(true);
    expect(scannerResponse.body.data).toMatchObject({
      attendeeEmail: attendeeOneEmail,
      alreadyCheckedIn: false,
      source: 'scanner',
    });

    const replayScannerResponse = await request(app)
      .post(`/api/v1/events/${String(event._id)}/check-in`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .set('Idempotency-Key', firstScannerKey)
      .send({ qrCode: ticketOne.qrCode, source: 'scanner' })
      .expect(200);

    expect(replayScannerResponse.headers['idempotency-replayed']).toBe('true');
    expect(replayScannerResponse.body).toEqual(scannerResponse.body);

    await request(app)
      .post(`/api/v1/events/${String(event._id)}/check-in`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .set('Idempotency-Key', firstScannerKey)
      .send({ qrCode: ticketTwo.qrCode, source: 'scanner' })
      .expect(422);

    const shortCodeScannerResponse = await request(app)
      .post(`/api/v1/events/${String(event._id)}/check-in`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .set('Idempotency-Key', `checkin-short-code-${suffix}`)
      .send({ qrCode: ticketTwo.shortCode, source: 'manual' })
      .expect(200);

    expect(shortCodeScannerResponse.body.success).toBe(true);
    expect(shortCodeScannerResponse.body.data).toMatchObject({
      attendeeEmail: attendeeTwoEmail,
      alreadyCheckedIn: false,
      source: 'manual',
    });

    const duplicateScannerResponse = await request(app)
      .post(`/api/v1/events/${String(event._id)}/check-in`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .set('Idempotency-Key', secondScannerKey)
      .send({ qrCode: ticketOne.qrCode, source: 'scanner' })
      .expect(200);

    expect(duplicateScannerResponse.body.data).toMatchObject({
      attendeeEmail: attendeeOneEmail,
      alreadyCheckedIn: true,
      source: 'scanner',
    });

    const lookupResponse = await request(app)
      .post(`/api/v1/events/${String(event._id)}/check-in/ticket`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .set('Idempotency-Key', lookupKey)
      .send({ ticketId: String(ticketTwo._id), source: 'lookup' })
      .expect(200);

    expect(lookupResponse.body.success).toBe(true);
    expect(lookupResponse.body.data).toMatchObject({
      attendeeEmail: attendeeTwoEmail,
      alreadyCheckedIn: true,
      source: 'lookup',
    });

    const undoResponse = await request(app)
      .post(`/api/v1/events/${String(event._id)}/check-in/undo`)
      .set('Authorization', `Bearer ${organizerToken}`)
      .set('Idempotency-Key', undoKey)
      .send({ ticketId: String(ticketTwo._id) })
      .expect(200);

    expect(undoResponse.body.success).toBe(true);
    expect(undoResponse.body.data).toMatchObject({
      ticketId: String(ticketTwo._id),
      isCheckedIn: false,
    });
  });
});
