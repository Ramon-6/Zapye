import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.string().default("development"),
  API_PORT: z.coerce.number().default(3333),
  JWT_SECRET: z.string().min(8),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string(),
  EVOLUTION_BASE_URL: z.string(),
  EVOLUTION_API_KEY: z.string(),
  EVOLUTION_WEBHOOK_TOKEN: z.string().optional(),
  AI_PROVIDER: z.enum(["openai", "anthropic"]).default("anthropic"),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-4-6"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4o"),
  // URL pública do front (usada nos links do cardápio digital enviados pela IA)
  WEB_PUBLIC_URL: z.string().default("http://localhost:3010"),
  // Pagamento: "virtual" = Pix simulado de teste | "mercadopago" = real (futuro)
  PAYMENT_MODE: z.enum(["virtual", "mercadopago"]).default("virtual"),
});

export const env = schema.parse(process.env);
