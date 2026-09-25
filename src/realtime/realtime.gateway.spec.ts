import { Test, TestingModule } from '@nestjs/testing';
import { jwtVerify } from 'jose';
import { RealtimeGateway } from '@/realtime/realtime.gateway';

jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(() => ({})),
  jwtVerify: jest.fn(),
}));

const mockedJwtVerify = jwtVerify as jest.Mock;

describe('RealtimeGateway', () => {
  let gateway: RealtimeGateway;
  let server: { to: jest.Mock; emit: jest.Mock };

  const socket = (token: unknown) => ({
    id: 'socket-1',
    handshake: { auth: { token } },
    join: jest.fn(),
    disconnect: jest.fn(),
  });

  beforeEach(async () => {
    mockedJwtVerify.mockResolvedValue({ payload: { sub: 'user-1' } });
    server = { to: jest.fn().mockReturnThis(), emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [RealtimeGateway],
    }).compile();

    gateway = module.get<RealtimeGateway>(RealtimeGateway);
    (gateway as unknown as { server: unknown }).server = server;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('entra na sala do usuário quando o token é válido', async () => {
    const client = socket('valid-token');

    await gateway.handleConnection(client as never);

    expect(mockedJwtVerify).toHaveBeenCalledWith(
      'valid-token',
      expect.anything(),
      expect.objectContaining({ algorithms: ['RS256'] }),
    );
    expect(client.join).toHaveBeenCalledWith('user:user-1');
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it('desconecta quando o token é inválido ou ausente', async () => {
    mockedJwtVerify.mockRejectedValue(new Error('Token inválido'));
    const invalid = socket('bad-token');
    const missing = socket(undefined);

    await gateway.handleConnection(invalid as never);
    await gateway.handleConnection(missing as never);

    expect(invalid.disconnect).toHaveBeenCalledWith(true);
    expect(missing.disconnect).toHaveBeenCalledWith(true);
    expect(invalid.join).not.toHaveBeenCalled();
  });

  it('emite só para as salas dos usuários informados', () => {
    gateway.emitToUsers(['user-1', 'user-2'], 'notification:new', { id: 'n1' });

    expect(server.to).toHaveBeenCalledWith(['user:user-1', 'user:user-2']);
    expect(server.emit).toHaveBeenCalledWith('notification:new', { id: 'n1' });
  });

  it('não emite quando ninguém aceitou', () => {
    gateway.emitToUsers([], 'notification:new', { id: 'n1' });

    expect(server.to).not.toHaveBeenCalled();
    expect(server.emit).not.toHaveBeenCalled();
  });
});
