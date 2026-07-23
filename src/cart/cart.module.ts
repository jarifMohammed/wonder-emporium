import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/modules/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { CartController } from './presentation/controllers/cart.controller';
import { GetCartUseCase } from './application/services/get-cart.use-case';
import { AddItemToCartUseCase } from './application/services/add-item-to-cart.use-case';
import { UpdateCartItemQuantityUseCase } from './application/services/update-cart-item-quantity.use-case';
import { RemoveItemFromCartUseCase } from './application/services/remove-item-from-cart.use-case';
import { ClearCartUseCase } from './application/services/clear-cart.use-case';
import { PrismaCartRepository } from './infrastructure/persistence/prisma-cart.repository';
import { CART_REPOSITORY_TOKEN } from './domain/interfaces/cart.repository.interface';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CartController],
  providers: [
    {
      provide: CART_REPOSITORY_TOKEN,
      useClass: PrismaCartRepository,
    },
    GetCartUseCase,
    AddItemToCartUseCase,
    UpdateCartItemQuantityUseCase,
    RemoveItemFromCartUseCase,
    ClearCartUseCase,
    PrismaCartRepository,
  ],
})
export class CartModule {}
