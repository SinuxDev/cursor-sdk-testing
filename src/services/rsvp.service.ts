import crypto from 'crypto';
import mongoose from 'mongoose';
import { getEventRsvpLimit, IEvent } from '../models/event.model';
import { IRsvp, IRsvpFormResponse, RsvpStatus } from '../models/rsvp.model';
import {
  ManagedRsvpSort,
  ManagedRsvpTab,
  type ManagedRsvpsAggregationResult,
} from '../repositories/rsvp.repository';
import { ITicket } from '../models/ticket.model';
import { eventRepository } from '../repositories/event.repository';
import { rsvpRepository } from '../repositories/rsvp.repository';
import { ticketRepository } from '../repositories/ticket.repository';
import { userRepository } from '../repositories/user.repository';
import { AppError } from '../utils/AppError';
import { renderRsvpEmailTemplate } from '../lib/rsvp-email-templates';
import { generateQrCodeDataUrl } from '../lib/qr-code';
import { emailService } from './email.service';
import { logger } from '../utils/logger';

interface RsvpFormInput {
  question: string;
  answer: string;
}

interface SubmitRsvpParams {
  eventId: string;
  userId: string;
  formResponses?: RsvpFormInput[];
}

interface SubmitRsvpResult {
  rsvpId: string;
  status: RsvpStatus;
  waitlistPosition: number | null;
  ticketId: string | null;
}

interface CancelRsvpResult {
  rsvpId: string;
  status: RsvpStatus;
  promotedRsvpId: string | null;
}

interface MyTicketResult {
  rsvpId: string;
  eventId: string;
  eventTitle: string;
  eventStartDateTime: Date;
  eventTimezone: string;
  status: RsvpStatus;
  ticketId: string;
  shortCode: string;
  qrCode: string;
  qrCodeImage: string | null;
}

const TICKET_SHORT_CODE_LENGTH = 8;
const TICKET_SHORT_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_TICKET_CREATE_ATTEMPTS = 5;

interface ListManagedMyRsvpsParams {
  userId: string;
  tab?: ManagedRsvpTab;
  search?: string;
  page?: number;
  limit?: number;
  sort?: ManagedRsvpSort;
}

interface ManagedMyRsvpItem {
  rsvpId: string;
  status: RsvpStatus;
  tab: Exclude<ManagedRsvpTab, 'all'>;
  waitlistPosition: number | null;
  createdAt: Date;
  updatedAt: Date;
  event: {
    eventId: string;
    title: string;
    shortSummary: string;
    startDateTime: Date;
    endDateTime: Date;
    timezone: string;
    attendanceMode: string;
    venueName: string | null;
    city: string | null;
    country: string | null;
    registrationCloseAt: Date | null;
    status: string;
    coverImage: string | null;
  };
  actions: {
    canViewTicket: boolean;
    canCancel: boolean;
    canJoinWaitlist: boolean;
    canLeaveWaitlist: boolean;
    canReregister: boolean;
  };
}

