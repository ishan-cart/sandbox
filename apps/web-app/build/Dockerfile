FROM docker.io/node:26-alpine AS build

WORKDIR /app
COPY package.json package-lock.json index.html vite.config.ts tsconfig.json .
RUN npm clean-install
COPY src/ src/
RUN npm run build
RUN ls

FROM docker.io/nginx:1.30.2-alpine

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
