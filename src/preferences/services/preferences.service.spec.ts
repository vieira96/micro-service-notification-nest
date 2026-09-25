import { Test, TestingModule } from '@nestjs/testing';
import { PreferenceType } from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { PreferencesService } from '@/preferences/services/preferences.service';

describe('PreferencesService', () => {
  let service: PreferencesService;
  let prisma: {
    notificationPreference: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      upsert: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      notificationPreference: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
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

    expect(prisma.notificationPreference.findUnique).toHaveBeenCalledWith({
      where: {
        userId_type: { userId: 'user-1', type: PreferenceType.APP_NOTIFICATION },
      },
    });
    expect(result).toEqual({
      userId: 'user-1',
      type: PreferenceType.APP_NOTIFICATION,
      enabled: true,
    });
  });

  it('retorna a preferência salva quando existe', async () => {
    const saved = {
      userId: 'user-1',
      type: PreferenceType.APP_NOTIFICATION,
      enabled: false,
      updatedAt: new Date(),
    };
    prisma.notificationPreference.findUnique.mockResolvedValue(saved);

    await expect(service.get('user-1')).resolves.toBe(saved);
  });

  it('lista todas as preferências do usuário sem filtro de tipo', async () => {
    const saved = [
      { type: PreferenceType.APP_NOTIFICATION, enabled: false },
    ];
    prisma.notificationPreference.findMany.mockResolvedValue(saved);

    const result = await service.list('user-1');

    expect(prisma.notificationPreference.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { type: 'asc' },
      select: { type: true, enabled: true, updatedAt: true },
    });
    expect(result).toBe(saved);
  });

  it('salva via upsert assumindo app quando o tipo não é informado', async () => {
    const saved = { userId: 'user-1', enabled: false };
    prisma.notificationPreference.upsert.mockResolvedValue(saved);

    const result = await service.setEnabled('user-1', false);

    expect(prisma.notificationPreference.upsert).toHaveBeenCalledWith({
      where: {
        userId_type: { userId: 'user-1', type: PreferenceType.APP_NOTIFICATION },
      },
      update: { enabled: false },
      create: {
        userId: 'user-1',
        type: PreferenceType.APP_NOTIFICATION,
        enabled: false,
      },
    });
    expect(result).toBe(saved);
  });

  it('salva via upsert para o tipo informado', async () => {
    prisma.notificationPreference.upsert.mockResolvedValue({});

    await service.setEnabled('user-1', true, PreferenceType.MAIL_NOTIFICATION);

    expect(prisma.notificationPreference.upsert).toHaveBeenCalledWith({
      where: {
        userId_type: { userId: 'user-1', type: PreferenceType.MAIL_NOTIFICATION },
      },
      update: { enabled: true },
      create: {
        userId: 'user-1',
        type: PreferenceType.MAIL_NOTIFICATION,
        enabled: true,
      },
    });
  });
});
