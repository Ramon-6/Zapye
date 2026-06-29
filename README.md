# ZAPYE Food 🍔

Central de atendimento com IA no WhatsApp para lanchonetes, hamburguerias, pizzarias, açaiterias e pequenos restaurantes.

A IA conversa com o cliente, mostra o cardápio, monta o carrinho, calcula a taxa de entrega, confirma o pedido, envia o Pix e joga tudo no painel da cozinha — sem inventar produto, preço ou taxa.

## Stack

| Camada      | Tecnologia                          |
|-------------|-------------------------------------|
| Frontend    | Next.js (App Router) + Tailwind     |
| Backend     | Node.js + Fastify + TypeScript      |
| Banco       | PostgreSQL                          |
| ORM         | Prisma                              |
| Cache/Fila  | Redis (BullMQ)                      |
| WhatsApp    | Evolution API                       |
| IA          | OpenAI **ou** Claude (tool-calling) |
| Deploy      | Docker Compose (VPS Hostinger)      |

## Estrutura do monorepo

```
zapye-food/
├── docker-compose.yml
├── .env.example
├── apps/
│   ├── api/        # Fastify + Prisma + IA + webhook Evolution
│   └── web/        # Next.js (dashboard, inbox, cardápio, cozinha)
```

## Como rodar (dev)

```bash
cp .env.example .env          # preencha as chaves
docker compose up -d postgres redis
cd apps/api
npm install
npx prisma migrate dev
npm run dev                   # API em http://localhost:3333
```

## Princípios da IA (não negociáveis)

A IA **nunca** inventa produto, preço, adicional ou taxa. Toda informação vem de
*tools* que leem o banco. Ela **nunca** confirma pagamento sozinha: ao receber
comprovante o pedido vai para `AGUARDANDO_VALIDACAO_HUMANA`. Sempre confirma o
pedido completo antes de criar. Pediu humano → transfere na hora.
