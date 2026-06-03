import mongoose, { FilterQuery, PipelineStage } from 'mongoose';
import { BaseRepository } from './base.repository';
import { IRsvp, Rsvp } from '../models/rsvp.model';

export type ManagedRsvpTab = 'upcoming' | 'waitlisted' | 'past' | 'cancelled' | 'all';
export type ManagedRsvpSort = 'eventStartAsc' | 'eventStartDesc' | 'createdDesc';

export interface ManagedRsvpQueryParams {
  userId: string;
  tab: ManagedRsvpTab;
  search?: string;
  page: number;
  limit: number;
  sort: ManagedRsvpSort;
  now: Date;
}

interface ManagedRsvpAggregationItem {
  _id: mongoose.Types.ObjectId;
  status: IRsvp['status'];
  waitlistPosition?: number;
  createdAt: Date;
  updatedAt: Date;
  tab: Exclude<ManagedRsvpTab, 'all'>;
  event: {
    _id: mongoose.Types.ObjectId;
    title: string;
    shortSummary?: string;
    startDateTime: Date;
    endDateTime: Date;
    timezone: string;
    attendanceMode: string;
    venueName?: string;
    city?: string;
    country?: string;
    registrationCloseAt?: Date;
    status: string;
    coverImage?: string;
  };
}

interface ManagedRsvpCountByTab {
  _id: Exclude<ManagedRsvpTab, 'all'>;
  count: number;
}

export interface ManagedRsvpsAggregationResult {
  items: ManagedRsvpAggregationItem[];
  total: number;
  countsByTab: Record<Exclude<ManagedRsvpTab, 'all'>, number>;
}

export type EventAttendeeStatusFilter = 'all' | IRsvp['status'];
export type EventAttendeeCheckInFilter = 'all' | 'checked_in' | 'not_checked_in';

export interface EventAttendeesQueryParams {
  eventId: string;
  status: EventAttendeeStatusFilter;
  checkIn: EventAttendeeCheckInFilter;
  search?: string;
  page: number;
  limit: number;
}

export interface EventAttendeeAggregationItem {
  _id: mongoose.Types.ObjectId;
  status: IRsvp['status'];
  waitlistPosition?: number;
  createdAt: Date;
  attendee: {
    _id: mongoose.Types.ObjectId;
    name: string;
    email: string;
  };
  ticket?: {
    _id: mongoose.Types.ObjectId;
    qrCode: string;
    shortCode?: string;
    isCheckedIn: boolean;
    checkedInAt?: Date;
  };
}

export interface EventAttendeesAggregationResult {
  items: EventAttendeeAggregationItem[];
  total: number;
}

export interface EventAttendeesExportQueryParams {
  eventId: string;
  status: EventAttendeeStatusFilter;
  checkIn: EventAttendeeCheckInFilter;
  search?: string;
}

class RsvpRepository extends BaseRepository<IRsvp> {
  constructor() {
    super(Rsvp);
  }

  async findByEventAndUser(eventId: string, userId: string): Promise<IRsvp | null> {
    if (!mongoose.Types.ObjectId.isValid(eventId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return null;
    }

    return this.model
      .findOne({
        event: new mongoose.Types.ObjectId(eventId),
        user: new mongoose.Types.ObjectId(userId),
      } as FilterQuery<IRsvp>)
      .exec();
  }

  async countRegisteredByEvent(eventId: string): Promise<number> {
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return 0;
    }

    return this.model
      .countDocuments({
        event: new mongoose.Types.ObjectId(eventId),
        status: 'registered',
      } as FilterQuery<IRsvp>)
      .exec();
  }

  async countWaitlistedByEvent(eventId: string): Promise<number> {
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return 0;
    }

