import { demoRequestRepository } from '../repositories/demo-request.repository';

class DemoRequestService {
  async create(payload: {
    fullName: string;
    workEmail: string;
    company: string;
    role: string;
    teamSize: string;
    useCase: string;
    source?: 'public-website' | 'authenticated-website';
  }) {
    return demoRequestRepository.create({
      ...payload,
      status: 'new',
      priority: 'medium',
    });
  }
}

export const demoRequestService = new DemoRequestService();