interface ManagedMyRsvpsResult {
  items: ManagedMyRsvpItem[];
  counts: {
    upcoming: number;
    waitlisted: number;
    past: number;
    cancelled: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  filters: {
    tab: ManagedRsvpTab;
    search: string;
    sort: ManagedRsvpSort;
  };
}

class RsvpService {
  async submitRsvp(params: SubmitRsvpParams): Promise<SubmitRsvpResult> {
    this.ensureValidObjectId(params.eventId, 'Invalid event id');
    this.ensureValidObjectId(params.userId, 'Invalid user id');

    const event = await eventRepository.findByIdRaw(params.eventId);
    if (!event) {
      throw new AppError('Event not found', 404);
    }

    this.ensureEventAcceptsRsvp(event);

    const existingRsvp = await rsvpRepository.findByEventAndUser(params.eventId, params.userId);
    if (existingRsvp && existingRsvp.status !== 'cancelled') {
      const existingTicket = await ticketRepository.findByRsvpId(String(existingRsvp._id));
      return {
        rsvpId: String(existingRsvp._id),
        status: existingRsvp.status,
        waitlistPosition: existingRsvp.waitlistPosition ?? null,
        ticketId: existingTicket ? String(existingTicket._id) : null,
      };
    }

    const normalizedResponses = this.normalizeFormResponses(params.formResponses);
    const registeredCount = await rsvpRepository.countRegisteredByEvent(params.eventId);
    const rsvpLimit = getEventRsvpLimit(event);
    const hasAvailableSeat = registeredCount < rsvpLimit;

    const status: RsvpStatus = hasAvailableSeat ? 'registered' : 'waitlisted';
    const waitlistPosition = hasAvailableSeat
      ? undefined
      : (await rsvpRepository.countWaitlistedByEvent(params.eventId)) + 1;

    let rsvp: IRsvp;
    if (existingRsvp && existingRsvp.status === 'cancelled') {
      const updated = await rsvpRepository.update(String(existingRsvp._id), {
        $set: {
          status,
          formResponses: normalizedResponses,
          waitlistPosition,
          cancelledAt: undefined,
        },
      });

      if (!updated) {
        throw new AppError('Unable to update RSVP', 500);
      }

      rsvp = updated;
    } else {
      try {
        rsvp = await rsvpRepository.create({
          event: new mongoose.Types.ObjectId(params.eventId),
          user: new mongoose.Types.ObjectId(params.userId),
          status,
          formResponses: normalizedResponses,
          waitlistPosition,
        } as Partial<IRsvp>);
      } catch (error) {
        const duplicateError =
          error instanceof Error &&
          (error as Error & { name?: string }).name === 'MongoServerError' &&
          (error as Error & { code?: number }).code === 11000;

        if (!duplicateError) {
          throw error;
        }

        const raceExistingRsvp = await rsvpRepository.findByEventAndUser(
          params.eventId,
          params.userId
        );
        if (!raceExistingRsvp) {
          throw new AppError('Unable to create RSVP', 500);
        }

        const raceTicket = await ticketRepository.findByRsvpId(String(raceExistingRsvp._id));
        return {
          rsvpId: String(raceExistingRsvp._id),
          status: raceExistingRsvp.status,
          waitlistPosition: raceExistingRsvp.waitlistPosition ?? null,
          ticketId: raceTicket ? String(raceTicket._id) : null,
        };
      }
    }

    let ticket: ITicket | null = null;
    if (status === 'registered') {
      ticket = await this.ensureTicket(String(rsvp._id), params.eventId, params.userId);
    }

    await this.sendRsvpStatusEmail({
      userId: params.userId,
      event,
      status,
      rsvpId: String(rsvp._id),
      ticketShortCode: ticket?.shortCode,
      ticketQrDataUrl: ticket?.qrCodeImage,
    });

    return {
      rsvpId: String(rsvp._id),
      status,
      waitlistPosition: waitlistPosition ?? null,
      ticketId: ticket ? String(ticket._id) : null,
    };
  }

  async listMyRsvps(userId: string): Promise<IRsvp[]> {
    this.ensureValidObjectId(userId, 'Invalid user id');
    return rsvpRepository.listByUser(userId);
  }

  async listManagedMyRsvps(params: ListManagedMyRsvpsParams): Promise<ManagedMyRsvpsResult> {
    this.ensureValidObjectId(params.userId, 'Invalid user id');

    const normalizedTab: ManagedRsvpTab = params.tab ?? 'all';
    const normalizedSearch = params.search?.trim() ?? '';
    const normalizedPage =
      Number.isInteger(params.page) && (params.page as number) > 0 ? (params.page as number) : 1;
    const normalizedLimit =
      Number.isInteger(params.limit) && (params.limit as number) > 0
        ? Math.min(params.limit as number, 50)
        : 10;
    const normalizedSort: ManagedRsvpSort = params.sort ?? 'eventStartAsc';
    const now = new Date();

    const result = await rsvpRepository.listManagedByUser({
      userId: params.userId,
      tab: normalizedTab,
      search: normalizedSearch,
      page: normalizedPage,
      limit: normalizedLimit,
      sort: normalizedSort,
      now,
    });

    return {
      items: this.mapManagedItems(result, now),
      counts: result.countsByTab,
      pagination: {
        page: normalizedPage,
        limit: normalizedLimit,
        total: result.total,
        totalPages: Math.ceil(result.total / normalizedLimit),
        hasNextPage: normalizedPage * normalizedLimit < result.total,
        hasPrevPage: normalizedPage > 1,
      },
      filters: {
        tab: normalizedTab,
        search: normalizedSearch,
        sort: normalizedSort,
      },
    };
  }

