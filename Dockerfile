FROM node:20-alpine AS build

RUN apk add --no-cache openssl

WORKDIR /app

COPY . .
RUN npm install

RUN npx prisma generate
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
