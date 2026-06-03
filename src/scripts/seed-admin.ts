import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/database';
import { User } from '../models/user.model';
import { logger } from '../utils/logger';

async function seedAdmin(): Promise<void> {
  const adminEmail = process.env.ADMIN_SEED_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_SEED_PASSWORD?.trim();
  const adminName = process.env.ADMIN_SEED_NAME?.trim() || 'Platform Admin';

  if (!adminEmail || !adminPassword) {
    throw new Error('ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD are required');
  }

  if (adminPassword.length < 8) {
    throw new Error('ADMIN_SEED_PASSWORD must be at least 8 characters');
  }

  await connectDB();

  const existingUser = await User.findOne({ email: adminEmail }).select('+password').exec();

  if (!existingUser) {
    await User.create({
      name: adminName,
      email: adminEmail,
      password: adminPassword,
      role: 'admin',
      provider: 'credentials',
      isSuspended: false,
    });

    logger.info(`✅ Admin user created: ${adminEmail}`);
    return;
  }

  existingUser.name = existingUser.name || adminName;
  existingUser.role = 'admin';
  existingUser.provider = 'credentials';
  existingUser.password = adminPassword;
  existingUser.isSuspended = false;
  await existingUser.save();

  logger.info(`✅ Existing user promoted to admin: ${adminEmail}`);
}

seedAdmin()
  .then(() => {
    logger.info('🎉 Admin seed completed successfully');
    return mongoose.disconnect();
  })
  .then(() => {
    process.exit(0);
  })
  .catch(async (error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    logger.error(`❌ Admin seed failed: ${message}`);
    await mongoose.disconnect().catch(() => undefined);
    process.exit(1);
  });
