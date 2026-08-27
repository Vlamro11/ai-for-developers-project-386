FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Типы (src/api/schema.ts) уже сгенерированы из contract/openapi.yaml и
# закоммичены в репозиторий, поэтому пересборка образа не требует
# доступа к папке contract/ во время docker build. При изменении
# openapi.yaml типы нужно перегенерировать локально (`npm run generate:types`)
# и закоммитить результат.
RUN npm run build

FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html


EXPOSE 80
