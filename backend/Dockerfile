# cache bust 2026-09-02
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache iputils
COPY package*.json ./
RUN npm install
COPY . .
RUN npm install -g tsx
ENV NODE_ENV=production
EXPOSE 4000
CMD ["tsx", "src/index.ts"]
