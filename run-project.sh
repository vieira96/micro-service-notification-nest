#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

if ! command -v docker >/dev/null 2>&1; then
    echo "Docker não foi encontrado. Instale o Docker Engine ou Docker Desktop antes de continuar."
    exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
    echo "O plugin Docker Compose não foi encontrado."
    exit 1
fi

if ! docker network inspect library-messaging >/dev/null 2>&1; then
    echo "Criando a rede Docker compartilhada library-messaging..."
    docker network create library-messaging >/dev/null
fi

if ! command -v npm >/dev/null 2>&1; then
    echo "O npm não foi encontrado. Instale o Node.js 20+ antes de continuar."
    exit 1
fi

if [[ ! -f .env ]]; then
    cp .env.example .env
    echo "Arquivo .env criado a partir de .env.example."
fi

if [[ ! -d node_modules ]]; then
    echo "Instalando dependências..."
    npm ci
fi

port="$(grep '^PORT=' .env | cut -d= -f2- || true)"
port="${port:-8001}"

if ! [[ "$port" =~ ^[0-9]+$ ]]; then
    echo "PORT deve ser uma porta numérica no arquivo .env."
    exit 1
fi

db_user="$(grep '^POSTGRES_USER=' .env | cut -d= -f2- || true)"
db_user="${db_user:-notifications}"
db_password="$(grep '^POSTGRES_PASSWORD=' .env | cut -d= -f2- || true)"
db_password="${db_password:-notifications}"
db_name="$(grep '^POSTGRES_DB=' .env | cut -d= -f2- || true)"
db_name="${db_name:-notifications}"
db_host_port="$(grep '^POSTGRES_PORT=' .env | cut -d= -f2- || true)"
db_host_port="${db_host_port:-5433}"

if ! [[ "$db_host_port" =~ ^[0-9]+$ ]]; then
    echo "POSTGRES_PORT deve ser uma porta numérica no arquivo .env."
    exit 1
fi

echo "Subindo PostgreSQL e Redis..."
docker compose --env-file .env -f docker/docker-compose.yml up -d postgres redis

echo "Aguardando o PostgreSQL aceitar conexões..."
ready=0
for _ in $(seq 1 30); do
    if docker exec notification-api-postgres pg_isready -U "$db_user" -d "$db_name" >/dev/null 2>&1; then
        ready=1
        break
    fi
    sleep 2
done

if [[ "$ready" -ne 1 ]]; then
    echo "O PostgreSQL não ficou pronto a tempo. Veja os logs com:"
    echo "  docker logs notification-api-postgres"
    exit 1
fi

echo "Aplicando migrations do Prisma e gerando o client..."
DATABASE_URL="postgresql://${db_user}:${db_password}@localhost:${db_host_port}/${db_name}?schema=public" \
    npx prisma migrate deploy
DATABASE_URL="postgresql://${db_user}:${db_password}@localhost:${db_host_port}/${db_name}?schema=public" \
    npx prisma generate

echo
echo "Construindo e iniciando a API..."
echo
echo "Projeto pronto em http://localhost:${port}"
echo "PostgreSQL em localhost:${db_host_port} | Redis em localhost:6380"
echo "Watch ativo. Use Ctrl+C para encerrar."

docker compose --env-file .env -f docker/docker-compose.yml up --build --watch
