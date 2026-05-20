FROM node:26-alpine

WORKDIR /app

COPY package.json package-lock.json index.html vite.config.ts tsconfig.json .

RUN npm install

COPY src/ src/

# RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "dev"]