    return this.model
      .countDocuments({
        event: new mongoose.Types.ObjectId(eventId),
        status: 'waitlisted',
      } as FilterQuery<IRsvp>)
      .exec();
  }

  async countCancelledByEvent(eventId: string): Promise<number> {
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return 0;
    }

    return this.model
      .countDocuments({
        event: new mongoose.Types.ObjectId(eventId),
        status: 'cancelled',
      } as FilterQuery<IRsvp>)
      .exec();
  }

  async listByUser(userId: string): Promise<IRsvp[]> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return [];
    }

    return this.model
      .find({ user: new mongoose.Types.ObjectId(userId) } as FilterQuery<IRsvp>)
      .sort({ createdAt: -1 })
      .populate('event')
      .exec();
  }

  async listByEvent(eventId: string): Promise<IRsvp[]> {
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return [];
    }

    return this.model
      .find({ event: new mongoose.Types.ObjectId(eventId) } as FilterQuery<IRsvp>)
      .sort({ createdAt: 1 })
      .exec();
  }

  async findByIdOwnedByUser(rsvpId: string, userId: string): Promise<IRsvp | null> {
    if (!mongoose.Types.ObjectId.isValid(rsvpId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return null;
    }

    return this.model
      .findOne({
        _id: new mongoose.Types.ObjectId(rsvpId),
        user: new mongoose.Types.ObjectId(userId),
      } as FilterQuery<IRsvp>)
      .exec();
  }

  async findFirstWaitlisted(eventId: string): Promise<IRsvp | null> {
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return null;
    }

    return this.model
      .findOne({
        event: new mongoose.Types.ObjectId(eventId),
        status: 'waitlisted',
      } as FilterQuery<IRsvp>)
      .sort({ waitlistPosition: 1, createdAt: 1 })
      .exec();
  }

  async listManagedByUser(params: ManagedRsvpQueryParams): Promise<ManagedRsvpsAggregationResult> {
    if (!mongoose.Types.ObjectId.isValid(params.userId)) {
      return {
        items: [],
        total: 0,
        countsByTab: {
          upcoming: 0,
          waitlisted: 0,
          past: 0,
          cancelled: 0,
        },
      };
    }

    const safePage = Number.isInteger(params.page) && params.page > 0 ? params.page : 1;
    const safeLimit = Number.isInteger(params.limit) && params.limit > 0 ? params.limit : 10;
    const skip = (safePage - 1) * safeLimit;

    let sortStage: Record<string, 1 | -1>;
    if (params.sort === 'eventStartDesc') {
      sortStage = { 'event.startDateTime': -1, createdAt: -1 };
    } else if (params.sort === 'createdDesc') {
      sortStage = { createdAt: -1 };
    } else {
      sortStage = { 'event.startDateTime': 1, createdAt: -1 };
    }

    const searchText = params.search?.trim();
    const searchMatch =
      searchText && searchText.length > 0
        ? {
            $or: [
              { 'event.title': { $regex: searchText, $options: 'i' } },
              { 'event.shortSummary': { $regex: searchText, $options: 'i' } },
            ],
          }
        : null;

    const tabMatch =
      params.tab === 'all'
        ? null
        : {
            $match: {
              tab: params.tab,
            },
          };

    const basePipeline: PipelineStage[] = [
      {
        $match: {
          user: new mongoose.Types.ObjectId(params.userId),
        },
      },
      {
        $lookup: {
          from: 'events',
          localField: 'event',
          foreignField: '_id',
          as: 'event',
        },
      },
      {
        $unwind: '$event',
      },
      {
        $addFields: {
          tab: {
            $switch: {
              branches: [
                {
                  case: { $eq: ['$status', 'cancelled'] },
                  then: 'cancelled',
                },
                {
                  case: { $eq: ['$status', 'waitlisted'] },
                  then: 'waitlisted',
                },
                {
                  case: { $lt: ['$event.startDateTime', params.now] },
                  then: 'past',
                },
              ],
              default: 'upcoming',
            },
          },
        },
      },
    ];

    if (searchMatch) {
      basePipeline.push({ $match: searchMatch });
    }

    const listPipeline: PipelineStage[] = [...basePipeline];

    if (tabMatch) {
      listPipeline.push(tabMatch);
    }

    listPipeline.push({ $sort: sortStage }, { $skip: skip }, { $limit: safeLimit });

    listPipeline.push({
      $project: {
        _id: 1,
        status: 1,
        waitlistPosition: 1,
        createdAt: 1,
        updatedAt: 1,
        tab: 1,
        event: {
          _id: '$event._id',
          title: '$event.title',
          shortSummary: '$event.shortSummary',
          startDateTime: '$event.startDateTime',
          endDateTime: '$event.endDateTime',
          timezone: '$event.timezone',
          attendanceMode: '$event.attendanceMode',
          venueName: '$event.venueName',
          city: '$event.city',
          country: '$event.country',
          registrationCloseAt: '$event.registrationCloseAt',
          status: '$event.status',
          coverImage: '$event.coverImage',
        },
      },
    });

    const totalPipeline: PipelineStage[] = [...basePipeline];
    if (tabMatch) {
      totalPipeline.push(tabMatch);
    }
    totalPipeline.push({ $count: 'count' });

    const countsPipeline: PipelineStage[] = [
      ...basePipeline,
      {
        $group: {
          _id: '$tab',
          count: { $sum: 1 },
        },
      },
    ];

    const [items, totalRows, groupedCounts] = await Promise.all([
      this.model.aggregate(listPipeline).exec() as Promise<ManagedRsvpAggregationItem[]>,
      this.model.aggregate(totalPipeline).exec() as Promise<Array<{ count: number }>>,
      this.model.aggregate(countsPipeline).exec() as Promise<ManagedRsvpCountByTab[]>,
    ]);

    const countsByTab: Record<Exclude<ManagedRsvpTab, 'all'>, number> = {
      upcoming: 0,
      waitlisted: 0,
      past: 0,
      cancelled: 0,
    };

    groupedCounts.forEach((row) => {
      if (row._id in countsByTab) {
        countsByTab[row._id] = row.count;
      }
    });

    return {
      items,
      total: totalRows[0]?.count ?? 0,
      countsByTab,
    };
  }

  async listEventAttendees(
    params: EventAttendeesQueryParams
  ): Promise<EventAttendeesAggregationResult> {
    if (!mongoose.Types.ObjectId.isValid(params.eventId)) {
      return {
        items: [],
        total: 0,
      };
    }

    const safePage = Number.isInteger(params.page) && params.page > 0 ? params.page : 1;
    const safeLimit = Number.isInteger(params.limit) && params.limit > 0 ? params.limit : 20;
    const skip = (safePage - 1) * safeLimit;

    const searchText = params.search?.trim();
    const searchMatch =
      searchText && searchText.length > 0
        ? {
            $or: [
              { 'attendee.name': { $regex: searchText, $options: 'i' } },
              { 'attendee.email': { $regex: searchText, $options: 'i' } },
            ],
          }
        : null;

    const statusMatch =
      params.status === 'all'
        ? null
        : {
            $match: {
              status: params.status,
            },
          };

    const checkInMatch =
      params.checkIn === 'all'
        ? null
        : params.checkIn === 'checked_in'
          ? {
              $match: {
                'ticket.isCheckedIn': true,
              },
            }
          : {
              $match: {
                $or: [{ ticket: { $exists: false } }, { 'ticket.isCheckedIn': false }],
              },
            };

    const basePipeline: PipelineStage[] = [
      {
        $match: {
          event: new mongoose.Types.ObjectId(params.eventId),
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'attendee',
        },
      },
      {
        $unwind: '$attendee',
      },
      {
        $lookup: {
          from: 'tickets',
          localField: '_id',
          foreignField: 'rsvp',
          as: 'ticket',
        },
      },
      {
        $unwind: {
          path: '$ticket',
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    if (searchMatch) {
      basePipeline.push({ $match: searchMatch });
    }

    if (statusMatch) {
      basePipeline.push(statusMatch);
    }

    if (checkInMatch) {
      basePipeline.push(checkInMatch);
    }

    const listPipeline: PipelineStage[] = [
      ...basePipeline,
      {
        $sort: {
          createdAt: -1,
        },
      },
      { $skip: skip },
      { $limit: safeLimit },
      {
        $project: {
          _id: 1,
          status: 1,
          waitlistPosition: 1,
          createdAt: 1,
          attendee: {
            _id: '$attendee._id',
            name: '$attendee.name',
            email: '$attendee.email',
          },
          ticket: {
            _id: '$ticket._id',
            qrCode: '$ticket.qrCode',
            shortCode: '$ticket.shortCode',
            isCheckedIn: '$ticket.isCheckedIn',
            checkedInAt: '$ticket.checkedInAt',
          },
        },
      },
    ];

    const totalPipeline: PipelineStage[] = [...basePipeline, { $count: 'count' }];

    const [items, totalRows] = await Promise.all([
      this.model.aggregate(listPipeline).exec() as Promise<EventAttendeeAggregationItem[]>,
      this.model.aggregate(totalPipeline).exec() as Promise<Array<{ count: number }>>,
    ]);

    return {
      items,
      total: totalRows[0]?.count ?? 0,
    };
  }

  async listEventAttendeesForExport(
    params: EventAttendeesExportQueryParams
  ): Promise<EventAttendeeAggregationItem[]> {
    if (!mongoose.Types.ObjectId.isValid(params.eventId)) {
      return [];
    }

    const searchText = params.search?.trim();
    const searchMatch =
      searchText && searchText.length > 0
        ? {
            $or: [
              { 'attendee.name': { $regex: searchText, $options: 'i' } },
              { 'attendee.email': { $regex: searchText, $options: 'i' } },
            ],
          }
        : null;

    const statusMatch =
      params.status === 'all'
        ? null
        : {
            $match: {
              status: params.status,
            },
          };

    const checkInMatch =
      params.checkIn === 'all'
        ? null
        : params.checkIn === 'checked_in'
          ? {
              $match: {
                'ticket.isCheckedIn': true,
              },
            }
          : {
              $match: {
                $or: [{ ticket: { $exists: false } }, { 'ticket.isCheckedIn': false }],
              },
            };

    const pipeline: PipelineStage[] = [
      {
        $match: {
          event: new mongoose.Types.ObjectId(params.eventId),
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'attendee',
        },
      },
      {
        $unwind: '$attendee',
      },
      {
        $lookup: {
          from: 'tickets',
          localField: '_id',
          foreignField: 'rsvp',
          as: 'ticket',
        },
      },
      {
        $unwind: {
          path: '$ticket',
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    if (searchMatch) {
      pipeline.push({ $match: searchMatch });
    }

    if (statusMatch) {
      pipeline.push(statusMatch);
    }

    if (checkInMatch) {
      pipeline.push(checkInMatch);
    }

    pipeline.push(
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $project: {
          _id: 1,
          status: 1,
          waitlistPosition: 1,
          createdAt: 1,
          attendee: {
            _id: '$attendee._id',
            name: '$attendee.name',
            email: '$attendee.email',
          },
          ticket: {
            _id: '$ticket._id',
            qrCode: '$ticket.qrCode',
            shortCode: '$ticket.shortCode',
            isCheckedIn: '$ticket.isCheckedIn',
            checkedInAt: '$ticket.checkedInAt',
          },
        },
      }
    );

    return this.model.aggregate(pipeline).exec() as Promise<EventAttendeeAggregationItem[]>;
  }
}

export const rsvpRepository = new RsvpRepository();
