import mongoose, { FilterQuery } from 'mongoose';
import { BaseRepository } from './base.repository';
import {
  DemoRequest,
  DemoRequestPriority,
  DemoRequestStatus,
  IDemoRequest,
} from '../models/demo-request.model';

interface ListDemoRequestsParams {
  page: number;
  limit: number;
  status?: DemoRequestStatus;
  priority?: DemoRequestPriority;
  ownerAdminId?: string;
  source?: 'public-website' | 'authenticated-website';
  q?: string;
  from?: Date;
  to?: Date;
  sla?: 'all' | 'on_time' | 'overdue';
  firstResponseSlaMinutes: number;
}

export interface DemoRequestAnalyticsSummary {
  total: number;
  newCount: number;
  scheduledCount: number;
  completedCount: number;
  wonCount: number;
  noShowCount: number;
  qualificationRate: number;
  scheduleRate: number;
  winRate: number;
  noShowRate: number;
  medianFirstResponseMinutes: number;
  slaBreachedCount: number;
}

export interface DemoRequestAnalyticsData {
  summary: DemoRequestAnalyticsSummary;
  statusDistribution: Record<DemoRequestStatus, number>;
  volumeTrend: Array<{ date: string; count: number }>;
}

class DemoRequestRepository extends BaseRepository<IDemoRequest> {
  constructor() {
    super(DemoRequest);
  }

  async listWithFilters(params: ListDemoRequestsParams) {
    const filter: FilterQuery<IDemoRequest> = {};

    if (params.status) {
      filter.status = params.status;
    }

    if (params.priority) {
      filter.priority = params.priority;
    }

    if (params.ownerAdminId && mongoose.Types.ObjectId.isValid(params.ownerAdminId)) {
      filter.ownerAdminId = new mongoose.Types.ObjectId(params.ownerAdminId);
    }

    if (params.source) {
      filter.source = params.source;
    }

    if (params.from || params.to) {
      filter.createdAt = {
        ...(params.from ? { $gte: params.from } : {}),
        ...(params.to ? { $lte: params.to } : {}),
      };
    }

    if (params.q?.trim()) {
      const keyword = params.q.trim();
      filter.$or = [
        { fullName: { $regex: keyword, $options: 'i' } },
        { workEmail: { $regex: keyword, $options: 'i' } },
        { company: { $regex: keyword, $options: 'i' } },
      ];
    }

    const now = new Date();
    const slaCutoff = new Date(now.getTime() - params.firstResponseSlaMinutes * 60 * 1000);

    if (params.sla === 'overdue') {
      filter.$and = [
        { status: 'new' },
        { createdAt: { $lte: slaCutoff } },
        {
          $or: [{ firstResponseAt: { $exists: false } }, { firstResponseAt: null }],
        },
      ];
    }

    if (params.sla === 'on_time') {
      filter.$or = [
        { firstResponseAt: { $exists: true, $ne: null }, createdAt: { $gt: slaCutoff } },
        {
          firstResponseAt: { $exists: true, $ne: null },
          $expr: {
            $lte: [
              {
                $divide: [{ $subtract: ['$firstResponseAt', '$createdAt'] }, 1000 * 60],
              },
              params.firstResponseSlaMinutes,
            ],
          },
        },
      ];
    }

    const skip = (params.page - 1) * params.limit;

    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(params.limit)
        .populate('ownerAdminId', 'name email role')
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    return {
      data,
      pagination: {
        total,
        page: params.page,
        limit: params.limit,
        totalPages: Math.ceil(total / params.limit),
        hasNextPage: params.page * params.limit < total,
        hasPrevPage: params.page > 1,
      },
    };
  }

  async findByIdWithOwner(id: string) {
    return this.model.findById(id).populate('ownerAdminId', 'name email role').exec();
  }

  async getAnalytics(params: {
    from: Date;
    to: Date;
    firstResponseSlaMinutes: number;
  }): Promise<DemoRequestAnalyticsData> {
    const filter = {
      createdAt: {
        $gte: params.from,
        $lte: params.to,
      },
    };

    const [
      total,
      statusRows,
      responseRows,
      volumeRows,
      newCount,
      scheduledCount,
      completedCount,
      wonCount,
      noShowCount,
      qualifiedCount,
      unqualifiedCount,
      slaBreachedCount,
    ] = await Promise.all([
      this.model.countDocuments(filter).exec(),
      this.model
        .aggregate<{
          _id: DemoRequestStatus;
          count: number;
        }>([{ $match: filter }, { $group: { _id: '$status', count: { $sum: 1 } } }])
        .exec(),
      this.model
        .aggregate<{ minutes: number }>([
          {
            $match: {
              ...filter,
              firstResponseAt: { $exists: true, $ne: null },
            },
          },
          {
            $project: {
              minutes: {
                $divide: [{ $subtract: ['$firstResponseAt', '$createdAt'] }, 1000 * 60],
              },
            },
          },
        ])
        .exec(),
      this.model
        .aggregate<{ _id: string; count: number }>([
          { $match: filter },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .exec(),
      this.model.countDocuments({ ...filter, status: 'new' }).exec(),
      this.model.countDocuments({ ...filter, status: 'scheduled' }).exec(),
      this.model.countDocuments({ ...filter, status: 'completed' }).exec(),
      this.model.countDocuments({ ...filter, status: 'won' }).exec(),
      this.model.countDocuments({ ...filter, status: 'no_show' }).exec(),
      this.model.countDocuments({ ...filter, status: 'qualified' }).exec(),
      this.model.countDocuments({ ...filter, status: 'unqualified' }).exec(),
      this.model
        .countDocuments({
          ...filter,
          status: 'new',
          firstResponseAt: { $exists: false },
          createdAt: {
            $gte: params.from,
            $lte: params.to,
          },
        })
        .exec(),
    ]);

    const statusDistribution = statusRows.reduce(
      (result, row) => {
        result[row._id] = row.count;
        return result;
      },
      {
        new: 0,
        contacted: 0,
        qualified: 0,
        unqualified: 0,
        scheduled: 0,
        completed: 0,
        no_show: 0,
        won: 0,
        lost: 0,
        nurture: 0,
      } as Record<DemoRequestStatus, number>
    );

    const sortedMinutes = responseRows.map((row) => row.minutes).sort((a, b) => a - b);

    const medianFirstResponseMinutes =
      sortedMinutes.length === 0
        ? 0
        : sortedMinutes.length % 2 === 1
          ? Math.round(sortedMinutes[(sortedMinutes.length - 1) / 2])
          : Math.round(
              (sortedMinutes[sortedMinutes.length / 2 - 1] +
                sortedMinutes[sortedMinutes.length / 2]) /
                2
            );

    const safePercent = (numerator: number, denominator: number) =>
      denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;

    const summary: DemoRequestAnalyticsSummary = {
      total,
      newCount,
      scheduledCount,
      completedCount,
      wonCount,
      noShowCount,
      qualificationRate: safePercent(qualifiedCount, qualifiedCount + unqualifiedCount),
      scheduleRate: safePercent(scheduledCount, total),
      winRate: safePercent(wonCount, completedCount),
      noShowRate: safePercent(noShowCount, scheduledCount),
      medianFirstResponseMinutes,
      slaBreachedCount,
    };

    return {
      summary,
      statusDistribution,
      volumeTrend: volumeRows.map((row) => ({ date: row._id, count: row.count })),
    };
  }
}

export const demoRequestRepository = new DemoRequestRepository();
