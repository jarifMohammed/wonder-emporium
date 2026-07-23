import { Inject, Injectable } from '@nestjs/common';
import { CART_REPOSITORY_TOKEN } from '../../domain/interfaces/cart.repository.interface';
import type { ICartRepository } from '../../domain/interfaces/cart.repository.interface';

@Injectable()
export class GetCartUseCase {
  constructor(
    @Inject(CART_REPOSITORY_TOKEN)
    private readonly cartRepository: ICartRepository,
  ) {}

  async execute(userId: string) {
    return this.cartRepository.findOrCreateByUserId(userId);
  }
}
