import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fastifyJwt from "@fastify/jwt";
import { env } from "../config/env.js";

// Payload do JWT: identifica usuário e a loja (tenant) que ele opera.
export type JwtUser = { sub: string; restaurantId: string; role: string };

// @fastify/jwt define req.user a partir desta interface.
declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JwtUser;
    user: JwtUser;
  }
}

export async function registerAuth(app: FastifyInstance) {
  await app.register(fastifyJwt, { secret: env.JWT_SECRET });
}

// Guard: exige token válido e expõe req.user. Use como preHandler.
export async function authGuard(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
  } catch {
    return reply.code(401).send({ error: "não autenticado" });
  }
}

// Garante que o recurso pertence à loja do token (defesa multi-tenant).
export function tenantId(req: FastifyRequest): string {
  return req.user.restaurantId;
}
