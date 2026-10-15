import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class OnboardAuthorDto {
  @ApiPropertyOptional({
    description: 'Email of the author to register with Stripe',
    example: 'author@example.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email address' })
  email?: string;

  @ApiPropertyOptional({
    description: 'Country code for Stripe account',
    example: 'US',
    default: 'US',
  })
  @IsOptional()
  @IsString()
  country?: string;
}
