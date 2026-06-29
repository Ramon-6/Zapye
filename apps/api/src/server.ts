import Fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./config/env.js";
import { registerAuth } from "./lib/auth.js";
import { webhookRoutes } from "./routes/webhooks.js";
import { authRoutes } from "./routes/auth.js";
import { orderRoutes } from "./routes/orders.js";
import { menuRoutes } from "./routes/menu.js";
import { conversationRoutes } from "./routes/conversations.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { whatsappRoutes } from "./routes/whatsapp.js";
import { settingsRoutes } from "./routes/settings.js";
import { deliveryRoutes } from "./routes/delivery.js";
import { publicRoutes } from "./routes/public.js";
import { financeRoutes } from "./routes/finance.js";
import { clientRoutes } from "./routes/clients.js";

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await registerAuth(app);

app.get("/health", async () => ({ ok: true, service: "zapye-api" }));

// públicas
await app.register(webhookRoutes);
await app.register(authRoutes);
await app.register(publicRoutes);

// autenticadas (cada uma aplica authGuard internamente)
await app.register(orderRoutes);
await app.register(menuRoutes);
await app.register(conversationRoutes);
await app.register(dashboardRoutes);
await app.register(whatsappRoutes);
await app.register(settingsRoutes);
await app.register(deliveryRoutes);
await app.register(financeRoutes);
await app.register(clientRoutes);

app
  .listen({ port: env.API_PORT, host: "0.0.0.0" })
  .then(() => app.log.info(`ZAPYE API on :${env.API_PORT}`))
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
