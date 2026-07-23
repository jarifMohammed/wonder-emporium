import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Patch,
  Post,
  Req,
  Redirect,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
} from '@nestjs/swagger';
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
import { ResendVerificationUseCase } from '../../application/services/resend-verification.use-case';
import { VerifyPasswordResetOtpUseCase } from '../../application/services/verify-password-reset-otp.use-case';
import { UpdateProfileUseCase } from '../../application/services/update-profile.use-case';
import { UpdateEmailUseCase } from '../../application/services/update-email.use-case';

import {
  RegisterRequest,
  LoginRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  RefreshTokenRequest,
  GoogleTokenRequest,
  VerifyEmailRequest,
  ResendVerificationRequest,
  VerifyPasswordResetOtpRequest,
  UpdateProfileRequest,
  UpdateEmailRequest,
} from '../dto/auth.request.dto';

import config from '../../../common/config/app.config';
import { AuthPrincipal } from '../../interfaces/auth.interface';
import { S3FileStorageService } from '../../../books/infrastructure/storage/s3-file-storage.service';
import { AUTH_USER_REPOSITORY_TOKEN } from '../../domain/interfaces/auth-user.repository.interface';
import type { IAuthUserRepository } from '../../domain/interfaces/auth-user.repository.interface';

@ApiTags('Users')
@Throttle({
  default: { limit: 500, ttl: 60000 },
  strict: { limit: 500, ttl: 60000 },
  auth: { limit: 500, ttl: 60000 },
  relaxed: { limit: 500, ttl: 60000 },
})
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
    private readonly resendVerificationUseCase: ResendVerificationUseCase,
    private readonly verifyPasswordResetOtpUseCase: VerifyPasswordResetOtpUseCase,
    private readonly updateProfileUseCase: UpdateProfileUseCase,
    private readonly updateEmailUseCase: UpdateEmailUseCase,
    private readonly s3Storage: S3FileStorageService,
    @Inject(AUTH_USER_REPOSITORY_TOKEN)
    private readonly userRepository: IAuthUserRepository,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new account',
    description:
      'This route is used by users or authors to register a new account on the platform. It takes a first name, last name, email, password, and role. Upon success, it creates the user record.',
  })
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
  @ApiOperation({
    summary: 'Login with email and password',
    description:
      'Authenticates a user using email and password. Returns an access token and refresh token upon success. Used for standard login flow.',
  })
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
  @ApiOperation({ summary: 'Request password reset OTP' })
  @ApiResponse({ status: 200, description: 'OTP sent if email exists' })
  async forgotPassword(@Body() body: ForgotPasswordRequest) {
    return this.forgotPasswordUseCase.execute(body.email);
  }

  @Post('resend-password-reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend password reset OTP' })
  @ApiResponse({ status: 200, description: 'OTP sent if email exists' })
  async resendPasswordReset(@Body() body: ForgotPasswordRequest) {
    return this.forgotPasswordUseCase.execute(body.email);
  }

  @Post('verify-password-reset-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify a password reset OTP' })
  @ApiResponse({ status: 200, description: 'OTP verified successfully' })
  async verifyPasswordResetOtp(@Body() body: VerifyPasswordResetOtpRequest) {
    return this.verifyPasswordResetOtpUseCase.execute(body.email, body.otp);
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

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification code' })
  @ApiResponse({
    status: 200,
    description: 'Code sent if verification is required',
  })
  async resendVerification(@Body() body: ResendVerificationRequest) {
    return this.resendVerificationUseCase.execute(body.email);
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
  @ApiOperation({
    summary: 'Get current user profile',
    description:
      'Fetches the profile details of the currently authenticated user. Validates the JWT token and returns user metadata.',
  })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  async me(@Req() req: Request) {
    const user = (req as unknown as { user: AuthPrincipal }).user;
    const [authUser, profile] = await Promise.all([
      this.userRepository.findById(user.id),
      this.userRepository.findProfileByAuthId(user.id),
    ]);
    return {
      data: {
        ...user,
        isFoundingAuthor: authUser?.isFoundingAuthor ?? false,
        profile,
      },
    };
  }

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Update author profile (name, location)' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(@Body() body: UpdateProfileRequest, @Req() req: Request) {
    const user = (req as unknown as { user: AuthPrincipal }).user;
    return this.updateProfileUseCase.execute(user.id, {
      firstName: body.firstName,
      lastName: body.lastName,
      location: body.location,
    });
  }

  @Patch('avatar')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload or update profile picture' })
  @ApiResponse({ status: 200, description: 'Avatar updated successfully' })
  async updateAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    const user = (req as unknown as { user: AuthPrincipal }).user;
    if (!file) {
      return { message: 'No file provided' };
    }
    const uploaded = await this.s3Storage.uploadFile(
      file,
      `avatars/${user.id}`,
    );
    await this.updateProfileUseCase.execute(user.id, {
      avatarUrl: uploaded.url,
    });
    return { message: 'Avatar updated successfully', avatarUrl: uploaded.url };
  }

  @Patch('email')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Change email address (requires password confirmation)',
  })
  @ApiResponse({ status: 200, description: 'Email updated successfully' })
  async updateEmail(@Body() body: UpdateEmailRequest, @Req() req: Request) {
    const user = (req as unknown as { user: AuthPrincipal }).user;
    return this.updateEmailUseCase.execute(
      user.id,
      body.newEmail,
      body.password,
    );
  }
}
