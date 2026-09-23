import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@/prisma/prisma.service';
import { PreferencesService } from '@/preferences/services/preferences.service';

describe('PreferencesService', () => {
  let service: PreferencesService;
  let prisma: {
    notificationPreference: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      notificationPreference: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PreferencesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PreferencesService>(PreferencesService);
  });

  it('retorna habilitado por padrão quando não há preferência salva', async () => {
    prisma.notificationPreference.findUnique.mockResolvedValue(null);

    const result = await service.get('user-1');

    expect(result).toEqual({ userId: 'user-1', enabled: true });
  });

  it('retorna a preferência salva quando existe', async () => {
    const saved = {
      userId: 'user-1',
      enabled: false,
      updatedAt: new Date(),
    };
    prisma.notificationPreference.findUnique.mockResolvedValue(saved);

    await expect(service.get('user-1')).resolves.toBe(saved);
  });

  it('salva via upsert', async () => {
    const saved = { userId: 'user-1', enabled: false };
    prisma.notificationPreference.upsert.mockResolvedValue(saved);

    const result = await service.setEnabled('user-1', false);

    expect(prisma.notificationPreference.upsert).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      update: { enabled: false },
      create: { userId: 'user-1', enabled: false },
    });
    expect(result).toBe(saved);
  });
});
