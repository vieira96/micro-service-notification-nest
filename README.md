# Notification API

Microsserviço de notificações da livraria, feito em NestJS. Ele consome os eventos publicados pela API Java, persiste cada notificação uma única vez no PostgreSQL, guarda o estado de leitura por usuário em tabela separada, respeita opt-in de tempo real por tipo de canal e entrega via HTTP + WebSocket (Socket.IO).

API Java: [https://github.com/vieira96/api-livraria-java-spring-boot](https://github.com/vieira96/api-livraria-java-spring-boot)

## Como funciona

Ao criar um livro na API Java, ela publica o evento `book.created` no RabbitMQ com id e título. Este serviço consome a fila `notifications.book-created`, monta a notificação (`type`, `title`, `message`, `channels[]`, `path`) e grava uma única linha em `notifications`; quando um usuário lê, uma linha é gravada em `notification_reads`. Em seguida, emite o push `notification:new` via WebSocket **somente para conexões de usuários com opt-in aceito** (`my-preferences`, tipo `APP_NOTIFICATION`).

O produtor precisa enviar o envelope `{"pattern": "book.created", "data": {...}}`; sem o `pattern`, o Nest não roteia a mensagem para o handler.

> Atenção: nesta versão do Nest (10.x), `@EventPattern` em `connectMicroservice` só é descoberto em classes registradas em `controllers:` do módulo — em `providers:` o handler nunca recebe nada (erro `no matching event handler`). Por isso o `NotificationsListener` é `@Controller()` (sem rota HTTP) e mora em `src/notifications/consumers/`.

## Tecnologias

- Node.js 20 + NestJS 10
- Prisma 7 (schema dividido por módulo em `prisma/models/`)
- PostgreSQL 16 (banco próprio, separado do da API Java)
- RabbitMQ 4 (ingestão de eventos)
- Socket.IO 4 (`@nestjs/websockets` + `@nestjs/platform-socket.io`) para o tempo real
- Redis 7 (no compose, reservado)
- Docker Compose

## Rodando com Docker

Você pode preparar o ambiente e subir o projeto com:

```bash
bash run-project.sh
```

O script cria o `.env` a partir do `.env.example` quando necessário, sobe PostgreSQL, Redis e RabbitMQ, aplica as migrations do Prisma e inicia a API em modo Watch. Mantenha o terminal aberto enquanto estiver desenvolvendo; use `Ctrl+C` para encerrar.

Se preferir rodar manualmente, crie o arquivo de ambiente a partir do exemplo:

```bash
cp .env.example .env
```

Depois suba a infra e a API:

```bash
docker compose --env-file .env -f docker/docker-compose.yml up --build
```

A API e a API Java se falam pela rede Docker `library-messaging`, criada com:

```bash
docker network create library-messaging
```

## Portas

Com os valores padrão do `.env`, sem conflito com a API Java (`8000`, `5432`, `6379`):

| Serviço | Host | Container |
| --- | --- | --- |
| API (HTTP + WebSocket) | `8001` (`PORT`) | `8001` |
| PostgreSQL | `5433` (`POSTGRES_PORT`) | `5432` |
| Redis | `6380` | `6379` |
| RabbitMQ | `5672` | `5672` |
| RabbitMQ painel | `15672` | `15672` |

Dentro do Docker, os hosts são `postgres`, `redis` e `rabbitmq`. Fora do Docker (migrate local, dev sem container), use `localhost` com as portas do host. A `DATABASE_URL` do `.env` já vem apontando para dentro do Docker; o `run-project.sh` monta a URL de `localhost` sozinho na hora do migrate.

## Endpoints HTTP

A leitura exige o access token da API Java (`Authorization: Bearer`); o usuário é identificado pelo `sub` do JWT, sem `userId` na URL nem no body.

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/notifications` | Lista paginada, mais recentes primeiro, com `read`/`readAt` do usuário logado. Aceita `?page=` (padrão 1) e `?size=` (padrão 10, máximo 100). Resposta sem `data`, sem `channel` e sem `external`: `{ id, type, title, message, path, url, createdAt, read, readAt }` |
| `GET` | `/notifications/unread-count` | Retorna `{ count }` com as não lidas (o sino usa este) |
| `PATCH` | `/notifications/read-all` | Marca todas como lidas para o usuário logado |
| `PATCH` | `/notifications/:id/read` | Marca uma como lida para o usuário logado |
| `GET` | `/my-preferences` | Retorna **todas** as preferências do usuário (`[{ type, enabled, updatedAt }]`, sem `userId`) |
| `PATCH` | `/my-preferences/update-preference` | Cria ou atualiza por `(usuário, tipo)`. Body `{ enabled, type? }` (`type` padrão `APP_NOTIFICATION`) |

Exemplo:

```http
GET /notifications?page=1&size=10
Authorization: Bearer JWT_DE_ACESSO
```

A resposta segue o formato `{ content, page, size, totalElements, totalPages, hasNext }`, igual ao da API Java. Os DTOs de paginação ficam em `src/common/dto/` e são reutilizáveis por outros módulos.

Tipos de preferência (`PreferenceType`): `APP_NOTIFICATION`, `MAIL_NOTIFICATION`, `WHATSAPP_NOTIFICATION`. Semântica opt-in: sem linha ou `enabled: false` = não recebe tempo real.

## Tempo real (WebSocket)

Conexão Socket.IO na mesma porta da API (`8001`), com o JWT no handshake:

```ts
io('http://localhost:8001', { auth: { token: accessToken } })
```

O gateway valida o token no mesmo JWKS do HTTP, coloca o socket na sala `user:{sub}` e derruba conexões sem token. Eventos emitidos pelo servidor:

| Evento | Quando | Payload |
| --- | --- | --- |
| `notification:new` | `book.created` persistido | DTO da notificação (mesmo formato do `GET`), só para salas de usuários com opt-in aceito |

Um evento por destino: tipos novos com o mesmo comportamento (sino) usam `notification:new` com outro `type`; comportamento novo (ex: tooltip) ganha evento próprio.

## DLQ (dead-letter)

Falhas de consumo não perdem mensagem em silêncio:

* A fila principal declara `x-dead-letter-exchange` (+ routing key explícita) apontando para `{fila}.dlx`; a topologia (DLX direct + DLQ `{fila}.dlq` + binding) é criada no boot pelo `RabbitTopologyService` (`src/rabbit/`).
* O consumer roda com `noAck: false` (padrão do Nest é `true`, que confirma tudo automaticamente). O listener confirma com `ack` no sucesso e rejeita com `nack(msg, false, false)` na falha via `RmqContext` — rejeitada sem requeue cai na DLQ com rastro (`x-death`: motivo, fila, contagem).
* Inspeção e replay hoje são pelo painel do Rabbit (`15672`): **Get messages** na `.dlq` para ver, **Publish** de volta na principal para reprocessar.

Atenção: mudar os args da fila exige recriá-la uma vez (o Rabbit rejeita redeclaração divergente com `PRECONDITION_FAILED`). Com o Nest parado, apague a fila no painel — DLX/DLQ e dados do banco ficam intactos.

## Idempotência

O Rabbit entrega *at-least-once*: se o Nest persistir e cair antes do `ack`, a mensagem é reentregue. Para a 2ª entrega virar no-op, cada notificação tem `event_key` (`{TYPE}:{id de negócio}`, ex: `BOOK_CREATED:{bookId}`) com constraint `UNIQUE`. O `create()` captura o `P2002` e retorna `{ notification, duplicate }`; o listener só emite o push quando `duplicate: false` — duplicada nem cria linha nem notifica, só confirma (`ack`). Isso também torna o replay da DLQ seguro.

## Prisma

O schema é multi-arquivo: `prisma/schema.prisma` tem só `generator` + `datasource`, e cada model ganha um `.prisma` em `prisma/models/`. O `prisma.config.ts` aponta para o diretório (apontar para o arquivo faria os models sumirem silenciosamente).

Para criar uma migration após alterar o schema:

```bash
DATABASE_URL="postgresql://notifications:notifications@localhost:5433/notifications?schema=public" npx prisma migrate dev --name nome-da-migration
```

Se a mudança derruba coluna com dados, o `migrate dev` exige terminal interativo; nesse caso gere o SQL à mão em `prisma/migrations/<timestamp>_<nome>/migration.sql` e aplique com `npx prisma migrate deploy`. Conversões com default (ex: coluna → array) exigem `DROP DEFAULT` antes do `ALTER TYPE`.

No Prisma 7, o `PrismaClient` exige driver adapter explícito (ver `src/prisma/prisma.service.ts`), e campo opcional no `where` usa `{ equals: null }`.

## Testes

```bash
npx jest src/notifications src/preferences src/realtime src/rabbit  # unit + integração (sobe Postgres via Testcontainers)
```

## Próximos passos

1. Replay da DLQ por endpoint (hoje é manual pelo painel).
