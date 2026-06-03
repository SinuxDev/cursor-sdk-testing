import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/database';
import { User, UserRole } from '../models/user.model';
import { logger } from '../utils/logger';

interface SeedUserInput {
  name: string;
  email: string;
  password: string;
  role: Extract<UserRole, 'attendee' | 'organizer'>;
}

async function upsertCredentialUser(input: SeedUserInput): Promise<void> {
  const normalizedEmail = input.email.trim();
  const emailCanonical = normalizedEmail.toLowerCase();

  const existingUser = await User.findOne({
    $or: [{ emailCanonical }, { email: emailCanonical }],
  })
    .select('+password +emailCanonical')
    .exec();

  if (!existingUser) {
    await User.create({
      name: input.name,
      email: normalizedEmail,
      password: input.password,
      role: input.role,
      provider: 'credentials',
      isSuspended: false,
    });

    logger.info(`Created ${input.role} test user: ${normalizedEmail}`);
    return;
  }

  existingUser.name = input.name;
  existingUser.email = normalizedEmail;
  existingUser.password = input.password;
  existingUser.role = input.role;
  existingUser.provider = 'credentials';
  existingUser.isSuspended = false;
  await existingUser.save();

  logger.info(`Updated ${input.role} test user: ${normalizedEmail}`);
}

function readSeedUsers(): SeedUserInput[] {
  const attendeeEmail = process.env.ATTENDEE_TEST_EMAIL?.trim() || 'Aung.Yee@gmail.com';
  const attendeePassword = process.env.ATTENDEE_TEST_PASSWORD?.trim() || 'Password1';
  const attendeeName = process.env.ATTENDEE_TEST_NAME?.trim() || 'Aung Yee';

  const organizerEmail = process.env.ORGANIZER_TEST_EMAIL?.trim() || 'Organizer.Demo@example.com';
  const organizerPassword = process.env.ORGANIZER_TEST_PASSWORD?.trim() || 'Password1';
  const organizerName = process.env.ORGANIZER_TEST_NAME?.trim() || 'Organizer Demo';

  return [
    {
      name: attendeeName,
      email: attendeeEmail,
      password: attendeePassword,
      role: 'attendee',
    },
    {
      name: organizerName,
      email: organizerEmail,
      password: organizerPassword,
      role: 'organizer',
    },
  ];
}

async function seedTestUsers(): Promise<void> {
  const seedUsers = readSeedUsers();

  for (const user of seedUsers) {
    if (user.password.length < 8) {
      throw new Error(`Password for ${user.email} must be at least 8 characters`);
    }
  }

  await connectDB();

  for (const user of seedUsers) {
    await upsertCredentialUser(user);
  }
}

seedTestUsers()
  .then(() => {
    logger.info('Test users seed completed successfully');
    return mongoose.disconnect();
  })
  .then(() => {
    process.exit(0);
  })
  .catch(async (error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    logger.error(`Test users seed failed: ${message}`);
    await mongoose.disconnect().catch(() => undefined);
    process.exit(1);
  });
