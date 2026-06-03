import mongoose from 'mongoose';
import { IComplianceCase } from '../models/compliance-case.model';
import { complianceCaseRepository } from '../repositories/compliance-case.repository';
import { adminAuditLogRepository } from '../repositories/admin-audit-log.repository';
import { AppError } from '../utils/AppError';

interface ListComplianceCasesParams {
  page?: number;
  limit?: number;
  status?: IComplianceCase['status'];
  severity?: IComplianceCase['severity'];
}

interface CreateComplianceCaseParams {
  actorUserId: string;
  title: string;
  description: string;
  category: IComplianceCase['category'];
  severity: IComplianceCase['severity'];
  linkedUserId?: string;
  linkedEventId?: string;
  assignedAdminId?: string;
  dueAt?: string;
}

interface UpdateComplianceCaseStatusParams {
  actorUserId: string;
  caseId: string;
  status: IComplianceCase['status'];
  resolutionNote?: string;
  reason: string;
}

class ComplianceService {
  async listCases(params: ListComplianceCasesParams) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;

    return complianceCaseRepository.findWithFilters({
      page,
      limit,
      status: params.status,
      severity: params.severity,
    });
  }

  async getRiskOverview() {
    return complianceCaseRepository.getRiskOverview();
  }

  async createCase(params: CreateComplianceCaseParams) {
    const createdCase = await complianceCaseRepository.create({
      title: params.title.trim(),
      description: params.description.trim(),
      category: params.category,
      severity: params.severity,
      status: 'open',
      linkedUserId: params.linkedUserId
        ? new mongoose.Types.ObjectId(params.linkedUserId)
        : undefined,
      linkedEventId: params.linkedEventId
        ? new mongoose.Types.ObjectId(params.linkedEventId)
        : undefined,
      assignedAdminId: params.assignedAdminId
        ? new mongoose.Types.ObjectId(params.assignedAdminId)
        : undefined,
      createdByAdminId: new mongoose.Types.ObjectId(params.actorUserId),
      dueAt: params.dueAt ? new Date(params.dueAt) : undefined,
    } as Partial<IComplianceCase>);

    await adminAuditLogRepository.create({
      actorUserId: new mongoose.Types.ObjectId(params.actorUserId),
      targetUserId: params.linkedUserId
        ? new mongoose.Types.ObjectId(params.linkedUserId)
        : new mongoose.Types.ObjectId(params.actorUserId),
      action: 'compliance.case.created',
      reason: 'Compliance case created by admin',
      metadata: {
        caseId: String(createdCase._id),
        category: createdCase.category,
        severity: createdCase.severity,
      },
    });

    return createdCase;
  }

  async updateCaseStatus(params: UpdateComplianceCaseStatusParams) {
    const complianceCase = await complianceCaseRepository.findById(params.caseId);

    if (!complianceCase) {
      throw new AppError('Compliance case not found', 404);
    }

    const previousStatus = complianceCase.status;
    complianceCase.status = params.status;

    if (params.status === 'resolved') {
      complianceCase.resolutionNote = params.resolutionNote?.trim() || 'Resolved by admin';
    }

    await complianceCase.save();

    await adminAuditLogRepository.create({
      actorUserId: new mongoose.Types.ObjectId(params.actorUserId),
      targetUserId: complianceCase.linkedUserId ?? new mongoose.Types.ObjectId(params.actorUserId),
      action: 'compliance.case.status.updated',
      reason: params.reason.trim(),
      metadata: {
        caseId: String(complianceCase._id),
        previousStatus,
        nextStatus: params.status,
        resolutionNote: complianceCase.resolutionNote,
      },
    });

    return complianceCase;
  }
}

export const complianceService = new ComplianceService();
