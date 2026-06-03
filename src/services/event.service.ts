import mongoose from 'mongoose';
import {
  EventAttendanceMode,
  EventStatus,
  EventVisibility,
  getEventRsvpLimit,
  IEvent,
  IEventQuestion,
  IEventTicket,
  QuestionType,
  TicketType,
} from '../models/event.model';
import { eventRepository } from '../repositories/event.repository';
import { rsvpRepository } from '../repositories/rsvp.repository';
import { AppError } from '../utils/AppError';

interface EventTicketInput {
  name: string;
  type: TicketType;
  quantity: number;
  price?: number;
  currency?: string;
  salesStartAt?: string | Date;
  salesEndAt?: string | Date;
  minPerOrder?: number;
  maxPerOrder?: number;
}

interface EventQuestionInput {
  label: string;
  type: QuestionType;
  required?: boolean;
  options?: string[];
}

interface EventPayload {
  title: string;
  shortSummary: string;
  description: string;
  category: string;
  customCategory?: string;
  tags?: string[];
  coverImage?: string;
  attendanceMode: EventAttendanceMode;
  venueName?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  onlineEventUrl?: string;
  startDateTime: string | Date;
  endDateTime: string | Date;
  timezone: string;
  registrationOpenAt?: string | Date;
  registrationCloseAt?: string | Date;
  capacity: number;
  rsvpLimit?: number;
  visibility?: EventVisibility;
  organizerName: string;
  organizerUrl?: string;
  contactEmail: string;
  refundPolicy?: string;
  tickets?: EventTicketInput[];
  attendeeQuestions?: EventQuestionInput[];
}

interface CreateEventParams {
  organizerId: string;
  payload: EventPayload;
}

interface UpdateEventParams {
  organizerId: string;
  eventId: string;
  payload: Partial<EventPayload>;
}

interface PublishEventParams {
  organizerId: string;
  eventId: string;
}

class EventService {
  async createDraft(params: CreateEventParams): Promise<IEvent> {
    this.ensureValidObjectId(params.organizerId, 'Invalid organizer id');
    this.validateCoreEventRules(params.payload, false);

    const event = await eventRepository.create({
      ...this.mapPayloadToDocument(params.payload),
      status: 'draft',
      organizerId: new mongoose.Types.ObjectId(params.organizerId),
    } as Partial<IEvent>);

    return event;
  }

  async updateEvent(params: UpdateEventParams): Promise<IEvent> {
    this.ensureValidObjectId(params.organizerId, 'Invalid organizer id');
    this.ensureValidObjectId(params.eventId, 'Invalid event id');

    const existingEvent = await eventRepository.findOwnedByUser(params.eventId, params.organizerId);

    if (!existingEvent) {
      throw new AppError('Event not found', 404);
    }

    const now = new Date();
    if (existingEvent.endDateTime < now) {
      throw new AppError('Finished events cannot be edited', 400);
    }

    const mergedPayload = {
      title: params.payload.title ?? existingEvent.title,
      shortSummary: params.payload.shortSummary ?? existingEvent.shortSummary,
      description: params.payload.description ?? existingEvent.description,
      category: params.payload.category ?? existingEvent.category,
      customCategory: params.payload.customCategory,
      tags: params.payload.tags ?? existingEvent.tags,
      coverImage: params.payload.coverImage ?? existingEvent.coverImage,
      attendanceMode: params.payload.attendanceMode ?? existingEvent.attendanceMode,
      venueName: params.payload.venueName ?? existingEvent.venueName,
      addressLine1: params.payload.addressLine1 ?? existingEvent.addressLine1,
      addressLine2: params.payload.addressLine2 ?? existingEvent.addressLine2,
      city: params.payload.city ?? existingEvent.city,
      state: params.payload.state ?? existingEvent.state,
      country: params.payload.country ?? existingEvent.country,
      postalCode: params.payload.postalCode ?? existingEvent.postalCode,
      onlineEventUrl: params.payload.onlineEventUrl ?? existingEvent.onlineEventUrl,
      startDateTime: params.payload.startDateTime ?? existingEvent.startDateTime,
      endDateTime: params.payload.endDateTime ?? existingEvent.endDateTime,
      timezone: params.payload.timezone ?? existingEvent.timezone,
      registrationOpenAt: params.payload.registrationOpenAt ?? existingEvent.registrationOpenAt,
      registrationCloseAt: params.payload.registrationCloseAt ?? existingEvent.registrationCloseAt,
      capacity: params.payload.capacity ?? existingEvent.capacity,
      rsvpLimit:
        params.payload.rsvpLimit !== undefined
          ? params.payload.rsvpLimit
          : existingEvent.rsvpLimit,
      visibility: params.payload.visibility ?? existingEvent.visibility,
      organizerName: params.payload.organizerName ?? existingEvent.organizerName,
      organizerUrl: params.payload.organizerUrl ?? existingEvent.organizerUrl,
      contactEmail: params.payload.contactEmail ?? existingEvent.contactEmail,
      refundPolicy: params.payload.refundPolicy ?? existingEvent.refundPolicy,
      tickets: params.payload.tickets ?? existingEvent.tickets,
      attendeeQuestions: params.payload.attendeeQuestions ?? existingEvent.attendeeQuestions,
    };

    this.validateCoreEventRules(mergedPayload, false);

    const nextStartDate = new Date(mergedPayload.startDateTime);
    const nextEndDate = new Date(mergedPayload.endDateTime);

    if (existingEvent.status === 'published') {
      this.validatePublishedUpdateRules(existingEvent, nextStartDate, nextEndDate);
    }

    const hasScheduleChanged =
      nextStartDate.getTime() !== existingEvent.startDateTime.getTime() ||
      nextEndDate.getTime() !== existingEvent.endDateTime.getTime();

    if (hasScheduleChanged) {
      await this.ensureNoScheduleConflict(
        params.organizerId,
        nextStartDate,
        nextEndDate,
        params.eventId
      );
    }

    await this.ensureRsvpLimitNotBelowRegistered(params.eventId, mergedPayload);

    const updatedEvent = await eventRepository.update(params.eventId, {
      $set: this.mapPayloadToDocument(mergedPayload),
    });

    if (!updatedEvent) {
      throw new AppError('Event not found', 404);
    }

    return updatedEvent;
  }

