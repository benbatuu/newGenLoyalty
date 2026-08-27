import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: ConfigService,
          useValue: { get: () => undefined },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('should return ok', () => {
      const health = appController.getHealth();
      expect(health.status).toBe('ok');
      expect(health.service).toBe('ngl-api');
      expect(typeof health.appleWallet).toBe('boolean');
      expect(typeof health.googleWallet).toBe('boolean');
      expect(health.wallet.apple).toMatchObject({
        passTypeId: expect.any(Boolean),
        teamId: expect.any(Boolean),
        cert: expect.any(Boolean),
        key: expect.any(Boolean),
        wwdr: expect.any(Boolean),
        ready: expect.any(Boolean),
      });
    });
  });
});
