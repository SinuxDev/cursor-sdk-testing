import { demoRequestService } from '../../services/demo-request.service';
import { demoRequestRepository } from '../../repositories/demo-request.repository';

jest.mock('../../repositories/demo-request.repository', () => ({
  demoRequestRepository: {
    create: jest.fn(),
  },
}));

describe('demoRequestService.create', () => {
  const mockedCreate = demoRequestRepository.create as jest.MockedFunction<
    typeof demoRequestRepository.create
  >;

  const payload = {
    fullName: 'Jane Doe',
    workEmail: 'jane.doe@acme.com',
    company: 'Acme Inc',
    role: 'Operations Manager',
    teamSize: '11-50',
    useCase: 'We want to improve event planning workflow',
    estimatePrice: 1500,
    source: 'public-website' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds default status and priority before creating a demo request', async () => {
    const createdRecord = {
      _id: 'demo-request-id',
      ...payload,
      status: 'new',
      priority: 'medium',
    };

    mockedCreate.mockResolvedValue(createdRecord as never);

    const result = await demoRequestService.create(payload);

    expect(mockedCreate).toHaveBeenCalledWith({
      ...payload,
      status: 'new',
      priority: 'medium',
    });
    expect(result).toBe(createdRecord);
  });

  it('forwards estimatePrice to the repository unchanged', async () => {
    const payloadWithZeroPrice = {
      ...payload,
      estimatePrice: 0,
    };

    mockedCreate.mockResolvedValue({
      _id: 'demo-request-zero-price',
      ...payloadWithZeroPrice,
      status: 'new',
      priority: 'medium',
    } as never);

    await demoRequestService.create(payloadWithZeroPrice);

    expect(mockedCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        estimatePrice: 0,
        status: 'new',
        priority: 'medium',
      })
    );
  });
});
