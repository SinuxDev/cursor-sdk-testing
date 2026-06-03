import request from 'supertest';
import app from '../../app';
import './setup';

describe('GET /health', () => {
  it('returns healthy response payload', async () => {
    const response = await request(app).get('/health').expect(200);

    expect(response.body).toMatchObject({
      success: true,
      message: 'Server is healthy',
    });
    expect(response.body.data).toHaveProperty('timestamp');
    expect(response.body.data).toHaveProperty('environment', 'test');
  });
});
