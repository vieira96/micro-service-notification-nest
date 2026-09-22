# Notification API

Microsserviço de notificações da livraria, feito em NestJS. Ele consome os eventos publicados pela API Java, persiste uma notificação por usuário no PostgreSQL e expõe a leitura via HTTP para o sino do front.

API Java: [https://github.com/vieira96/api-livraria-java-spring-boot](https://github.com/vieira96/api-livraria-java-spring-boot)

## Como funciona

Ao criar um livro na API Java, ela publica o evento `book.created` no RabbitMQ com o id, o título e os destinatários em lotes de 100. Este serviço consome a fila `notifications.book-created` e grava uma linha por usuário com `createMany`. O tempo real (WebSocket) ainda não existe — por enquanto, o front consulta por polling nos endpoints abaixo.

O produtor precisa enviar o envelope `{"pattern": "book.created", "data": {...}}`; sem o `pattern`, o Nest não roteia a mensagem para o handler. Detalhe documentado no código em `src/notifications/notifications.controller.ts`.

## Tecnologias

- Node.js 20 + NestJS 10
- Prisma 7 (schema dividido por módulo em `prisma/models/`)
- PostgreSQL 16 (banco próprio, separado do da API Java)
- RabbitMQ 4 (ingestão de eventos)
- Redis 7 (reservado para o pub/sub do tempo real)
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
| API | `8001` (`PORT`) | `8001` |
| PostgreSQL | `5433` (`POSTGRES_PORT`) | `5432` |
| Redis | `6380` | `6379` |
| RabbitMQ | `5672` | `5672` |
| RabbitMQ painel | `15672` | `15672` |

Dentro do Docker, os hosts são `postgres`, `redis` e `rabbitmq`. Fora do Docker (migrate local, dev sem container), use `localhost` com as portas do host. A `DATABASE_URL` do `.env` já vem apontando para dentro do Docker; o `run-project.sh` monta a URL de `localhost` sozinho na hora do migrate.

## Endpoints

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/notifications` | Lista notificações, mais recentes primeiro. Aceita `?userId=` para trazer as direcionadas ao usuário mais as globais |
| `PATCH` | `/notifications/read-all` | Marca todas como lidas. Aceita `?userId=` |
| `PATCH` | `/notifications/:id/read` | Marca uma como lida |

Exemplo:

```http
GET /notifications?userId=5d6a189f-3549-42c6-a02e-d4185faefeea
```

## Prisma

O schema é multi-arquivo: `prisma/schema.prisma` tem só `generator` + `datasource`, e cada módulo ganha um `.prisma` em `prisma/models/`. O `prisma.config.ts` aponta para o diretório (apontar para o arquivo faria os models sumirem silenciosamente).

Para criar uma migration após alterar o schema:

```bash
DATABASE_URL="postgresql://notifications:notifications@localhost:5433/notifications?schema=public" npx prisma migrate dev --name nome-da-migration
```

No Prisma 7, o `PrismaClient` exige driver adapter explícito (ver `src/prisma/prisma.service.ts`), e campo opcional no `where` usa `{ equals: null }`.

## Próximos passos

1. **Testes** — sim, precisa: teste do `NotificationsService` (Prisma mockado) cobrindo `createMany` por lote, leitura e marcação como lida, mais teste do controller HTTP. O consumer RMQ entra com o service mockado.
2. **Tempo real** via WebSocket (gateway + adapter Redis para escalar horizontalmente).
3. Ligar o sino do front nestes endpoints (hoje ele usa mocks).
4. Filtro de opt-in na busca de destinatários (hoje traz todos os usuários).
5. DLQ e idempotência no consumo da fila.
