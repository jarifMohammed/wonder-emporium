import { Inject, Injectable } from '@nestjs/common';
import { AUTH_USER_REPOSITORY_TOKEN } from '../../domain/interfaces/auth-user.repository.interface';
import type { IAuthUserRepository } from '../../domain/interfaces/auth-user.repository.interface';
import { AppError } from '../../../common/errors/app.error';

@Injectable()
export class UpdateUserStatusUseCase {
  constructor(
    @Inject(AUTH_USER_REPOSITORY_TOKEN)
    private readonly userRepository: IAuthUserRepository,
  ) {}

  async execute(userId: string, status: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    await this.userRepository.update(userId, { status });

    // Revoke tokens if the user is suspended
    if (status === 'SUSPENDED') {
      await this.userRepository.incrementTokenVersion(userId);
    }
  }
}
