import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { errorHandler } from '../../middlewares/errorHandler';
import { validateRequest } from '../../middlewares/validateRequest';
import { complianceValidation } from '../../validations/compliance.validation';

describe('complianceValidation', () => {
  const validCreatePayload = {
    name: 'Vendor Risk Review',
    survey: 'vendor-onboarding-q1',
    title: 'Suspicious registration spike',
    description: 'Multiple accounts created from the same IP range within minutes.',
    category: 'account_abuse',
    severity: 'high',
  };

  describe('createCase', () => {
    const app = express();
    app.use(express.json());
    app.post('/validate-create', validateRequest(complianceValidation.createCase), (req, res) => {
      res.status(200).json({ success: true, data: req.body });
    });
    app.use(errorHandler);

    it('passes with name and survey', async () => {
      const response = await request(app)
        .post('/validate-create')
        .send(validCreatePayload)
        .expect(200);

      expect(response.body.data).toMatchObject(validCreatePayload);
    });

    it('passes without optional survey', async () => {
      const withoutSurvey = { ...validCreatePayload };
      delete (withoutSurvey as { survey?: string }).survey;

      const response = await request(app)
        .post('/validate-create')
        .send(withoutSurvey)
        .expect(200);

      expect(response.body.data).toMatchObject({
        name: validCreatePayload.name,
        title: validCreatePayload.title,
      });
      expect(response.body.data.survey).toBeUndefined();
    });

    it('fails when name is missing', async () => {
      const withoutName = { ...validCreatePayload };
      delete (withoutName as { name?: string }).name;

      const response = await request(app)
        .post('/validate-create')
        .send(withoutName)
        .expect(400);

      expect(response.body.message).toBe('Validation failed');
      expect(response.body.data).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'name' })])
      );
    });

    it('fails when name is too short', async () => {
      const response = await request(app)
        .post('/validate-create')
        .send({ ...validCreatePayload, name: 'A' })
        .expect(400);

      expect(response.body.data).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'name' })])
      );
    });

    it('fails when survey is too short', async () => {
      const response = await request(app)
        .post('/validate-create')
        .send({ ...validCreatePayload, survey: 'x' })
        .expect(400);

      expect(response.body.data).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'survey' })])
      );
    });
  });

  describe('updateCase', () => {
    const caseId = new mongoose.Types.ObjectId().toString();
    const app = express();
    app.use(express.json());
    app.patch(
      '/validate-update/:id',
      validateRequest(complianceValidation.updateCase),
      (req, res) => {
        res.status(200).json({ success: true, data: req.body });
      }
    );
    app.use(errorHandler);

    it('passes when updating name and survey with reason', async () => {
      const response = await request(app)
        .patch(`/validate-update/${caseId}`)
        .send({
          name: 'Updated Vendor Name',
          survey: 'vendor-onboarding-q2',
          reason: 'Corrected survey reference after review',
        })
        .expect(200);

      expect(response.body.data).toMatchObject({
        name: 'Updated Vendor Name',
        survey: 'vendor-onboarding-q2',
        reason: 'Corrected survey reference after review',
      });
    });

    it('passes when survey is null', async () => {
      const response = await request(app)
        .patch(`/validate-update/${caseId}`)
        .send({
          survey: null,
          reason: 'Survey no longer applicable',
        })
        .expect(200);

      expect(response.body.data.survey).toBeNull();
    });

    it('fails when reason is missing', async () => {
      const response = await request(app)
        .patch(`/validate-update/${caseId}`)
        .send({ name: 'Updated Name' })
        .expect(400);

      expect(response.body.data).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'reason' })])
      );
    });

    it('fails when case id is invalid', async () => {
      const response = await request(app)
        .patch('/validate-update/not-a-mongo-id')
        .send({ name: 'Updated Name', reason: 'Valid reason text' })
        .expect(400);

      expect(response.body.data).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'id' })])
      );
    });

    it('fails when survey string is too short', async () => {
      const response = await request(app)
        .patch(`/validate-update/${caseId}`)
        .send({ survey: 'x', reason: 'Updating survey reference' })
        .expect(400);

      expect(response.body.data).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'survey' })])
      );
    });
  });
});
