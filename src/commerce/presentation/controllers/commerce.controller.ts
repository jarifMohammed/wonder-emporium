import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Get,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { userRole } from '../../../auth/interfaces/auth.interface';
import { OnboardAuthorUseCase } from '../../application/services/onboard-author.use-case';
import type { Request } from 'express';
import { StripeService } from '../../infrastructure/stripe/stripe.service';
import { COMMERCE_REPOSITORY_TOKEN } from '../../domain/interfaces/commerce.repository.interface';
import type { ICommerceRepository } from '../../domain/interfaces/commerce.repository.interface';
import { Inject } from '@nestjs/common';

@ApiTags('Commerce', 'Author', 'Admin')
@Controller('commerce')
export class CommerceController {
  constructor(
    private readonly onboardAuthorUseCase: OnboardAuthorUseCase,
    private readonly stripeService: StripeService,
    @Inject(COMMERCE_REPOSITORY_TOKEN)
    private readonly commerceRepository: ICommerceRepository,
  ) {}

  @Post('author/onboard')
  @UseGuards(AuthGuard)
  @Roles(userRole.AUTHOR, userRole.ADMIN)
  @ApiOperation({
    summary: 'Create Stripe Connect onboarding link for authors',
    description:
      'Used to onboard authors onto Stripe Connect so they can receive payouts. Returns an onboarding URL that the author needs to complete.',
  })
  @ApiResponse({ status: 200, description: 'Returns an onboarding URL' })
  async onboardAuthor(
    @Req() req: Request,
    @Body() body: { email: string; country?: string },
  ) {
    const user = (req as unknown as { user: { id: string } }).user;
    return this.onboardAuthorUseCase.execute(user.id, body.email, body.country);
  }

  @Get('author/status')
  @UseGuards(AuthGuard)
  @Roles(userRole.AUTHOR, userRole.ADMIN)
  @ApiOperation({ summary: 'Check Stripe Connect account status' })
  async checkAccountStatus(@Req() req: Request) {
    const user = (req as unknown as { user: { id: string } }).user;
    const accountData =
      await this.commerceRepository.getConnectedAccountByAuthId(user.id);

    if (!accountData) {
      return { status: 'NOT_CREATED' };
    }

    const stripeAccount = await this.stripeService.retrieveAccount(
      accountData.stripeAccountId,
    );

    // Update local DB status
    await this.commerceRepository.updateConnectedAccountStatus(
      stripeAccount.id,
      stripeAccount.charges_enabled,
      stripeAccount.payouts_enabled,
    );

    return {
      status: 'CREATED',
      stripeAccountId: stripeAccount.id,
      chargesEnabled: stripeAccount.charges_enabled,
      payoutsEnabled: stripeAccount.payouts_enabled,
    };
  }

  @Get('author/express-dashboard')
  @UseGuards(AuthGuard)
  @Roles(userRole.AUTHOR)
  @ApiOperation({ summary: 'Get Stripe Express Dashboard login link' })
  async getExpressDashboardLink(@Req() req: Request) {
    const user = (req as unknown as { user: { id: string } }).user;
    const accountData =
      await this.commerceRepository.getConnectedAccountByAuthId(user.id);

    if (!accountData || !accountData.stripeAccountId) {
      return { url: null, message: 'Stripe Connect account not found.' };
    }

    const loginLink = await this.stripeService.createLoginLink(
      accountData.stripeAccountId,
    );
    return { url: loginLink.url };
  }
}