  async cancelRsvp(rsvpId: string, userId: string): Promise<CancelRsvpResult> {
    this.ensureValidObjectId(rsvpId, 'Invalid RSVP id');
    this.ensureValidObjectId(userId, 'Invalid user id');

    const existing = await rsvpRepository.findByIdOwnedByUser(rsvpId, userId);
    if (!existing) {
      throw new AppError('RSVP not found', 404);
    }

    if (existing.status === 'cancelled') {
      return {
        rsvpId: String(existing._id),
        status: existing.status,
        promotedRsvpId: null,
      };
    }

    const previousStatus = existing.status;
    const updated = await rsvpRepository.update(rsvpId, {
      $set: {
        status: 'cancelled',
        cancelledAt: new Date(),
        waitlistPosition: undefined,
      },
    });

    if (!updated) {
      throw new AppError('Unable to cancel RSVP', 500);
    }

    const event = await eventRepository.findByIdRaw(String(existing.event));
    if (event) {
      await this.sendRsvpStatusEmail({
        userId,
        event,
        status: 'cancelled',
        rsvpId: String(existing._id),
      });
    }

    let promotedRsvpId: string | null = null;
    if (previousStatus === 'registered') {
      const promoted = await this.promoteNextWaitlisted(String(existing.event));
      promotedRsvpId = promoted ? String(promoted._id) : null;
    }

    return {
      rsvpId: String(updated._id),
      status: updated.status,
      promotedRsvpId,
    };
  }

  async getMyTicket(rsvpId: string, userId: string): Promise<MyTicketResult> {
    this.ensureValidObjectId(rsvpId, 'Invalid RSVP id');
    this.ensureValidObjectId(userId, 'Invalid user id');

    const rsvp = await rsvpRepository.findByIdOwnedByUser(rsvpId, userId);
    if (!rsvp) {
      throw new AppError('RSVP not found', 404);
    }

    if (rsvp.status !== 'registered') {
      throw new AppError('Ticket is only available for registered RSVPs', 400);
    }

    const event = await eventRepository.findByIdRaw(String(rsvp.event));
    if (!event) {
      throw new AppError('Event not found', 404);
    }

    const ticket = await this.ensureTicket(String(rsvp._id), String(rsvp.event), userId);

    if (!ticket.qrCodeImage) {
      const generatedQrCodeImage = await generateQrCodeDataUrl(ticket.qrCode);
      const updatedTicket = await ticketRepository.update(String(ticket._id), {
        $set: {
          qrCodeImage: generatedQrCodeImage,
        },
      });

      if (updatedTicket) {
        ticket.qrCodeImage = updatedTicket.qrCodeImage;
      }
    }

    return {
      rsvpId: String(rsvp._id),
      eventId: String(event._id),
      eventTitle: event.title,
      eventStartDateTime: event.startDateTime,
      eventTimezone: event.timezone,
      status: rsvp.status,
      ticketId: String(ticket._id),
      shortCode: ticket.shortCode ?? 'UNAVAILABLE',
      qrCode: ticket.qrCode,
      qrCodeImage: ticket.qrCodeImage ?? null,
    };
  }

