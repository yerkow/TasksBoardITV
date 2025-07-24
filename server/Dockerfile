FROM node:20-alpine AS base
RUN apk add --no-cache openssl

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm install

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate

FROM gcr.io/distroless/nodejs20-debian12 AS production
WORKDIR /app

COPY --from=builder . .

ENV HOSTNAME="0.0.0.0"
CMD ["index.js"]
