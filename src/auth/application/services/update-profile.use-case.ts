import { Inject, Injectable } from '@nestjs/common';
import { AUTH_USER_REPOSITORY_TOKEN } from '../../domain/interfaces/auth-user.repository.interface';
import type { IAuthUserRepository } from '../../domain/interfaces/auth-user.repository.interface';
import { AppError } from '../../../common/errors/app.error';

@Injectable()
export class UpdateProfileUseCase {
  constructor(
    @Inject(AUTH_USER_REPOSITORY_TOKEN)
    private readonly userRepository: IAuthUserRepository,
  ) {}

  async execute(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      bio?: string;
      avatarUrl?: string;
      location?: string;
    },
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    await this.userRepository.updateProfile(userId, data);

    return { message: 'Profile updated successfully' };
  }
}
