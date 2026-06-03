import { FilterQuery } from 'mongoose';
import { BaseRepository } from './base.repository';
import { IUser, User } from '../models/user.model';

class UserRepository extends BaseRepository<IUser> {
  constructor() {
    super(User);
  }

  async findByEmail(email: string): Promise<IUser | null> {
    const emailCanonical = email.trim().toLowerCase();

    return this.model
      .findOne({
        $or: [{ emailCanonical }, { email: emailCanonical }],
      })
      .exec();
  }

  async findByEmailWithPassword(email: string): Promise<IUser | null> {
    const emailCanonical = email.trim().toLowerCase();

    return this.model
      .findOne({
        $or: [{ emailCanonical }, { email: emailCanonical }],
      })
      .select('+password')
      .exec();
  }

  async findByProvider(provider: string, providerId: string): Promise<IUser | null> {
    return this.model.findOne({ provider, providerId }).exec();
  }

  async findOneWithPassword(filter: FilterQuery<IUser>): Promise<IUser | null> {
    return this.model.findOne(filter).select('+password').exec();
  }

  async getRoleDistribution() {
    const rows = await this.model
      .aggregate<{ _id: IUser['role']; count: number }>([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 },
          },
        },
      ])
      .exec();

    return rows.reduce(
      (result, row) => {
        result[row._id] = row.count;
        return result;
      },
      { attendee: 0, organizer: 0, admin: 0 } as Record<IUser['role'], number>
    );
  }
}

export const userRepository = new UserRepository();
