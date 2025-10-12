/**
 * Users Service
 * Business logic for user management
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { User } from './entities/user.entity';
import { UserStatus } from '@mediconnect/types';
import { nanoid } from 'nanoid';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  /**
   * Find user by email with password (for authentication)
   */
  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository.findByEmailWithPassword(email);
  }

  /**
   * Find user by password reset token
   */
  async findByPasswordResetToken(token: string): Promise<User | null> {
    return this.usersRepository.findByPasswordResetToken(token);
  }

  /**
   * Find all users with pagination
   */
  async findAll(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const [users, total] = await this.usersRepository.findAll(skip, limit);

    return {
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Create new user
   */
  async create(userData: Partial<User>): Promise<User> {
    return this.usersRepository.create(userData);
  }

  /**
   * Update user
   */
  async update(id: string, userData: Partial<User>): Promise<User> {
    await this.findById(id); // Check if user exists
    return this.usersRepository.update(id, userData);
  }

  /**
   * Delete user
   */
  async delete(id: string): Promise<void> {
    await this.findById(id); // Check if user exists
    await this.usersRepository.delete(id);
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(id: string): Promise<void> {
    await this.usersRepository.update(id, {
      lastLogin: new Date(),
    });
  }

  /**
   * Update refresh token
   */
  async updateRefreshToken(id: string, refreshToken: string | null): Promise<void> {
    const hashedToken = refreshToken ? await bcrypt.hash(refreshToken, 10) : null;
    await this.usersRepository.update(id, {
      refreshToken: hashedToken,
    });
  }

  /**
   * Get refresh token
   */
  async getRefreshToken(id: string): Promise<string | null> {
    const user = await this.usersRepository.findByIdWithRefreshToken(id);
    return user?.refreshToken || null;
  }

  /**
   * Update password
   */
  async updatePassword(id: string, newPassword: string): Promise<void> {
    await this.usersRepository.update(id, {
      password: newPassword,
    });
  }

  /**
   * Generate email verification token
   */
  async generateEmailVerificationToken(id: string): Promise<string> {
    const token = nanoid(32);
    const expires = new Date();
    expires.setHours(expires.getHours() + 24); // 24 hours

    await this.usersRepository.update(id, {
      emailVerificationToken: token,
      emailVerificationExpires: expires,
    });

    return token;
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<boolean> {
    const user = await this.usersRepository.findByEmailVerificationToken(token);

    if (!user) {
      return false;
    }

    await this.usersRepository.update(user.id, {
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
      status: UserStatus.ACTIVE,
    });

    return true;
  }

  /**
   * Generate password reset token
   */
  async generatePasswordResetToken(id: string): Promise<string> {
    const token = nanoid(32);
    const expires = new Date();
    expires.setHours(expires.getHours() + 1); // 1 hour

    await this.usersRepository.update(id, {
      passwordResetToken: token,
      passwordResetExpires: expires,
    });

    return token;
  }

  /**
   * Clear password reset token
   */
  async clearPasswordResetToken(id: string): Promise<void> {
    await this.usersRepository.update(id, {
      passwordResetToken: null,
      passwordResetExpires: null,
    });
  }

  /**
   * Get user statistics
   */
  async getStatistics() {
    const total = await this.usersRepository.count();
    // TODO: Add more statistics (active users, by role, etc.)

    return {
      total,
    };
  }
}