  private async promoteNextWaitlisted(eventId: string): Promise<IRsvp | null> {
    const event = await eventRepository.findByIdRaw(eventId);
    if (!event) {
      return null;
    }

    const registeredCount = await rsvpRepository.countRegisteredByEvent(eventId);
    if (registeredCount >= getEventRsvpLimit(event)) {
      return null;
    }

    const waitlisted = await rsvpRepository.findFirstWaitlisted(eventId);
    if (!waitlisted) {
      return null;
    }

    const updated = await rsvpRepository.update(String(waitlisted._id), {
      $set: {
        status: 'registered',
        waitlistPosition: undefined,
      },
    });

    if (!updated) {
      return null;
    }

    const updatedTicket = await this.ensureTicket(
      String(updated._id),
      String(updated.event),
      String(updated.user)
    );

    await this.sendRsvpStatusEmail({
      userId: String(updated.user),
      event,
      status: 'registered',
      rsvpId: String(updated._id),
      ticketShortCode: updatedTicket.shortCode,
      ticketQrDataUrl: updatedTicket.qrCodeImage,
    });

    return updated;
  }

  private async ensureTicket(rsvpId: string, eventId: string, userId: string): Promise<ITicket> {
    const existing = await ticketRepository.findByRsvpId(rsvpId);
    if (existing) {
      return this.ensureTicketShortCode(existing);
    }

    const qrCode = `evt_${eventId}:rsvp_${rsvpId}:${crypto.randomUUID()}`;
    const qrCodeImage = await generateQrCodeDataUrl(qrCode);
    for (let attempt = 0; attempt < MAX_TICKET_CREATE_ATTEMPTS; attempt += 1) {
      const shortCode = this.generateTicketShortCode();

      try {
        return await ticketRepository.create({
          rsvp: new mongoose.Types.ObjectId(rsvpId),
          event: new mongoose.Types.ObjectId(eventId),
          user: new mongoose.Types.ObjectId(userId),
          qrCode,
          shortCode,
          qrCodeImage,
        } as Partial<ITicket>);
      } catch (error) {
        const duplicateError =
          error instanceof Error &&
          (error as Error & { name?: string }).name === 'MongoServerError' &&
          (error as Error & { code?: number }).code === 11000;

        if (!duplicateError) {
          throw error;
        }

        const raceExisting = await ticketRepository.findByRsvpId(rsvpId);
        if (raceExisting) {
          return this.ensureTicketShortCode(raceExisting);
        }

        if (attempt === MAX_TICKET_CREATE_ATTEMPTS - 1) {
          throw new AppError('Unable to create ticket', 500);
        }
      }
    }

    throw new AppError('Unable to create ticket', 500);
  }

  private async ensureTicketShortCode(ticket: ITicket): Promise<ITicket> {
    if (ticket.shortCode) {
      return ticket;
    }

    for (let attempt = 0; attempt < MAX_TICKET_CREATE_ATTEMPTS; attempt += 1) {
      const shortCode = this.generateTicketShortCode();

      try {
        const updated = await ticketRepository.update(String(ticket._id), {
          $set: {
            shortCode,
          },
        });

        if (updated?.shortCode) {
          return updated;
        }
      } catch (error) {
        const duplicateError =
          error instanceof Error &&
          (error as Error & { name?: string }).name === 'MongoServerError' &&
          (error as Error & { code?: number }).code === 11000;

        if (!duplicateError) {
          throw error;
        }

        if (attempt === MAX_TICKET_CREATE_ATTEMPTS - 1) {
          throw new AppError('Unable to assign ticket short code', 500);
        }
      }
    }

    throw new AppError('Unable to assign ticket short code', 500);
  }

  private generateTicketShortCode(): string {
    const randomBytes = crypto.randomBytes(TICKET_SHORT_CODE_LENGTH);
    let value = '';

    for (let index = 0; index < TICKET_SHORT_CODE_LENGTH; index += 1) {
      const charIndex = randomBytes[index] % TICKET_SHORT_CODE_ALPHABET.length;
      value += TICKET_SHORT_CODE_ALPHABET[charIndex];
    }

    return value;
  }

