FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npx prisma generate && npm run build
EXPOSE 3333
# db push cria/atualiza as tabelas a partir do schema (MVP). Depois migre p/ prisma migrate.
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/server.js"]
