import mongoose, { FilterQuery } from 'mongoose';
import { BaseRepository } from './base.repository';
import { ITicket, Ticket } from '../models/ticket.model';

class TicketRepository extends BaseRepository<ITicket> {
  constructor() {
    super(Ticket);
  }

  async findByRsvpId(rsvpId: string): Promise<ITicket | null> {
    if (!mongoose.Types.ObjectId.isValid(rsvpId)) {
      return null;
    }

    return this.model
      .findOne({ rsvp: new mongoose.Types.ObjectId(rsvpId) } as FilterQuery<ITicket>)
      .exec();
  }

  async countCheckedInByEvent(eventId: string): Promise<number> {
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return 0;
    }

    return this.model
      .countDocuments({
        event: new mongoose.Types.ObjectId(eventId),
        isCheckedIn: true,
      } as FilterQuery<ITicket>)
      .exec();
  }

  async findByQrCodeAndEvent(eventId: string, qrCode: string): Promise<ITicket | null> {
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return null;
    }

    return this.model
      .findOne({
        event: new mongoose.Types.ObjectId(eventId),
        qrCode,
      } as FilterQuery<ITicket>)
      .exec();
  }

  async findByShortCodeAndEvent(eventId: string, shortCode: string): Promise<ITicket | null> {
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return null;
    }

    return this.model
      .findOne({
        event: new mongoose.Types.ObjectId(eventId),
        shortCode: shortCode.trim().toUpperCase(),
      } as FilterQuery<ITicket>)
      .exec();
  }

  async findByIdAndEvent(ticketId: string, eventId: string): Promise<ITicket | null> {
    if (!mongoose.Types.ObjectId.isValid(ticketId) || !mongoose.Types.ObjectId.isValid(eventId)) {
      return null;
    }

    return this.model
      .findOne({
        _id: new mongoose.Types.ObjectId(ticketId),
        event: new mongoose.Types.ObjectId(eventId),
      } as FilterQuery<ITicket>)
      .exec();
  }
}

export const ticketRepository = new TicketRepository();
