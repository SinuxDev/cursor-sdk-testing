import jwt, { SignOptions } from 'jsonwebtoken';
import { AppError } from '../utils/AppError';
import { AuthProvider, IUser, UserRole } from '../models/user.model';
import { userRepository } from '../repositories/user.repository';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthResponseData {
  user: IUser;
  accessToken: string;
  refreshToken: string;
}

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

interface LoginPayload {
  email: string;
  password: string;
}

interface SocialPayload {
  provider: Exclude<AuthProvider, 'credentials'>;
  providerId: string;
  email: string;
  name: string;
  avatar?: string;
  role?: UserRole;
}

interface UpgradeRolePayload {
  userId: string;
  role: Extract<UserRole, 'organizer'>;
}

class AuthService {
  async registerWithCredentials(payload: RegisterPayload): Promise<AuthResponseData> {
    const existingUser = await userRepository.findByEmail(payload.email);

    if (existingUser) {
      throw new AppError('Email already registered', 409);
    }

    const createdUser = await userRepository.create({
      name: payload.name,
      email: payload.email,
      password: payload.password,
      role: payload.role ?? 'attendee',
      provider: 'credentials',
    } as Partial<IUser>);

    const tokens = this.generateTokens(createdUser);

    return {
      user: createdUser,
      ...tokens,
    };
  }

  async loginWithCredentials(payload: LoginPayload): Promise<AuthResponseData> {
    const user = await userRepository.findByEmailWithPassword(payload.email);

    if (!user || user.provider !== 'credentials') {
      throw new AppError('Invalid email or password', 401);
    }

    const isPasswordValid = await user.comparePassword(payload.password);

    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401);
    }

    if (user.isSuspended) {
      throw new AppError('Account is suspended', 403);
    }

    const tokens = this.generateTokens(user);

    return {
      user,
      ...tokens,
    };
  }

  async upsertSocialUser(payload: SocialPayload): Promise<AuthResponseData> {
    const existingByProvider = await userRepository.findByProvider(
      payload.provider,
      payload.providerId
    );

    if (existingByProvider) {
      if (existingByProvider.isSuspended) {
        throw new AppError('Account is suspended', 403);
      }

      const tokens = this.generateTokens(existingByProvider);
      return {
        user: existingByProvider,
        ...tokens,
      };
    }

    const existingByEmail = await userRepository.findByEmail(payload.email);

    if (existingByEmail) {
      if (existingByEmail.isSuspended) {
        throw new AppError('Account is suspended', 403);
      }

      existingByEmail.provider = payload.provider;
      existingByEmail.providerId = payload.providerId;
      existingByEmail.name = payload.name || existingByEmail.name;
      existingByEmail.avatar = payload.avatar || existingByEmail.avatar;
      await existingByEmail.save();

      const tokens = this.generateTokens(existingByEmail);

      return {
        user: existingByEmail,
        ...tokens,
      };
    }

    const createdUser = await userRepository.create({
      name: payload.name,
      email: payload.email,
      role: payload.role ?? 'attendee',
      provider: payload.provider,
      providerId: payload.providerId,
      avatar: payload.avatar,
    } as Partial<IUser>);

    const tokens = this.generateTokens(createdUser);

    return {
      user: createdUser,
      ...tokens,
    };
  }

  async upgradeRole(payload: UpgradeRolePayload): Promise<AuthResponseData> {
    const user = await userRepository.findById(payload.userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.isSuspended) {
      throw new AppError('Account is suspended', 403);
    }

    if (payload.role === 'organizer' && user.role !== 'organizer') {
      user.role = 'organizer';
      await user.save();
    }

    const tokens = this.generateTokens(user);

    return {
      user,
      ...tokens,
    };
  }

  async getCurrentUser(userId: string): Promise<IUser> {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.isSuspended) {
      throw new AppError('Account is suspended', 403);
    }

    return user;
  }

  verifyAccessToken(token: string): { userId: string } {
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new AppError('JWT secret is not configured', 500);
    }

    try {
      const decoded = jwt.verify(token, jwtSecret) as {
        sub?: string;
      };

      if (!decoded?.sub) {
        throw new AppError('Invalid token payload', 401);
      }

      return { userId: decoded.sub };
    } catch {
      throw new AppError('Invalid or expired token', 401);
    }
  }

  private generateTokens(user: IUser): AuthTokens {
    const jwtSecret = process.env.JWT_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;

    if (!jwtSecret || !refreshSecret) {
      throw new AppError('JWT secrets are not configured', 500);
    }

    const accessToken = jwt.sign(
      {
        role: user.role,
        email: user.email,
      },
      jwtSecret,
      {
        subject: String(user._id),
        expiresIn: (process.env.JWT_EXPIRE || '7d') as SignOptions['expiresIn'],
      }
    );

    const refreshToken = jwt.sign({}, refreshSecret, {
      subject: String(user._id),
      expiresIn: (process.env.JWT_REFRESH_EXPIRE || '30d') as SignOptions['expiresIn'],
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}

export const authService = new AuthService();
