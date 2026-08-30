FROM node:20-alpine AS base
WORKDIR /app

# wireguard-tools + iputils (ping) for real key generation, peer management, health checks
RUN apk add --no-cache wireguard-tools iputils

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 4000

CMD ["node", "dist/index.js"]
