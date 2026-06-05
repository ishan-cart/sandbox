FROM docker.io/node:26-alpine AS development

WORKDIR /app
COPY package.json package-lock.json index.html vite.config.ts tsconfig.json ./
RUN npm clean-install
COPY src/ src/
COPY public/ public/
RUN npm run build
CMD ["npm", "run", "dev"]

FROM docker.io/nginxinc/nginx-unprivileged:1.30.2-alpine as production

COPY --from=development /app/dist /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

USER nginx

CMD ["nginx", "-g", "daemon off;"]