  async publishEvent(params: PublishEventParams): Promise<IEvent> {
    this.ensureValidObjectId(params.organizerId, 'Invalid organizer id');
    this.ensureValidObjectId(params.eventId, 'Invalid event id');

    const event = await eventRepository.findOwnedByUser(params.eventId, params.organizerId);

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    const payload: EventPayload = {
      title: event.title,
      shortSummary: event.shortSummary,
      description: event.description,
      category: event.category,
      customCategory: undefined,
      tags: event.tags,
      coverImage: event.coverImage,
      attendanceMode: event.attendanceMode,
      venueName: event.venueName,
      addressLine1: event.addressLine1,
      addressLine2: event.addressLine2,
      city: event.city,
      state: event.state,
      country: event.country,
      postalCode: event.postalCode,
      onlineEventUrl: event.onlineEventUrl,
      startDateTime: event.startDateTime,
      endDateTime: event.endDateTime,
      timezone: event.timezone,
      registrationOpenAt: event.registrationOpenAt,
      registrationCloseAt: event.registrationCloseAt,
      capacity: event.capacity,
      rsvpLimit: event.rsvpLimit,
      visibility: event.visibility,
      organizerName: event.organizerName,
      organizerUrl: event.organizerUrl,
      contactEmail: event.contactEmail,
      refundPolicy: event.refundPolicy,
      tickets: event.tickets as unknown as EventTicketInput[],
      attendeeQuestions: event.attendeeQuestions as unknown as EventQuestionInput[],
    };

    this.validateCoreEventRules(payload, true);
    await this.ensureNoScheduleConflict(
      params.organizerId,
      event.startDateTime,
      event.endDateTime,
      params.eventId
    );

    const publishedEvent = await eventRepository.update(params.eventId, {
      $set: {
        status: 'published' as EventStatus,
        publishedAt: new Date(),
      },
    });

    if (!publishedEvent) {
      throw new AppError('Event not found', 404);
    }

    return publishedEvent;
  }

  async getMyEvent(organizerId: string, eventId: string): Promise<IEvent> {
    this.ensureValidObjectId(organizerId, 'Invalid organizer id');
    this.ensureValidObjectId(eventId, 'Invalid event id');

    const event = await eventRepository.findOwnedByUser(eventId, organizerId);

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    return event;
  }

  async listMyEvents(organizerId: string, page: number = 1, limit: number = 20) {
    this.ensureValidObjectId(organizerId, 'Invalid organizer id');
    return eventRepository.findMine(organizerId, page, limit);
  }

  async getPublicEvent(eventId: string): Promise<IEvent> {
    this.ensureValidObjectId(eventId, 'Invalid event id');

    const event = await eventRepository.findPublicById(eventId);

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    return event;
  }

