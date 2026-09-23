# Notification API

Microsserviço de notificações da livraria, feito em NestJS. Ele consome os eventos publicados pela API Java, persiste cada notificação uma única vez no PostgreSQL, guarda o estado de leitura por usuário em tabela separada e expõe a leitura via HTTP para o sino do front.

API Java: [https://github.com/vieira96/api-livraria-java-spring-boot](https://github.com/vieira96/api-livraria-java-spring-boot)

## Como funciona

Ao criar um livro na API Java, ela publica o evento `book.created` no RabbitMQ com o id e o título. Este serviço consome a fila `notifications.book-created` e grava uma única linha em `notifications`; quando um usuário lê, uma linha é gravada em `notification_reads`. O tempo real (WebSocket) ainda não existe — por enquanto, o front consulta por polling nos endpoints abaixo.

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

A leitura exige o access token da API Java (`Authorization: Bearer`); o usuário é identificado pelo `sub` do JWT, sem `userId` na URL.

| Método | Rota | Descrição |
| --- | --- | --- |
| `GET` | `/notifications` | Lista paginada, mais recentes primeiro, com `read`/`readAt` do usuário logado. Aceita `?page=` (padrão 1) e `?size=` (padrão 10, máximo 100) |
| `PATCH` | `/notifications/read-all` | Marca todas como lidas para o usuário logado |
| `PATCH` | `/notifications/:id/read` | Marca uma como lida para o usuário logado |

Exemplo:

```http
GET /notifications?page=1&size=10
Authorization: Bearer JWT_DE_ACESSO
```

A resposta segue o formato `{ content, page, size, totalElements, totalPages, hasNext }`, igual ao da API Java. Os DTOs de paginação ficam em `src/common/dto/` e são reutilizáveis por outros módulos.

## Prisma

O schema é multi-arquivo: `prisma/schema.prisma` tem só `generator` + `datasource`, e cada model ganha um `.prisma` em `prisma/models/`. O `prisma.config.ts` aponta para o diretório (apontar para o arquivo faria os models sumirem silenciosamente).

Para criar uma migration após alterar o schema:

```bash
DATABASE_URL="postgresql://notifications:notifications@localhost:5433/notifications?schema=public" npx prisma migrate dev --name nome-da-migration
```

Se a mudança derruba coluna com dados, o `migrate dev` exige terminal interativo; nesse caso gere o SQL à mão em `prisma/migrations/<timestamp>_<nome>/migration.sql` e aplique com `npx prisma migrate deploy`.

No Prisma 7, o `PrismaClient` exige driver adapter explícito (ver `src/prisma/prisma.service.ts`), e campo opcional no `where` usa `{ equals: null }`.

## Próximos passos

1. **Opt-in em tempo real** — preferência já mora aqui (`notification_preferences`, `GET/PATCH /preferences/me`); falta o gateway só emitir para conexões de usuários opt-in.
2. Ligar o sino do front nestes endpoints (hoje ele usa mocks).
3. DLQ e idempotência no consumo da fila.
