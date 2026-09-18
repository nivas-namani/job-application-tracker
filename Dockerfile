FROM node:20-bookworm-slim

# Prisma reads the OpenSSL version to choose its query-engine binary. The slim
# image omits OpenSSL, so Prisma warns and falls back to a guessed version.
RUN apt-get update -y     && apt-get install -y --no-install-recommends openssl ca-certificates     && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 4000

CMD ["npm", "run", "start", "-w", "@trackify/server"]