  private mapManagedItems(result: ManagedRsvpsAggregationResult, now: Date): ManagedMyRsvpItem[] {
    return result.items.map((item) => {
      const registrationCloseAt = item.event.registrationCloseAt ?? null;
      const eventHasStarted = item.event.startDateTime <= now;
      const registrationClosed = registrationCloseAt ? registrationCloseAt <= now : false;
      const canViewTicket = item.status === 'registered';
      const canCancel = item.status !== 'cancelled' && !eventHasStarted;

      return {
        rsvpId: String(item._id),
        status: item.status,
        tab: item.tab,
        waitlistPosition: item.waitlistPosition ?? null,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        event: {
          eventId: String(item.event._id),
          title: item.event.title,
          shortSummary: item.event.shortSummary ?? '',
          startDateTime: item.event.startDateTime,
          endDateTime: item.event.endDateTime,
          timezone: item.event.timezone,
          attendanceMode: item.event.attendanceMode,
          venueName: item.event.venueName ?? null,
          city: item.event.city ?? null,
          country: item.event.country ?? null,
          registrationCloseAt,
          status: item.event.status,
          coverImage: item.event.coverImage ?? null,
        },
        actions: {
          canViewTicket,
          canCancel,
          canJoinWaitlist: false,
          canLeaveWaitlist: item.status === 'waitlisted' && canCancel,
          canReregister:
            item.status === 'cancelled' &&
            !eventHasStarted &&
            !registrationClosed &&
            item.event.status === 'published',
        },
      };
    });
  }

  private async sendRsvpStatusEmail(params: {
    userId: string;
    event: IEvent;
    status: RsvpStatus;
    rsvpId: string;
    ticketShortCode?: string;
    ticketQrDataUrl?: string;
  }): Promise<void> {
    try {
      const user = await userRepository.findById(params.userId);
      if (!user) {
        return;
      }

      const websiteUrl =
        process.env.EMAIL_WEBSITE_URL || process.env.CORS_ORIGIN || 'http://localhost:3000';
      const eventUrl = `${websiteUrl.replace(/\/$/, '')}/events/${String(params.event._id)}`;
      const ticketUrl = `${websiteUrl.replace(/\/$/, '')}/tickets/${params.rsvpId}`;
      const qrCid = `ticket-qr-${params.rsvpId}@eventforge.local`;

      const template = renderRsvpEmailTemplate({
        attendeeName: user.name,
        eventTitle: params.event.title,
        eventUrl,
        status: params.status,
        ticketUrl: params.status === 'registered' ? ticketUrl : undefined,
        ticketShortCode: params.ticketShortCode,
        ticketQrCid: params.status === 'registered' ? qrCid : undefined,
      });

      const attachments =
        params.status === 'registered' && params.ticketQrDataUrl
          ? [
              {
                filename: 'ticket-qr.png',
                content: params.ticketQrDataUrl.replace(/^data:image\/png;base64,/, ''),
                contentType: 'image/png',
                cid: qrCid,
                encoding: 'base64',
              },
            ]
          : undefined;

      await emailService.sendTextEmail({
        to: user.email,
        subject: template.subject,
        text: template.text,
        html: template.html,
        attachments,
      });
    } catch (error) {
      logger.warn('[rsvp] transactional email failed', {
        userId: params.userId,
        eventId: String(params.event._id),
        status: params.status,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private normalizeFormResponses(formResponses?: RsvpFormInput[]): IRsvpFormResponse[] {
    if (!Array.isArray(formResponses)) {
      return [];
    }

    return formResponses
      .map((item) => ({
        question: item.question.trim(),
        answer: item.answer.trim(),
      }))
      .filter((item) => item.question.length > 0 && item.answer.length > 0);
  }

  private ensureValidObjectId(value: string, message: string): void {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      throw new AppError(message, 400);
    }
  }

  private ensureEventAcceptsRsvp(event: IEvent): void {
    if (event.status !== 'published') {
      throw new AppError('Only published events accept RSVPs', 400);
    }

    const now = new Date();

    if (event.registrationOpenAt && now < event.registrationOpenAt) {
      throw new AppError('Registration is not open yet', 400);
    }

    if (event.registrationCloseAt && now > event.registrationCloseAt) {
      throw new AppError('Registration is closed', 400);
    }

    if (now >= event.startDateTime) {
      throw new AppError('Event has already started', 400);
    }
  }
}

export const rsvpService = new RsvpService();
