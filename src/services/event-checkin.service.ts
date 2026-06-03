import mongoose from 'mongoose';
import ExcelJS from 'exceljs';
import { IEvent } from '../models/event.model';
import { ITicket } from '../models/ticket.model';
import { eventRepository } from '../repositories/event.repository';
import { rsvpRepository } from '../repositories/rsvp.repository';
import { ticketRepository } from '../repositories/ticket.repository';
import { userRepository } from '../repositories/user.repository';
import { AppError } from '../utils/AppError';

type ActorRole = 'attendee' | 'organizer' | 'admin';
type CheckInSource = 'scanner' | 'manual' | 'lookup';

interface CheckInByQrParams {
  eventId: string;
  actorUserId: string;
  actorRole: ActorRole;
  qrCode: string;
  source: 'scanner' | 'manual';
}

interface CheckInByTicketParams {
  eventId: string;
  actorUserId: string;
  actorRole: ActorRole;
  ticketId: string;
  source: 'lookup';
}

interface UndoCheckInParams {
  eventId: string;
  actorUserId: string;
  actorRole: ActorRole;
  ticketId: string;
}

interface CheckInResult {
  eventId: string;
  ticketId: string;
  rsvpId: string;
  attendeeId: string;
  attendeeName: string;
  attendeeEmail: string;
  alreadyCheckedIn: boolean;
  checkedInAt: Date;
  source: CheckInSource;
}

interface UndoCheckInResult {
  eventId: string;
  ticketId: string;
  isCheckedIn: boolean;
}

interface AttendanceResult {
  eventId: string;
  registeredCount: number;
  waitlistedCount: number;
  cancelledCount: number;
  checkedInCount: number;
  attendanceRate: number;
}

interface EventAttendeesParams {
  eventId: string;
  actorUserId: string;
  actorRole: ActorRole;
  status: 'all' | 'registered' | 'waitlisted' | 'cancelled';
  checkIn: 'all' | 'checked_in' | 'not_checked_in';
  search?: string;
  page: number;
  limit: number;
}

interface EventAttendeeResult {
  rsvpId: string;
  status: 'registered' | 'waitlisted' | 'cancelled';
  waitlistPosition: number | null;
  joinedAt: Date;
  attendee: {
    id: string;
    name: string;
    email: string;
  };
  ticket: {
    id: string;
    code: string;
    isCheckedIn: boolean;
    checkedInAt: Date | null;
  } | null;
}

