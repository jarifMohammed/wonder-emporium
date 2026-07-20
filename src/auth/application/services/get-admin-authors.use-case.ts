import { Inject, Injectable } from '@nestjs/common';
import {
  AUTH_USER_REPOSITORY_TOKEN,
  AdminAuthorFilters,
  AdminAuthorRecord,
  PaginatedAdminAuthors,
} from '../../domain/interfaces/auth-user.repository.interface';
import type { IAuthUserRepository } from '../../domain/interfaces/auth-user.repository.interface';
import { AppError } from '../../../common/errors/app.error';

@Injectable()
export class GetAdminAuthorsUseCase {
  constructor(
    @Inject(AUTH_USER_REPOSITORY_TOKEN)
    private readonly userRepository: IAuthUserRepository,
  ) {}

  list(filters: AdminAuthorFilters): Promise<PaginatedAdminAuthors> {
    return this.userRepository.findAuthors(filters);
  }

  async getById(id: string): Promise<AdminAuthorRecord> {
    const author = await this.userRepository.findAuthorDetails(id);
    if (!author) throw AppError.notFound('Author not found');
    return author;
  }
}
