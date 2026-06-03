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
