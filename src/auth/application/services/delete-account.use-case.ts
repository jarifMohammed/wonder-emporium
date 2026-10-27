import { Inject, Injectable } from '@nestjs/common';
import { PASSWORD_HASHER_TOKEN } from '../../../common/domain/interfaces/password-hasher.interface';
import type { IPasswordHasher } from '../../../common/domain/interfaces/password-hasher.interface';
import { AUTH_USER_REPOSITORY_TOKEN } from '../../domain/interfaces/auth-user.repository.interface';
import type { IAuthUserRepository } from '../../domain/interfaces/auth-user.repository.interface';
import { AppError } from '../../../common/errors/app.error';

@Injectable()
export class DeleteAccountUseCase {
  constructor(
    @Inject(AUTH_USER_REPOSITORY_TOKEN)
    private readonly userRepository: IAuthUserRepository,
    @Inject(PASSWORD_HASHER_TOKEN)
    private readonly passwordHasher: IPasswordHasher,
  ) {}

  async execute(
    userId: string,
    password?: string,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    if (password && user.password) {
      const valid = await this.passwordHasher.compare(password, user.password);
      if (!valid) {
        throw AppError.badRequest('Current password is incorrect');
      }
    }

    await this.userRepository.softDelete(userId);

    return { message: 'Account deleted successfully' };
  }
}
