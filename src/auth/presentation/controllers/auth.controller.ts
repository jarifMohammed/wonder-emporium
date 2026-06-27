import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Redirect,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { userRole } from '../../interfaces/auth.interface';

import { CreateAccountUseCase } from '../../application/services/create-account.use-case';
import { LoginUseCase } from '../../application/services/login.use-case';
import { ForgotPasswordUseCase } from '../../application/services/forgot-password.use-case';
import { ResetPasswordUseCase } from '../../application/services/reset-password.use-case';
import { ChangePasswordUseCase } from '../../application/services/change-password.use-case';
import { RefreshTokenUseCase } from '../../application/services/refresh-token.use-case';
import { VerifyEmailUseCase } from '../../application/services/verify-email.use-case';
import { GoogleOAuthUseCase } from '../../application/services/google-oauth.use-case';
import { GoogleOAuthStrategy } from '../../infrastructure/oauth/google-oauth.strategy';

import {
  RegisterRequest,
  LoginRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  RefreshTokenRequest,
  GoogleTokenRequest,
  VerifyEmailRequest,
} from '../dto/auth.request.dto';

import config from '../../../common/config/app.config';
import { AuthPrincipal } from '../../interfaces/auth.interface';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly createAccountUseCase: CreateAccountUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly forgotPasswordUseCase: ForgotPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly verifyEmailUseCase: VerifyEmailUseCase,
    private readonly googleOAuthUseCase: GoogleOAuthUseCase,
    private readonly googleOAuthStrategy: GoogleOAuthStrategy,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new account' })
  @ApiResponse({ status: 201, description: 'Account created successfully' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async register(@Body() body: RegisterRequest) {
    return this.createAccountUseCase.execute({
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      password: body.password,
      role: body.role,
    });
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  async login(@Body() body: LoginRequest, @Req() req: Request) {
    return this.loginUseCase.execute({
      email: body.email,
      password: body.password,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Request password reset OTP' })
  @ApiResponse({ status: 200, description: 'OTP sent if email exists' })
  async forgotPassword(@Body() body: ForgotPasswordRequest) {
    return this.forgotPasswordUseCase.execute(body.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with OTP' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  async resetPassword(@Body() body: ResetPasswordRequest) {
    return this.resetPasswordUseCase.execute(
      body.email,
      body.otp,
      body.password,
    );
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Change password (authenticated)' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  async changePassword(
    @Body() body: ChangePasswordRequest,
    @Req() req: Request,
  ) {
    const user = (req as unknown as { user: AuthPrincipal }).user;
    return this.changePasswordUseCase.execute(
      user.id,
      body.oldPassword,
      body.newPassword,
    );
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Tokens refreshed successfully' })
  async refresh(@Body() body: RefreshTokenRequest) {
    return this.refreshTokenUseCase.execute(body.refreshToken);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email with code' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  async verifyEmail(@Body() body: VerifyEmailRequest) {
    return this.verifyEmailUseCase.execute(body.email, body.code);
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login or register with Google ID token' })
  @ApiResponse({ status: 200, description: 'Google authentication successful' })
  async googleLogin(@Body() body: GoogleTokenRequest) {
    return this.googleOAuthUseCase.loginWithIdToken(body.idToken);
  }

  @Get('google')
  @ApiOperation({ summary: 'Redirect to Google OAuth consent screen' })
  @Redirect()
  googleRedirect() {
    const params = new URLSearchParams({
      client_id: config.google_client_id,
      redirect_uri: config.google_redirect_uri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
    });
    return {
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      statusCode: 302,
    };
  }

  @Get('google/callback')
  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiResponse({ status: 200, description: 'Google authentication successful' })
  async googleCallback(@Query('code') code: string) {
    if (!code) {
      return { error: 'No authorization code provided' };
    }
    try {
      const tokens = await this.googleOAuthStrategy.getTokensFromCode(code);
      return this.googleOAuthUseCase.loginWithIdToken(tokens.idToken);
    } catch {
      return { error: 'Google authentication failed' };
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Logout (invalidate tokens)' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  logout() {
    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(userRole.USER, userRole.READER, userRole.AUTHOR, userRole.ADMIN)
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  me(@Req() req: Request) {
    const user = (req as unknown as { user: AuthPrincipal }).user;
    return { data: user };
  }
}