  async listPublicEvents(options: {
    page?: number;
    limit?: number;
    query?: string;
    category?: string;
    attendanceMode?: 'in_person' | 'online' | 'hybrid';
    startDateFrom?: string;
    startDateTo?: string;
    sort?: 'soonest' | 'latest';
  }) {
    const page = options.page && options.page > 0 ? options.page : 1;
    const limit = options.limit && options.limit > 0 ? options.limit : 20;

    return eventRepository.findPublicEvents({
      page,
      limit,
      query: options.query?.trim() || undefined,
      category: options.category?.trim().toLowerCase() || undefined,
      attendanceMode: options.attendanceMode,
      startDateFrom: options.startDateFrom ? new Date(options.startDateFrom) : undefined,
      startDateTo: options.startDateTo ? new Date(options.startDateTo) : undefined,
      sort: options.sort,
    });
  }

  private ensureValidObjectId(value: string, message: string): void {
    if (!mongoose.Types.ObjectId.isValid(value)) {
      throw new AppError(message, 400);
    }
  }

  private mapPayloadToDocument(payload: Partial<EventPayload>): Partial<IEvent> {
    const normalizedCategory =
      payload.category === 'other'
        ? payload.customCategory?.trim().toLowerCase() || 'other'
        : payload.category?.trim().toLowerCase();

    return {
      ...payload,
      category: normalizedCategory,
      startDateTime: payload.startDateTime ? new Date(payload.startDateTime) : undefined,
      endDateTime: payload.endDateTime ? new Date(payload.endDateTime) : undefined,
      registrationOpenAt: payload.registrationOpenAt
        ? new Date(payload.registrationOpenAt)
        : undefined,
      registrationCloseAt: payload.registrationCloseAt
        ? new Date(payload.registrationCloseAt)
        : undefined,
      tickets: payload.tickets?.map((ticket) => ({
        ...ticket,
        currency: ticket.currency?.toUpperCase(),
        salesStartAt: ticket.salesStartAt ? new Date(ticket.salesStartAt) : undefined,
        salesEndAt: ticket.salesEndAt ? new Date(ticket.salesEndAt) : undefined,
      })) as unknown as IEventTicket[] | undefined,
      attendeeQuestions: payload.attendeeQuestions?.map((question) => ({
        ...question,
        options: question.options?.map((option) => option.trim()).filter(Boolean) ?? [],
      })) as unknown as IEventQuestion[] | undefined,
    };
  }

  private validateCoreEventRules(payload: Partial<EventPayload>, isPublishing: boolean): void {
    if (!payload.startDateTime || !payload.endDateTime) {
      throw new AppError('Start and end date are required', 400);
    }

    const startDate = new Date(payload.startDateTime);
    const endDate = new Date(payload.endDateTime);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new AppError('Invalid event date values', 400);
    }

    if (endDate <= startDate) {
      throw new AppError('Event end date must be after start date', 400);
    }

    if (payload.registrationOpenAt) {
      const registrationOpenAt = new Date(payload.registrationOpenAt);
      if (Number.isNaN(registrationOpenAt.getTime())) {
        throw new AppError('Invalid registration open date', 400);
      }

      if (registrationOpenAt > startDate) {
        throw new AppError('Registration open date must be on or before event start', 400);
      }
    }

    if (payload.registrationCloseAt) {
      const registrationCloseAt = new Date(payload.registrationCloseAt);

      if (Number.isNaN(registrationCloseAt.getTime())) {
        throw new AppError('Invalid registration close date', 400);
      }

      if (registrationCloseAt > startDate) {
        throw new AppError('Registration close date must be on or before event start', 400);
      }

      if (payload.registrationOpenAt) {
        const registrationOpenAt = new Date(payload.registrationOpenAt);

        if (registrationOpenAt > registrationCloseAt) {
          throw new AppError('Registration close date must be after registration open date', 400);
        }
      }
    }

    if (payload.attendanceMode === 'in_person' || payload.attendanceMode === 'hybrid') {
      if (!payload.venueName || !payload.addressLine1 || !payload.city || !payload.country) {
        throw new AppError(
          'Venue name, address, city, and country are required for in-person or hybrid events',
          400
        );
      }
    }

    if (payload.attendanceMode === 'online' || payload.attendanceMode === 'hybrid') {
      if (!payload.onlineEventUrl) {
        throw new AppError('Online event URL is required for online or hybrid events', 400);
      }

      try {
        new URL(payload.onlineEventUrl);
      } catch {
        throw new AppError('Online event URL is invalid', 400);
      }
    }

