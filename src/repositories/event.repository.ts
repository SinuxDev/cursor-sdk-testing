import mongoose, { FilterQuery } from 'mongoose';
import { BaseRepository } from './base.repository';
import { Event, IEvent } from '../models/event.model';

class EventRepository extends BaseRepository<IEvent> {
  constructor() {
    super(Event);
  }

  async findOwnedByUser(eventId: string, organizerId: string): Promise<IEvent | null> {
    return this.model
      .findOne({
        _id: eventId,
        organizerId,
      } as FilterQuery<IEvent>)
      .exec();
  }

  async findMine(organizerId: string, page: number, limit: number) {
    return this.findWithPagination({ organizerId } as FilterQuery<IEvent>, page, limit, {
      createdAt: -1,
    });
  }

  async findOverlappingEvent(params: {
    organizerId: string;
    startDateTime: Date;
    endDateTime: Date;
    excludeEventId?: string;
  }): Promise<IEvent | null> {
    const organizerObjectId = new mongoose.Types.ObjectId(params.organizerId);

    const query: FilterQuery<IEvent> = {
      organizerId: organizerObjectId,
      status: { $ne: 'cancelled' },
      startDateTime: { $lt: params.endDateTime },
      endDateTime: { $gt: params.startDateTime },
    };

    if (params.excludeEventId && mongoose.Types.ObjectId.isValid(params.excludeEventId)) {
      query._id = {
        $ne: new mongoose.Types.ObjectId(params.excludeEventId),
      } as unknown as IEvent['_id'];
    }

    return this.model.findOne(query).exec();
  }

  async findByIdRaw(eventId: string): Promise<IEvent | null> {
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return null;
    }

    return this.model.findById(new mongoose.Types.ObjectId(eventId)).exec();
  }

  async findPublicById(eventId: string): Promise<IEvent | null> {
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return null;
    }

    return this.model
      .findOne({
        _id: new mongoose.Types.ObjectId(eventId),
        status: 'published',
        visibility: 'public',
      } as FilterQuery<IEvent>)
      .exec();
  }

  async findPublicEvents(params: {
    page: number;
    limit: number;
    query?: string;
    category?: string;
    attendanceMode?: 'in_person' | 'online' | 'hybrid';
    startDateFrom?: Date;
    startDateTo?: Date;
    sort?: 'soonest' | 'latest';
  }) {
    const filter: FilterQuery<IEvent> = {
      status: 'published',
      visibility: 'public',
    };

    if (params.query) {
      const regex = new RegExp(params.query, 'i');
      filter.$or = [{ title: regex }, { shortSummary: regex }, { category: regex }];
    }

    if (params.category) {
      filter.category = params.category;
    }

    if (params.attendanceMode) {
      filter.attendanceMode = params.attendanceMode;
    }

    if (params.startDateFrom || params.startDateTo) {
      filter.startDateTime = {} as IEvent['startDateTime'];

      if (params.startDateFrom) {
        (filter.startDateTime as unknown as { $gte?: Date }).$gte = params.startDateFrom;
      }

      if (params.startDateTo) {
        (filter.startDateTime as unknown as { $lte?: Date }).$lte = params.startDateTo;
      }
    }

    const sort =
      params.sort === 'latest' ? { startDateTime: -1 as const } : { startDateTime: 1 as const };

    return this.findWithPagination(filter, params.page, params.limit, sort);
  }

  async findAdminEvents(params: {
    page: number;
    limit: number;
    query?: string;
    organizer?: string;
    organizerId?: string;
    status?: 'draft' | 'published' | 'cancelled';
    startDateFrom?: Date;
    startDateTo?: Date;
    sort?: 'start_asc' | 'start_desc' | 'created_desc';
  }) {
    const filter: FilterQuery<IEvent> = {};

    if (params.query) {
      const regex = new RegExp(params.query, 'i');
      filter.$or = [{ title: regex }, { shortSummary: regex }, { category: regex }];
    }

    if (params.organizer) {
      const organizerRegex = new RegExp(params.organizer, 'i');
      const organizerClauses: FilterQuery<IEvent>[] = [
        { organizerName: organizerRegex },
        { contactEmail: organizerRegex },
      ];

      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: organizerClauses }];
        delete filter.$or;
      } else {
        filter.$or = organizerClauses;
      }
    }

    if (params.organizerId && mongoose.Types.ObjectId.isValid(params.organizerId)) {
      filter.organizerId = new mongoose.Types.ObjectId(params.organizerId);
    }

    if (params.status) {
      filter.status = params.status;
    }

    if (params.startDateFrom || params.startDateTo) {
      filter.startDateTime = {} as IEvent['startDateTime'];

      if (params.startDateFrom) {
        (filter.startDateTime as unknown as { $gte?: Date }).$gte = params.startDateFrom;
      }

      if (params.startDateTo) {
        (filter.startDateTime as unknown as { $lte?: Date }).$lte = params.startDateTo;
      }
    }

    let sort: Record<string, 1 | -1> = { startDateTime: -1, createdAt: -1 };

    if (params.sort === 'start_asc') {
      sort = { startDateTime: 1, createdAt: -1 };
    } else if (params.sort === 'created_desc') {
      sort = { createdAt: -1 };
    }

    return this.findWithPagination(filter, params.page, params.limit, sort);
  }
}

export const eventRepository = new EventRepository();
