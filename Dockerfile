FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM base AS production
COPY . .
EXPOSE 3000 3002
CMD ["node", "server.js"]
