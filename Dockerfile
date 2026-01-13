FROM node:22-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY src/ ./src/
COPY tsconfig.json ./

RUN mkdir -p /app/data

ENV NODE_ENV=production

CMD ["node", "--import", "tsx", "src/index.ts"]
