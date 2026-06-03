import { BaseRepository } from './base.repository';
import { AdminEmailCampaign, IAdminEmailCampaign } from '../models/admin-email-campaign.model';

class AdminEmailCampaignRepository extends BaseRepository<IAdminEmailCampaign> {
  constructor() {
    super(AdminEmailCampaign);
  }

  async listWithPagination(page: number, limit: number) {
    return this.findWithPagination({}, page, limit, { createdAt: -1 });
  }

  async getDeliveryTrend(params: { from: Date; to: Date }) {
    const rows = await this.model
      .aggregate<{ _id: string; sent: number; failed: number }>([
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
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            sent: { $sum: '$sentCount' },
            failed: { $sum: '$failedCount' },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .exec();

    return rows;
  }
}

export const adminEmailCampaignRepository = new AdminEmailCampaignRepository();
