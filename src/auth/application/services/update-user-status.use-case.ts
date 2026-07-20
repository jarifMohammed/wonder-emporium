import { Inject, Injectable } from '@nestjs/common';
import { AUTH_USER_REPOSITORY_TOKEN } from '../../domain/interfaces/auth-user.repository.interface';
import type { IAuthUserRepository } from '../../domain/interfaces/auth-user.repository.interface';
import { AppError } from '../../../common/errors/app.error';
import { userRole } from '../../interfaces/auth.interface';
import { EmailService } from '../../../common/services/email.service';

@Injectable()
export class UpdateUserStatusUseCase {
  constructor(
    @Inject(AUTH_USER_REPOSITORY_TOKEN)
    private readonly userRepository: IAuthUserRepository,
    private readonly emailService: EmailService,
  ) {}

  async execute(userId: string, status: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw AppError.notFound('User not found');
    }

    if (
      status === 'ACTIVE' &&
      user.role === userRole.AUTHOR &&
      !user.verified
    ) {
      throw AppError.badRequest(
        'The author must verify their email before approval',
      );
    }

    await this.userRepository.update(userId, { status });

    if (
      status === 'ACTIVE' &&
      user.status !== 'ACTIVE' &&
      user.role === userRole.AUTHOR
    ) {
      await this.emailService.sendAuthorOnboardingApprovedEmail(
        user.email,
        user.username,
      );
    }

    // Revoke tokens if the user is suspended
    if (status === 'SUSPENDED') {
      await this.userRepository.incrementTokenVersion(userId);
    }
  }
}
