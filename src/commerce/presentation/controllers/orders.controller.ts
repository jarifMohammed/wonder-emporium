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
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { userRole } from '../../../auth/interfaces/auth.interface';
import { CreateCheckoutSessionUseCase } from '../../application/services/create-checkout-session.use-case';
import { HandleCheckoutCompletedUseCase } from '../../application/services/handle-checkout-completed.use-case';
import { UserGetOrderHistoryUseCase } from '../../application/services/user-get-order-history.use-case';
import { AdminGetOrdersUseCase } from '../../application/services/admin-get-orders.use-case';
import { StripeService } from '../../infrastructure/stripe/stripe.service';
import { PrismaService } from '../../../common/services/prisma.service';
import { AppError } from '../../../common/errors/app.error';
import type { Request } from 'express';

class ConfirmSessionDto {
  @IsString()
  sessionId: string;
}

class CheckoutItemDto {
  @IsUUID()
  formatId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;
}

class CreateCheckoutDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items: CheckoutItemDto[];

  @IsOptional()
  @IsString()
  @IsUrl({
    require_tld: false,
  })
  successUrl?: string;

  @IsOptional()
  @IsString()
  @IsUrl({
    require_tld: false,
  })
  cancelUrl?: string;
}

@ApiTags('Orders', 'Users', 'Admin')
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly createCheckoutSessionUseCase: CreateCheckoutSessionUseCase,
    private readonly handleCheckoutCompletedUseCase: HandleCheckoutCompletedUseCase,
    private readonly userGetOrderHistoryUseCase: UserGetOrderHistoryUseCase,
    private readonly adminGetOrdersUseCase: AdminGetOrdersUseCase,
    private readonly stripeService: StripeService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('admin')
  @UseGuards(AuthGuard)
  @Roles(userRole.ADMIN, userRole.SUPERADMIN)
  @ApiOperation({ summary: 'Get all orders for admin dashboard' })
  @ApiResponse({ status: 200, description: 'Admin order list' })
  async getAdminOrders() {
    return this.adminGetOrdersUseCase.execute();
  }

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
    const frontendUrl =
      process.env.APP_FRONTEND_URL || 'https://wonder-emporium.onrender.com';
    const successUrl = body.successUrl || `${frontendUrl}/checkout/success`;
    const cancelUrl = body.cancelUrl || `${frontendUrl}/checkout/cancel`;

    return this.createCheckoutSessionUseCase.execute(
      user.id,
      body.items,
      successUrl,
      cancelUrl,
    );
  }

  @Post('confirm-session')
  @UseGuards(AuthGuard)
  @Roles(userRole.USER, userRole.READER, userRole.AUTHOR, userRole.ADMIN)
  @ApiOperation({
    summary: 'Verify and fulfill completed Stripe checkout session',
  })
  @ApiBody({ type: ConfirmSessionDto })
  @ApiResponse({ status: 200, description: 'Order fulfilled and cart cleared' })
  async confirmCheckoutSession(
    @Req() req: Request,
    @Body() body: ConfirmSessionDto,
  ) {
    const user = (req as unknown as { user: { id: string } }).user;
    if (!body.sessionId) {
      throw AppError.badRequest('Session ID is required');
    }

    const session = await this.stripeService.retrieveCheckoutSession(
      body.sessionId,
    );
    if (!session) {
      throw AppError.notFound('Checkout session not found');
    }

    if (session.payment_status === 'paid' || session.status === 'complete') {
      await this.handleCheckoutCompletedUseCase.execute(session);
    }

    // Ensure the user cart is cleared
    await this.prisma.cartItem.deleteMany({
      where: {
        cart: {
          userId: user.id,
        },
      },
    });

    return {
      success: true,
      paymentStatus: session.payment_status,
      status: session.status,
    };
  }
}