    if (!payload.capacity || payload.capacity < 1) {
      throw new AppError('Event capacity must be at least 1', 400);
    }

    if (payload.rsvpLimit !== undefined && payload.rsvpLimit !== null) {
      if (payload.rsvpLimit < 1) {
        throw new AppError('RSVP limit must be at least 1', 400);
      }

      if (payload.rsvpLimit > payload.capacity) {
        throw new AppError('RSVP limit cannot exceed event capacity', 400);
      }
    }

    if (payload.category === 'other') {
      if (!payload.customCategory || payload.customCategory.trim().length < 2) {
        throw new AppError('Custom category is required when category is other', 400);
      }
    }

    const totalTicketQuantity = (payload.tickets ?? []).reduce(
      (sum, ticket) => sum + ticket.quantity,
      0
    );
    if (payload.tickets && totalTicketQuantity > payload.capacity) {
      throw new AppError('Total ticket quantity cannot exceed event capacity', 400);
    }

    if (payload.tickets) {
      payload.tickets.forEach((ticket) => {
        if (ticket.quantity > payload.capacity!) {
          throw new AppError('Each ticket quantity must be on or below event capacity', 400);
        }

        if (ticket.type === 'paid') {
          if (typeof ticket.price !== 'number' || ticket.price <= 0) {
            throw new AppError('Paid tickets must include a valid price', 400);
          }

          if (!ticket.currency || ticket.currency.length !== 3) {
            throw new AppError('Paid tickets must include a valid 3-letter currency code', 400);
          }
        }

        if (ticket.salesStartAt && ticket.salesEndAt) {
          const salesStartAt = new Date(ticket.salesStartAt);
          const salesEndAt = new Date(ticket.salesEndAt);

          if (salesEndAt <= salesStartAt) {
            throw new AppError('Ticket sale end date must be after sale start date', 400);
          }
        }

        if (
          typeof ticket.minPerOrder === 'number' &&
          typeof ticket.maxPerOrder === 'number' &&
          ticket.minPerOrder > ticket.maxPerOrder
        ) {
          throw new AppError('Ticket minPerOrder cannot be greater than maxPerOrder', 400);
        }
      });
    }

    if (isPublishing) {
      if (!payload.tickets || payload.tickets.length === 0) {
        throw new AppError('At least one ticket is required before publishing', 400);
      }
    }
  }

  private validatePublishedUpdateRules(
    existingEvent: IEvent,
    nextStartDate: Date,
    nextEndDate: Date
  ): void {
    if (nextStartDate < existingEvent.startDateTime) {
      throw new AppError('Published event start date can only move forward', 400);
    }

    if (nextEndDate < existingEvent.endDateTime) {
      throw new AppError('Published event end date can only move forward', 400);
    }
  }

  private async ensureRsvpLimitNotBelowRegistered(
    eventId: string,
    payload: Partial<EventPayload>
  ): Promise<void> {
    if (!payload.capacity || payload.capacity < 1) {
      return;
    }

    const nextRsvpLimit = getEventRsvpLimit({
      capacity: payload.capacity,
      rsvpLimit: payload.rsvpLimit,
    } as Pick<IEvent, 'capacity' | 'rsvpLimit'>);

    const registeredCount = await rsvpRepository.countRegisteredByEvent(eventId);
    if (registeredCount > nextRsvpLimit) {
      throw new AppError(
        `RSVP limit cannot be below current registered attendees (${registeredCount})`,
        400
      );
    }
  }

  private async ensureNoScheduleConflict(
    organizerId: string,
    startDateTime: Date,
    endDateTime: Date,
    excludeEventId?: string
  ): Promise<void> {
    const conflictEvent = await eventRepository.findOverlappingEvent({
      organizerId,
      startDateTime,
      endDateTime,
      excludeEventId,
    });

    if (
      conflictEvent &&
      excludeEventId &&
      conflictEvent._id &&
      String(conflictEvent._id) === excludeEventId
    ) {
      return;
    }

    if (conflictEvent) {
      throw new AppError(`Schedule overlaps with existing event: ${conflictEvent.title}`, 409, [
        {
          conflictEventId: String(conflictEvent._id),
          conflictTitle: conflictEvent.title,
          conflictStartDateTime: conflictEvent.startDateTime,
          conflictEndDateTime: conflictEvent.endDateTime,
        },
      ]);
    }
  }
}

export const eventService = new EventService();
