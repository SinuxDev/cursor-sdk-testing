import jwt from 'jsonwebtoken';
import { AppError } from '../../utils/AppError';
import { authService } from '../../services/auth.service';

describe('authService.verifyAccessToken', () => {
  it('returns user id for valid token', () => {
    const token = jwt.sign({ role: 'attendee' }, process.env.JWT_SECRET as string, {
      subject: '507f1f77bcf86cd799439011',
      expiresIn: '1h',
    });

    const result = authService.verifyAccessToken(token);

    expect(result).toEqual({ userId: '507f1f77bcf86cd799439011' });
  });

  it('throws 401 AppError for invalid token', () => {
    expect(() => authService.verifyAccessToken('not-a-valid-token')).toThrow(AppError);
    expect(() => authService.verifyAccessToken('not-a-valid-token')).toThrow(
      'Invalid or expired token'
    );
  });
});
