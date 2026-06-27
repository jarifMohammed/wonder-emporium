import { Inject, Injectable } from '@nestjs/common';
import { PASSWORD_HASHER_TOKEN } from '../../../common/domain/interfaces/password-hasher.interface';
import type { IPasswordHasher } from '../../../common/domain/interfaces/password-hasher.interface';
import { AUTH_USER_REPOSITORY_TOKEN } from '../../domain/interfaces/auth-user.repository.interface';
import type { IAuthUserRepository } from '../../domain/interfaces/auth-user.repository.interface';
import { AppError } from '../../../common/errors/app.error';

@Injectable()
export class ChangePasswordUseCase {
  constructor(
    @Inject(PASSWORD_HASHER_TOKEN)
    private readonly passwordHasher: IPasswordHasher,
    @Inject(AUTH_USER_REPOSITORY_TOKEN)
    private readonly userRepository: IAuthUserRepository,
  ) {}

  async execute(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    const valid = await this.passwordHasher.compare(oldPassword, user.password);
    if (!valid) {
      throw AppError.badRequest('Current password is incorrect');
    }

    const hashedPassword = await this.passwordHasher.hash(newPassword);

    await this.userRepository.updatePassword(userId, hashedPassword);
    await this.userRepository.incrementTokenVersion(userId);
    await this.userRepository.updateSecurity(userId, {
      lastPasswordChange: new Date(),
    });

    return { message: 'Password changed successfully' };
  }
}
