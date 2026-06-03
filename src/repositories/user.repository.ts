import { FilterQuery } from 'mongoose';
import { BaseRepository } from './base.repository';
import { IUser, User } from '../models/user.model';
import { AppError } from '../utils/AppError';

const PARENT_POPULATE_FIELDS = 'name email role';

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

  async findByIdWithParent(id: string): Promise<IUser | null> {
    return this.model.findById(id).populate('parent', PARENT_POPULATE_FIELDS).exec();
  }

  async findWithPaginationAndParent(
    filter: FilterQuery<IUser> = {},
    page: number = 1,
    limit: number = 10,
    sort: Record<string, 1 | -1> = { createdAt: -1 }
  ) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('parent', PARENT_POPULATE_FIELDS)
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    };
  }

  async assertValidParentAssignment(childUserId: string, parentUserId: string | null): Promise<void> {
    if (!parentUserId) {
      return;
    }

    if (childUserId === parentUserId) {
      throw new AppError('A user cannot be their own parent', 400);
    }

    const parentUser = await this.findById(parentUserId);

    if (!parentUser) {
      throw new AppError('Parent user not found', 404);
    }

    let currentParentId = parentUser.parent ? String(parentUser.parent) : null;

    while (currentParentId) {
      if (currentParentId === childUserId) {
        throw new AppError('Parent assignment would create a circular hierarchy', 400);
      }

      const ancestor = await this.findById(currentParentId);

      if (!ancestor?.parent) {
        break;
      }

      currentParentId = String(ancestor.parent);
    }
  }
}

export const userRepository = new UserRepository();
