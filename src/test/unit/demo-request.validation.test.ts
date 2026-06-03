import express from 'express';
import request from 'supertest';
import { errorHandler } from '../../middlewares/errorHandler';
import { validateRequest } from '../../middlewares/validateRequest';
import { demoRequestValidation } from '../../validations/demo-request.validation';

describe('demoRequestValidation.create', () => {
  const app = express();
  app.use(express.json());
  app.post('/validate-create', validateRequest(demoRequestValidation.create), (req, res) => {
    res.status(200).json({ success: true, data: req.body });
  });
  app.use(errorHandler);

  const validPayload = {
    fullName: 'Jane Doe',
    workEmail: 'jane.doe@acme.com',
    company: 'Acme Inc',
    role: 'Operations Manager',
    teamSize: '11-50',
    useCase: 'Corporate events planning',
    estimatePrice: 2500,
  };

  it('passes with valid payload and coerces estimatePrice to number', async () => {
    const response = await request(app)
      .post('/validate-create')
      .send(validPayload)
      .expect(200);

    expect(response.body.data).toMatchObject({
      ...validPayload,
      workEmail: 'jane.doe@acme.com',
      estimatePrice: 2500,
    });
    expect(typeof response.body.data.estimatePrice).toBe('number');
  });

  it('accepts numeric string estimatePrice', async () => {
    const response = await request(app)
      .post('/validate-create')
      .send({
        ...validPayload,
        workEmail: 'numeric-string@acme.com',
        estimatePrice: '3200.5',
      })
      .expect(200);

    expect(response.body.data.estimatePrice).toBe(3200.5);
  });

  it('accepts zero estimatePrice', async () => {
    const response = await request(app)
      .post('/validate-create')
      .send({
        ...validPayload,
        workEmail: 'zero-price@acme.com',
        estimatePrice: 0,
      })
      .expect(200);

    expect(response.body.data.estimatePrice).toBe(0);
  });

  it('fails when estimatePrice is missing', async () => {
    const { estimatePrice: _removed, ...withoutPrice } = validPayload;

    const response = await request(app)
      .post('/validate-create')
      .send(withoutPrice)
      .expect(400);

    expect(response.body.message).toBe('Validation failed');
    expect(response.body.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'estimatePrice' })])
    );
  });

  it('fails when estimatePrice is negative', async () => {
    const response = await request(app)
      .post('/validate-create')
      .send({
        ...validPayload,
        estimatePrice: -1,
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

  it('fails when estimatePrice is not numeric', async () => {
    const response = await request(app)
      .post('/validate-create')
      .send({
        ...validPayload,
        estimatePrice: 'not-a-number',
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
});
