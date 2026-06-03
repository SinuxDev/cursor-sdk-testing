import mongoose, { FilterQuery } from 'mongoose';
import { BaseRepository } from './base.repository';
import { AdminAuditLog, IAdminAuditLog } from '../models/admin-audit-log.model';

class AdminAuditLogRepository extends BaseRepository<IAdminAuditLog> {
  constructor() {
    super(AdminAuditLog);
  }

  async findWithFilters(params: {
    page: number;
    limit: number;
    action?: IAdminAuditLog['action'];
    targetUserId?: string;
    actorUserId?: string;
  }) {
    const filter: FilterQuery<IAdminAuditLog> = {};

    if (params.action) {
      filter.action = params.action;
    }

    if (params.targetUserId && mongoose.Types.ObjectId.isValid(params.targetUserId)) {
      filter.targetUserId = new mongoose.Types.ObjectId(params.targetUserId);
    }

    if (params.actorUserId && mongoose.Types.ObjectId.isValid(params.actorUserId)) {
      filter.actorUserId = new mongoose.Types.ObjectId(params.actorUserId);
    }

    const skip = (params.page - 1) * params.limit;

    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(params.limit)
        .populate('actorUserId', 'name email role')
        .populate('targetUserId', 'name email role')
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
}

export const adminAuditLogRepository = new AdminAuditLogRepository();