interface EventAttendeesResult {
  eventId: string;
  items: EventAttendeeResult[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

interface ExportEventAttendeesParams {
  eventId: string;
  actorUserId: string;
  actorRole: ActorRole;
  status: 'all' | 'registered' | 'waitlisted' | 'cancelled';
  checkIn: 'all' | 'checked_in' | 'not_checked_in';
  search?: string;
}

interface ExportBulkEventAttendeesXlsxParams {
  eventIds: string[];
  actorUserId: string;
  actorRole: ActorRole;
  status: 'all' | 'registered' | 'waitlisted' | 'cancelled';
  checkIn: 'all' | 'checked_in' | 'not_checked_in';
  search?: string;
}

interface BulkEventAttendeesXlsxExportResult {
  buffer: Buffer;
  filename: string;
}

class EventCheckInService {
  private async completeTicketCheckIn(params: {
    event: IEvent;
    ticket: ITicket;
    actorUserId: string;
    source: CheckInSource;
  }): Promise<CheckInResult> {
    const attendee = await userRepository.findById(String(params.ticket.user));
    if (!attendee) {
      throw new AppError('Ticket owner not found', 404);
    }

    if (params.ticket.isCheckedIn && params.ticket.checkedInAt) {
      return {
        eventId: String(params.event._id),
        ticketId: String(params.ticket._id),
        rsvpId: String(params.ticket.rsvp),
        attendeeId: String(attendee._id),
        attendeeName: attendee.name,
        attendeeEmail: attendee.email,
        alreadyCheckedIn: true,
        checkedInAt: params.ticket.checkedInAt,
        source: params.source,
      };
    }

    const now = new Date();
    const updated = await ticketRepository.update(String(params.ticket._id), {
      $set: {
        isCheckedIn: true,
        checkedInAt: now,
        checkedInBy: new mongoose.Types.ObjectId(params.actorUserId),
      },
    });

    if (!updated || !updated.checkedInAt) {
      throw new AppError('Unable to complete check-in', 500);
    }

    return {
      eventId: String(params.event._id),
      ticketId: String(updated._id),
      rsvpId: String(updated.rsvp),
      attendeeId: String(attendee._id),
      attendeeName: attendee.name,
      attendeeEmail: attendee.email,
      alreadyCheckedIn: false,
      checkedInAt: updated.checkedInAt,
      source: params.source,
    };
  }

  private buildWorksheetName(rawTitle: string, fallbackId: string, usedNames: Set<string>): string {
    const normalizedBase = rawTitle
      .trim()
      .replace(/[\\/*?:[\]]/g, ' ')
      .replace(/\s+/g, ' ')
      .slice(0, 24)
      .trim();

    const base = normalizedBase.length > 0 ? normalizedBase : `event-${fallbackId.slice(-6)}`;
    let candidate = `${base}-${fallbackId.slice(-4)}`.slice(0, 31);
    let counter = 1;

    while (usedNames.has(candidate)) {
      const suffix = `-${counter}`;
      const trimmedBase = base.slice(0, Math.max(1, 31 - suffix.length));
      candidate = `${trimmedBase}${suffix}`;
      counter += 1;
    }

    usedNames.add(candidate);
    return candidate;
  }

  async checkInByQr(params: CheckInByQrParams): Promise<CheckInResult> {
    const event = await this.ensureEventAccess(
      params.eventId,
      params.actorUserId,
      params.actorRole
    );

    const normalizedInput = params.qrCode.trim();
    const ticketByQr = await ticketRepository.findByQrCodeAndEvent(params.eventId, normalizedInput);
    const ticket =
      ticketByQr ||
      (await ticketRepository.findByShortCodeAndEvent(params.eventId, normalizedInput));

    if (!ticket) {
      throw new AppError('Ticket not found for this event', 404);
    }

    return this.completeTicketCheckIn({
      event,
      ticket,
      actorUserId: params.actorUserId,
      source: params.source,
    });
  }

  async checkInByTicket(params: CheckInByTicketParams): Promise<CheckInResult> {
    const event = await this.ensureEventAccess(
      params.eventId,
      params.actorUserId,
      params.actorRole
    );

    const ticket = await ticketRepository.findByIdAndEvent(params.ticketId, params.eventId);

    if (!ticket) {
      throw new AppError('Ticket not found for this event', 404);
    }

    return this.completeTicketCheckIn({
      event,
      ticket,
      actorUserId: params.actorUserId,
      source: params.source,
    });
  }

  async undoCheckIn(params: UndoCheckInParams): Promise<UndoCheckInResult> {
    await this.ensureEventAccess(params.eventId, params.actorUserId, params.actorRole);

    const ticket = await ticketRepository.findByIdAndEvent(params.ticketId, params.eventId);
    if (!ticket) {
      throw new AppError('Ticket not found for this event', 404);
    }

    if (!ticket.isCheckedIn) {
      return {
        eventId: params.eventId,
        ticketId: String(ticket._id),
        isCheckedIn: false,
      };
    }

    const updated = await ticketRepository.update(String(ticket._id), {
      $set: {
        isCheckedIn: false,
      },
      $unset: {
        checkedInAt: 1,
        checkedInBy: 1,
      },
    });

    if (!updated) {
      throw new AppError('Unable to undo check-in', 500);
    }

    return {
      eventId: params.eventId,
      ticketId: String(updated._id),
      isCheckedIn: false,
    };
  }

  async getAttendance(
    eventId: string,
    actorUserId: string,
    actorRole: ActorRole
  ): Promise<AttendanceResult> {
    const event = await this.ensureEventAccess(eventId, actorUserId, actorRole);

    const [registeredCount, waitlistedCount, cancelledCount, checkedInCount] = await Promise.all([
      rsvpRepository.countRegisteredByEvent(eventId),
      rsvpRepository.countWaitlistedByEvent(eventId),
      rsvpRepository.countCancelledByEvent(eventId),
      ticketRepository.countCheckedInByEvent(eventId),
    ]);

    const attendanceRate =
      registeredCount > 0 ? Number(((checkedInCount / registeredCount) * 100).toFixed(2)) : 0;

    return {
      eventId: String(event._id),
      registeredCount,
      waitlistedCount,
      cancelledCount,
      checkedInCount,
      attendanceRate,
    };
  }

  async listEventAttendees(params: EventAttendeesParams): Promise<EventAttendeesResult> {
    const event = await this.ensureEventAccess(
      params.eventId,
      params.actorUserId,
      params.actorRole
    );

    const safePage = Number.isInteger(params.page) && params.page > 0 ? params.page : 1;
    const safeLimit = Number.isInteger(params.limit) && params.limit > 0 ? params.limit : 20;

    const result = await rsvpRepository.listEventAttendees({
      eventId: params.eventId,
      status: params.status,
      checkIn: params.checkIn,
      search: params.search,
      page: safePage,
      limit: safeLimit,
    });

    const totalPages = result.total > 0 ? Math.ceil(result.total / safeLimit) : 0;

    return {
      eventId: String(event._id),
      items: result.items.map((item) => ({
        rsvpId: String(item._id),
        status: item.status,
        waitlistPosition: item.waitlistPosition ?? null,
        joinedAt: item.createdAt,
        attendee: {
          id: String(item.attendee._id),
          name: item.attendee.name,
          email: item.attendee.email,
        },
        ticket: item.ticket?._id
          ? {
              id: String(item.ticket._id),
              code: item.ticket.shortCode ?? item.ticket.qrCode,
              isCheckedIn: Boolean(item.ticket.isCheckedIn),
              checkedInAt: item.ticket.checkedInAt ?? null,
            }
          : null,
      })),
      pagination: {
        total: result.total,
        page: safePage,
        limit: safeLimit,
        totalPages,
        hasNextPage: totalPages > 0 ? safePage < totalPages : false,
        hasPrevPage: safePage > 1,
      },
    };
  }

  async exportEventAttendeesCsv(params: ExportEventAttendeesParams): Promise<string> {
    await this.ensureEventAccess(params.eventId, params.actorUserId, params.actorRole);

    const items = await rsvpRepository.listEventAttendeesForExport({
      eventId: params.eventId,
      status: params.status,
      checkIn: params.checkIn,
      search: params.search,
    });

    const rows = items.map((item) => {
      const checkInState = item.ticket?.isCheckedIn ? 'checked_in' : 'not_checked_in';
      const checkedInAt = item.ticket?.checkedInAt ? item.ticket.checkedInAt.toISOString() : '';

      return [
        String(item._id),
        item.attendee.name,
        item.attendee.email,
        item.status,
        item.waitlistPosition ?? '',
        checkInState,
        checkedInAt,
        item.createdAt.toISOString(),
      ];
    });

    const headers = [
      'rsvp_id',
      'attendee_name',
      'attendee_email',
      'status',
      'waitlist_position',
      'check_in_state',
      'checked_in_at',
      'joined_at',
    ];

    const escapeCell = (value: string | number): string => {
      const normalized = String(value);
      const escaped = normalized.replace(/"/g, '""');
      return `"${escaped}"`;
    };

    const csvRows = [headers.map(escapeCell).join(',')]
      .concat(rows.map((row) => row.map((cell) => escapeCell(cell as string | number)).join(',')))
      .join('\n');

    return csvRows;
  }

  async exportBulkEventAttendeesXlsx(
    params: ExportBulkEventAttendeesXlsxParams
  ): Promise<BulkEventAttendeesXlsxExportResult> {
    if (params.eventIds.length === 0) {
      throw new AppError('At least one event id is required', 400);
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'EventForge';
    workbook.created = new Date();

    const usedWorksheetNames = new Set<string>();

    for (const eventId of params.eventIds) {
      const event = await this.ensureEventAccess(eventId, params.actorUserId, params.actorRole);
      const attendees = await rsvpRepository.listEventAttendeesForExport({
        eventId,
        status: params.status,
        checkIn: params.checkIn,
        search: params.search,
      });

      const sheetName = this.buildWorksheetName(event.title, String(event._id), usedWorksheetNames);
      const worksheet = workbook.addWorksheet(sheetName);

      worksheet.getCell('A1').value = 'Event';
      worksheet.getCell('B1').value = event.title;
      worksheet.getCell('A2').value = 'Start';
      worksheet.getCell('B2').value = event.startDateTime.toISOString();
      worksheet.getCell('A3').value = 'Timezone';
      worksheet.getCell('B3').value = event.timezone;
      worksheet.getCell('D1').value = 'Exported At';
      worksheet.getCell('E1').value = new Date().toISOString();

      const headerRow = worksheet.getRow(5);
      headerRow.values = [
        'rsvp_id',
        'attendee_name',
        'attendee_email',
        'status',
        'waitlist_position',
        'check_in_state',
        'checked_in_at',
        'joined_at',
        'ticket_code',
      ];
      headerRow.font = { bold: true };

      attendees.forEach((item) => {
        worksheet.addRow([
          String(item._id),
          item.attendee.name,
          item.attendee.email,
          item.status,
          item.waitlistPosition ?? '',
          item.ticket?.isCheckedIn ? 'checked_in' : 'not_checked_in',
          item.ticket?.checkedInAt ? item.ticket.checkedInAt.toISOString() : '',
          item.createdAt.toISOString(),
          item.ticket?.shortCode ?? item.ticket?.qrCode ?? '',
        ]);
      });

      worksheet.columns = [
        { width: 30 },
        { width: 24 },
        { width: 30 },
        { width: 14 },
        { width: 18 },
        { width: 16 },
        { width: 24 },
        { width: 24 },
        { width: 36 },
      ];

      worksheet.views = [{ state: 'frozen', ySplit: 5 }];
      worksheet.autoFilter = {
        from: { row: 5, column: 1 },
        to: { row: 5, column: 9 },
      };
    }

    const raw = await workbook.xlsx.writeBuffer();
    const buffer = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
    const dateLabel = new Date().toISOString().slice(0, 10);

    return {
      buffer,
      filename: `event-attendees-bulk-${dateLabel}.xlsx`,
    };
  }

  private async ensureEventAccess(
    eventId: string,
    actorUserId: string,
    actorRole: ActorRole
  ): Promise<IEvent> {
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      throw new AppError('Invalid event id', 400);
    }

    if (!mongoose.Types.ObjectId.isValid(actorUserId)) {
      throw new AppError('Invalid actor id', 400);
    }

    if (actorRole === 'admin') {
      const event = await eventRepository.findByIdRaw(eventId);
      if (!event) {
        throw new AppError('Event not found', 404);
      }

      return event;
    }

    const event = await eventRepository.findByIdRaw(eventId);
    if (!event) {
      throw new AppError('Event not found', 404);
    }

    if (String(event.organizerId) !== actorUserId) {
      throw new AppError('Forbidden: not your event', 403);
    }

    return event;
  }
}

export const eventCheckInService = new EventCheckInService();
