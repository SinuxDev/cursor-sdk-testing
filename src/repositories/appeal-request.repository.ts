import { FilterQuery } from 'mongoose';
import { BaseRepository } from './base.repository';
import { AppealRequest, IAppealRequest } from '../models/appeal-request.model';

interface ListAppealRequestsParams {
  page: number;
  limit: number;
  status?: IAppealRequest['status'];
  issueType?: IAppealRequest['issueType'];
  source?: IAppealRequest['source'];
  q?: string;
}

class AppealRequestRepository extends BaseRepository<IAppealRequest> {
  constructor() {
    super(AppealRequest);
  }

  async findByReferenceCode(referenceCode: string) {
    return this.model.findOne({ referenceCode: referenceCode.toUpperCase() }).exec();
  }

  async listWithFilters(params: ListAppealRequestsParams) {
    const filter: FilterQuery<IAppealRequest> = {};

    if (params.status) {
      filter.status = params.status;
    }

    if (params.issueType) {
      filter.issueType = params.issueType;
    }

    if (params.source) {
      filter.source = params.source;
    }

    if (params.q?.trim()) {
      const keyword = params.q.trim();
      filter.$or = [
        { referenceCode: { $regex: keyword, $options: 'i' } },
        { fullName: { $regex: keyword, $options: 'i' } },
        { workEmail: { $regex: keyword, $options: 'i' } },
        { company: { $regex: keyword, $options: 'i' } },
        { accountEmail: { $regex: keyword, $options: 'i' } },
      ];
    }

    const skip = (params.page - 1) * params.limit;

    const [data, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(params.limit).exec(),
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

export const appealRequestRepository = new AppealRequestRepository();
