FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx prisma generate

# A porta é definida em tempo de execução por PORT no arquivo .env.
EXPOSE 8001

CMD ["npm", "run", "start:dev"]
