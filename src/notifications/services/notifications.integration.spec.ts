import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { execSync } from 'node:child_process';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationsService } from '@/notifications/services/notifications.service';

/**
 * Sobe um PostgreSQL temporário, aplica as migrations de verdade e exercita
 * o service de ponta a ponta (criação, leitura com estado, marcação).
 * Espelha o IntegrationTestContainer da API Java.
 */
describe('NotificationsService (integration)', () => {
  jest.setTimeout(180000);

  let container: Awaited<ReturnType<PostgreSqlContainer['start']>>;
  let prisma: PrismaService;
  let service: NotificationsService;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16.3').start();
    process.env.DATABASE_URL = `${container.getConnectionUri()}?schema=public`;

    execSync('npx prisma migrate deploy', {
      env: { ...process.env },
      stdio: 'pipe',
    });

    prisma = new PrismaService();
    await prisma.$connect();
    service = new NotificationsService(prisma);
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await container?.stop();
  });

  it('persiste, lista não lida e marca como lida', async () => {
    const created = await service.create({
      type: 'BOOK_CREATED',
      title: 'Novo livro: Dom Casmurro',
      message: 'O livro "Dom Casmurro" foi adicionado ao catálogo.',
      data: { bookId: 'book-1' },
      channels: ['IN_APP'],
      path: '/book/book-1',
      eventKey: 'BOOK_CREATED:book-1',
    });

    const before = await service.findAll('user-1', { page: 1, size: 10 });
    expect(before.totalElements).toBe(1);
    expect(before.content[0].read).toBe(false);
    expect(before.content[0].readAt).toBeNull();

    await service.markAsRead(created.notification.id, 'user-1');

    const after = await service.findAll('user-1', { page: 1, size: 10 });
    expect(after.content[0].read).toBe(true);
    expect(after.content[0].readAt).not.toBeNull();
  });

  it('markAllAsRead marca tudo de uma vez', async () => {
    await service.create({
      type: 'BOOK_CREATED',
      title: 'Novo livro: Memórias Póstumas',
      message: 'O livro "Memórias Póstumas" foi adicionado ao catálogo.',
      data: { bookId: 'book-2' },
      channels: ['IN_APP'],
      path: '/book/book-2',
      eventKey: 'BOOK_CREATED:book-2',
    });

    const result = await service.markAllAsRead('user-2');

    expect(result.count).toBe(2);
    const page = await service.findAll('user-2', { page: 1, size: 10 });
    expect(page.content.every((item) => item.read)).toBe(true);
  });

  it('segunda entrega do mesmo evento não duplica', async () => {
    const first = await service.create({
      type: 'BOOK_CREATED',
      title: 'Novo livro: Duplicado',
      message: 'msg',
      channels: ['IN_APP'],
      path: '/book/book-3',
      eventKey: 'BOOK_CREATED:book-3',
    });
    const second = await service.create({
      type: 'BOOK_CREATED',
      title: 'Novo livro: Duplicado',
      message: 'msg',
      channels: ['IN_APP'],
      path: '/book/book-3',
      eventKey: 'BOOK_CREATED:book-3',
    });

    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(second.notification.id).toBe(first.notification.id);
    const page = await service.findAll('user-3', { page: 1, size: 10 });
    expect(
      page.content.filter((item) =>
        item.title.includes('Duplicado'),
      ).length,
    ).toBe(1);
  });
});
