import { adminEmailCampaignRepository } from '../repositories/admin-email-campaign.repository';
import { complianceCaseRepository } from '../repositories/compliance-case.repository';
import { userRepository } from '../repositories/user.repository';

type ChartRange = '7d' | '30d' | '90d';

function getRangeStart(range: ChartRange): Date {
  const now = new Date();
  const dayCount = range === '7d' ? 7 : range === '90d' ? 90 : 30;

  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (dayCount - 1), 0, 0, 0, 0)
  );

  return start;
}

function buildDateLabels(from: Date, to: Date): string[] {
  const labels: string[] = [];
  const cursor = new Date(from);

  while (cursor <= to) {
    labels.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return labels;
}

class AdminOverviewService {
  async getCharts(range: ChartRange) {
    const from = getRangeStart(range);
    const now = new Date();
    const to = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999)
    );

    const [roleDistribution, complianceSeverity, emailRows] = await Promise.all([
      userRepository.getRoleDistribution(),
      complianceCaseRepository.getSeverityDistribution({ from, to }),
      adminEmailCampaignRepository.getDeliveryTrend({ from, to }),
    ]);

    const labels = buildDateLabels(from, to);
    const emailByDay = new Map(emailRows.map((row) => [row._id, row]));

    const emailDeliveryTrend = labels.map((date) => {
      const row = emailByDay.get(date);
      return {
        date,
        sent: row?.sent ?? 0,
        failed: row?.failed ?? 0,
      };
    });

    return {
      roleDistribution,
      complianceSeverity,
      emailDeliveryTrend,
      meta: {
        range,
        generatedAt: new Date().toISOString(),
      },
    };
  }
}

export const adminOverviewService = new AdminOverviewService();
