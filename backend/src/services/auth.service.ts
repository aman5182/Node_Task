import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.model';
import { env } from '../config/env';
import { AppError } from '../helpers';
import { RegisterInput, LoginInput } from '../validations/auth.validation';
import { SafeUser } from '../types';

export class AuthService {
  private static generateToken(userId: string, email: string): string {
    return jwt.sign({ userId, email }, env.jwtSecret, {
      expiresIn: env.jwtExpiresIn,
    });
  }

  static async register(input: RegisterInput): Promise<{ user: SafeUser; token: string }> {
    const existingUser = await User.findOne({ email: input.email });
    if (existingUser) {
      throw new AppError(409, 'User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(input.password, 10);

    const newUser = await User.create({
      name: input.name,
      email: input.email,
      password: hashedPassword,
      avatar: input.avatar || '',
      isOnline: true,
      isActive: true,
      lastSeen: new Date(),
    });

    const token = this.generateToken(newUser._id.toString(), newUser.email);
    const userSafe = newUser.toJSON() as SafeUser;

    return { user: userSafe, token };
  }

  static async login(input: LoginInput): Promise<{ user: SafeUser; token: string }> {
    const user = await User.findOne({ email: input.email }).select('+password');
    if (!user || !user.password) {
      throw new AppError(401, 'Invalid email or password');
    }

    if (!user.isActive) {
      throw new AppError(403, 'User account is deactivated');
    }

    const isPasswordMatch = await bcrypt.compare(input.password, user.password);
    if (!isPasswordMatch) {
      throw new AppError(401, 'Invalid email or password');
    }

    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    const token = this.generateToken(user._id.toString(), user.email);
    const userSafe = user.toJSON() as SafeUser;

    return { user: userSafe, token };
  }

  static async getProfile(userId: string): Promise<SafeUser> {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError(404, 'User not found');
    }
    return user.toJSON() as SafeUser;
  }
}
