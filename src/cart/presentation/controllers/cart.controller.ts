import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { GetCartUseCase } from '../../application/services/get-cart.use-case';
import { AddItemToCartUseCase } from '../../application/services/add-item-to-cart.use-case';
import { UpdateCartItemQuantityUseCase } from '../../application/services/update-cart-item-quantity.use-case';
import { RemoveItemFromCartUseCase } from '../../application/services/remove-item-from-cart.use-case';
import { ClearCartUseCase } from '../../application/services/clear-cart.use-case';

class AddItemDto {
  bookId: string;
  formatId: string;
  quantity?: number;
}

class UpdateQuantityDto {
  quantity: number;
}

@ApiTags('Cart')
@Controller('cart')
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class CartController {
  constructor(
    private readonly getCartUseCase: GetCartUseCase,
    private readonly addItemToCartUseCase: AddItemToCartUseCase,
    private readonly updateCartItemQuantityUseCase: UpdateCartItemQuantityUseCase,
    private readonly removeItemFromCartUseCase: RemoveItemFromCartUseCase,
    private readonly clearCartUseCase: ClearCartUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get user cart' })
  @ApiResponse({ status: 200, description: 'Cart details' })
  async getCart(@Req() req: any) {
    return this.getCartUseCase.execute(req.user.id);
  }

  @Post('items')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiBody({ type: AddItemDto })
  @ApiResponse({ status: 200, description: 'Updated cart' })
  async addItem(@Req() req: any, @Body() body: AddItemDto) {
    return this.addItemToCartUseCase.execute(
      req.user.id,
      body.bookId,
      body.formatId,
      body.quantity
    );
  }

  @Patch('items/:itemId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update cart item quantity' })
  @ApiBody({ type: UpdateQuantityDto })
  @ApiResponse({ status: 200, description: 'Updated cart' })
  async updateItemQuantity(
    @Req() req: any,
    @Param('itemId') itemId: string,
    @Body() body: UpdateQuantityDto
  ) {
    return this.updateCartItemQuantityUseCase.execute(
      req.user.id,
      itemId,
      body.quantity
    );
  }

  @Delete('items/:itemId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiResponse({ status: 200, description: 'Updated cart' })
  async removeItem(@Req() req: any, @Param('itemId') itemId: string) {
    return this.removeItemFromCartUseCase.execute(req.user.id, itemId);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear entire cart' })
  @ApiResponse({ status: 204, description: 'Cart cleared' })
  async clearCart(@Req() req: any) {
    await this.clearCartUseCase.execute(req.user.id);
  }
}
