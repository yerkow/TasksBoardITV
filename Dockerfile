FROM node:20-alpine AS build

RUN apk add --no-cache openssl

WORKDIR /app

COPY . .
RUN npm install

RUN npx prisma generate
RUN npm run build

CMD ["npm", "run", "start"]
