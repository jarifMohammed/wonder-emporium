import { ValidationPipe, ArgumentMetadata } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SubscribeDto } from './newsletter.controller';

describe('NewsletterController & SubscribeDto Validation', () => {
  let target: ValidationPipe;
  const metadata: ArgumentMetadata = {
    type: 'body',
    metatype: SubscribeDto,
    data: '',
  };

  beforeEach(() => {
    target = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
  });

  it('validates and accepts a valid email with transformation', async () => {
    const raw = { email: '  Reader@TheWonderEmporium.com  ' };
    const transformed = (await target.transform(raw, metadata)) as SubscribeDto;

    expect(transformed.email).toBe('reader@thewonderemporium.com');
  });

  it('rejects an invalid email format with a clear error message', async () => {
    const raw = { email: 'not-an-email' };
    const instance = plainToInstance(SubscribeDto, raw);
    const errors = await validate(instance);

    expect(errors.length).toBeGreaterThan(0);
    const messages = Object.values(errors[0].constraints || {});
    expect(messages.some((m) => m.includes('Please provide a valid email address'))).toBe(true);
  });

  it('rejects an empty email', async () => {
    const raw = { email: '' };
    const instance = plainToInstance(SubscribeDto, raw);
    const errors = await validate(instance);

    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects unknown properties under forbidNonWhitelisted', async () => {
    const raw = { email: 'user@example.com', maliciousField: 'hack' };
    await expect(target.transform(raw, metadata)).rejects.toThrow();
  });
});
