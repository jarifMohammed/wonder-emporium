import { Inject, Injectable } from '@nestjs/common';
import { AUTH_USER_REPOSITORY_TOKEN } from '../../domain/interfaces/auth-user.repository.interface';
import type { IAuthUserRepository } from '../../domain/interfaces/auth-user.repository.interface';
import { PASSWORD_HASHER_TOKEN } from '../../../common/domain/interfaces/password-hasher.interface';
import type { IPasswordHasher } from '../../../common/domain/interfaces/password-hasher.interface';
import { AppError } from '../../../common/errors/app.error';

@Injectable()
export class UpdateEmailUseCase {
  constructor(
    @Inject(AUTH_USER_REPOSITORY_TOKEN)
    private readonly userRepository: IAuthUserRepository,
    @Inject(PASSWORD_HASHER_TOKEN)
    private readonly passwordHasher: IPasswordHasher,
  ) {}

  async execute(
    userId: string,
    newEmail: string,
    password: string,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    const passwordMatch = await this.passwordHasher.compare(
      password,
      user.password,
    );
    if (!passwordMatch) {
      throw AppError.unauthorized('Invalid password');
    }

    const existing = await this.userRepository.findByEmail(
      newEmail.trim().toLowerCase(),
    );
    if (existing && existing.id !== userId) {
      throw AppError.conflict('Email is already in use');
    }

    await this.userRepository.update(userId, {
      email: newEmail.trim().toLowerCase(),
      verified: false,
    });

    return {
      message: 'Email updated successfully. Please verify your new email.',
    };
  }
}
