import mongoose, { FilterQuery } from 'mongoose';
import { BaseRepository } from './base.repository';
import { ComplianceCase, IComplianceCase } from '../models/compliance-case.model';

class ComplianceCaseRepository extends BaseRepository<IComplianceCase> {
  constructor() {
    super(ComplianceCase);
  }

  async findWithFilters(params: {
    page: number;
    limit: number;
    status?: IComplianceCase['status'];
    severity?: IComplianceCase['severity'];
  }) {
    const filter: FilterQuery<IComplianceCase> = {};

    if (params.status) {
      filter.status = params.status;
    }

    if (params.severity) {
      filter.severity = params.severity;
    }

    const skip = (params.page - 1) * params.limit;

    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(params.limit)
        .populate('createdByAdminId', 'name email role')
        .populate('assignedAdminId', 'name email role')
        .populate('linkedUserId', 'name email role isSuspended')
        .populate('linkedEventId', 'title status startDateTime')
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

  async getRiskOverview() {
    const [
      totalOpenCases,
      totalHighSeverityCases,
      totalCriticalCases,
      totalSuspendedUsers,
      totalResolvedCases,
      unresolvedCases,
      recentCases,
    ] = await Promise.all([
      this.model.countDocuments({ status: { $in: ['open', 'in_review', 'actioned'] } }).exec(),
      this.model
        .countDocuments({ severity: { $in: ['high', 'critical'] }, status: { $ne: 'resolved' } })
        .exec(),
      this.model.countDocuments({ severity: 'critical', status: { $ne: 'resolved' } }).exec(),
      mongoose.model('User').countDocuments({ isSuspended: true }).exec(),
      this.model.countDocuments({ status: 'resolved' }).exec(),
      this.model.countDocuments({ status: { $ne: 'resolved' } }).exec(),
      this.model
        .find({ status: { $in: ['open', 'in_review', 'actioned'] } })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title severity status category createdAt')
        .lean()
        .exec(),
    ]);

    const resolutionRate =
      totalResolvedCases + unresolvedCases > 0
        ? Math.round((totalResolvedCases / (totalResolvedCases + unresolvedCases)) * 100)
        : 0;

    return {
      totalOpenCases,
      totalHighSeverityCases,
      totalCriticalCases,
      totalSuspendedUsers,
      resolutionRate,
      recentCases,
    };
  }

  async getSeverityDistribution(params: { from: Date; to: Date }) {
    const rows = await this.model
      .aggregate<{ _id: IComplianceCase['severity']; count: number }>([
        {
          $match: {
            createdAt: {
              $gte: params.from,
              $lte: params.to,
            },
          },
        },
        {
          $group: {
            _id: '$severity',
            count: { $sum: 1 },
          },
        },
      ])
      .exec();

    return rows.reduce(
      (result, row) => {
        result[row._id] = row.count;
        return result;
      },
      { low: 0, medium: 0, high: 0, critical: 0 } as Record<IComplianceCase['severity'], number>
    );
  }
}

export const complianceCaseRepository = new ComplianceCaseRepository();
