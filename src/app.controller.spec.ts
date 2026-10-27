import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { EMAIL_SENDER_TOKEN } from './common/domain/interfaces/email-sender.interface';
import { AccessTokenAuthenticator } from './auth/application/services/access-token-authenticator.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: EMAIL_SENDER_TOKEN,
          useValue: { send: jest.fn() },
        },
        {
          provide: AccessTokenAuthenticator,
          useValue: { authenticate: jest.fn() },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
