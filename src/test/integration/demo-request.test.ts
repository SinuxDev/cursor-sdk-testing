import request from 'supertest';
import app from '../../app';
import { DemoRequest } from '../../models/demo-request.model';
import './setup';

describe('Demo Request API integration', () => {
  const validPayload = {
    fullName: 'John Smith',
    workEmail: 'John.Smith@Example.com',
    company: 'Example Corp',
    role: 'Product Lead',
    teamSize: '11-50',
    useCase: 'Need a better way to manage event logistics',
    estimatePrice: 2500,
  };

  describe('POST /api/v1/demo-requests', () => {
    it('returns 201 and creates demo request with defaults', async () => {
      const response = await request(app)
        .post('/api/v1/demo-requests')
        .send(validPayload)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Demo request submitted successfully',
      });
      expect(response.body.data).toMatchObject({
        fullName: validPayload.fullName,
        workEmail: 'john.smith@example.com',
        company: validPayload.company,
        role: validPayload.role,
        teamSize: validPayload.teamSize,
        useCase: validPayload.useCase,
        estimatePrice: validPayload.estimatePrice,
        source: 'public-website',
        status: 'new',
        priority: 'medium',
      });

      const savedDemoRequest = await DemoRequest.findOne({
        workEmail: 'john.smith@example.com',
      }).lean();

      expect(savedDemoRequest).toBeTruthy();
      expect(savedDemoRequest).toMatchObject({
        fullName: validPayload.fullName,
        estimatePrice: validPayload.estimatePrice,
        status: 'new',
        priority: 'medium',
        source: 'public-website',
      });
    });

    it('returns 400 when payload is invalid', async () => {
      const response = await request(app)
        .post('/api/v1/demo-requests')
        .send({
          ...validPayload,
          fullName: 'J',
          workEmail: 'invalid-email',
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Validation failed',
      });
      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'fullName' }),
          expect.objectContaining({ field: 'workEmail' }),
        ])
      );
    });

    it('returns 400 when estimate price is missing', async () => {
      const { estimatePrice: _removed, ...withoutPrice } = validPayload;

      const response = await request(app)
        .post('/api/v1/demo-requests')
        .send({
          ...withoutPrice,
          workEmail: 'missing-price@example.com',
        })
        .expect(400);

      expect(response.body.data).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'estimatePrice' })])
      );
    });

    it('returns 400 when estimate price is negative', async () => {
      const response = await request(app)
        .post('/api/v1/demo-requests')
        .send({
          ...validPayload,
          workEmail: 'negative-price@example.com',
          estimatePrice: -100,
        })
        .expect(400);

      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'estimatePrice',
            message: 'Estimate price must be a non-negative number',
          }),
        ])
      );
    });

    it('returns 400 when estimate price is not numeric', async () => {
      const response = await request(app)
        .post('/api/v1/demo-requests')
        .send({
          ...validPayload,
          workEmail: 'invalid-price@example.com',
          estimatePrice: 'budget-tbd',
        })
        .expect(400);

      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'estimatePrice',
            message: 'Estimate price must be a non-negative number',
          }),
        ])
      );
    });

    it('accepts zero estimate price', async () => {
      const response = await request(app)
        .post('/api/v1/demo-requests')
        .send({
          ...validPayload,
          workEmail: 'zero-price@example.com',
          estimatePrice: 0,
        })
        .expect(201);

      expect(response.body.data).toMatchObject({
        estimatePrice: 0,
        workEmail: 'zero-price@example.com',
      });

      const saved = await DemoRequest.findOne({ workEmail: 'zero-price@example.com' }).lean();
      expect(saved?.estimatePrice).toBe(0);
    });

    it('accepts authenticated-website source', async () => {
      const response = await request(app)
        .post('/api/v1/demo-requests')
        .send({
          ...validPayload,
          workEmail: 'source-auth@example.com',
          source: 'authenticated-website',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        source: 'authenticated-website',
        estimatePrice: validPayload.estimatePrice,
        status: 'new',
        priority: 'medium',
      });
    });

    it('returns 400 for invalid source', async () => {
      const response = await request(app)
        .post('/api/v1/demo-requests')
        .send({
          ...validPayload,
          workEmail: 'invalid-source@example.com',
          source: 'mobile-app',
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Validation failed',
      });
      expect(response.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'source',
            message: 'Source is invalid',
          }),
        ])
      );
    });
  });
});
