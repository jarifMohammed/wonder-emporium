import { Inject, Injectable } from '@nestjs/common';
import {
  AUTH_USER_REPOSITORY_TOKEN,
} from '../../domain/interfaces/auth-user.repository.interface';
import type { IAuthUserRepository } from '../../domain/interfaces/auth-user.repository.interface';

@Injectable()
export class GetFoundingAuthorsUseCase {
  constructor(
    @Inject(AUTH_USER_REPOSITORY_TOKEN)
    private readonly userRepository: IAuthUserRepository,
  ) {}

  async list(filters?: { page?: number; limit?: number }) {
    return this.userRepository.findFoundingAuthors(filters);
  }

  async getById(id: string) {
    return this.userRepository.findFoundingAuthorById(id);
  }
}
