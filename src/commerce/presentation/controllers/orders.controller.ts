import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Get,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { userRole } from '../../../auth/interfaces/auth.interface';
import { CreateCheckoutSessionUseCase } from '../../application/services/create-checkout-session.use-case';
import { UserGetOrderHistoryUseCase } from '../../application/services/user-get-order-history.use-case';
import type { Request } from 'express';

class CheckoutItemDto {
  formatId: string;
  quantity: number;
}

class CreateCheckoutDto {
  items: CheckoutItemDto[];
  successUrl: string;
  cancelUrl: string;
}

@ApiTags('Orders', 'Users', 'Admin')
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly createCheckoutSessionUseCase: CreateCheckoutSessionUseCase,
    private readonly userGetOrderHistoryUseCase: UserGetOrderHistoryUseCase,
  ) {}

  @Get('history')
  @UseGuards(AuthGuard)
  @Roles(userRole.USER, userRole.READER, userRole.AUTHOR, userRole.ADMIN)
  @ApiOperation({
    summary: 'Get order history for logged-in user',
    description:
      'Fetches the order history (purchases) for the currently authenticated user. Supports filtering by status, startDate, and endDate.',
  })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'YYYY-MM-DD',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'YYYY-MM-DD',
  })
  async getOrderHistory(
    @Req() req: Request,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const user = (req as unknown as { user: { id: string } }).user;
    return this.userGetOrderHistoryUseCase.execute(user.id, {
      status,
      startDate,
      endDate,
    });
  }

  @Post('checkout')
  @UseGuards(AuthGuard)
  @Roles(userRole.USER, userRole.READER, userRole.AUTHOR, userRole.ADMIN)
  @ApiOperation({
    summary: 'Create Stripe Checkout Session for cart items',
    description:
      'Takes a list of book format IDs and quantities to generate a Stripe Checkout session URL for the user to complete their purchase.',
  })
  @ApiBody({ type: CreateCheckoutDto })
  @ApiResponse({ status: 200, description: 'Returns a checkout URL' })
  async createCheckout(@Req() req: Request, @Body() body: CreateCheckoutDto) {
    const user = (req as unknown as { user: { id: string } }).user;
    return this.createCheckoutSessionUseCase.execute(
      user.id,
      body.items,
      body.successUrl,
      body.cancelUrl,
    );
  }
}
