import mongoose from 'mongoose';
import { BaseRepository } from './base.repository';
import {
  AdminEmailDeliveryLog,
  IAdminEmailDeliveryLog,
} from '../models/admin-email-delivery-log.model';

class AdminEmailDeliveryLogRepository extends BaseRepository<IAdminEmailDeliveryLog> {
  constructor() {
    super(AdminEmailDeliveryLog);
  }

  async listByCampaign(campaignId: string, page: number, limit: number) {
    return this.findWithPagination(
      { campaignId: new mongoose.Types.ObjectId(campaignId) },
      page,
      limit,
      { createdAt: -1 }
    );
  }
}

export const adminEmailDeliveryLogRepository = new AdminEmailDeliveryLogRepository();
