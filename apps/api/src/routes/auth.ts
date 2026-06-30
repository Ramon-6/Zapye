import type { FastifyInstance } from "fastify";
import { createHash } from "node:crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authGuard } from "../lib/auth.js";

const hash = (s: string) => createHash("sha256").update(s).digest("hex");

const loginBody = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/login", async (req, reply) => {
    const parsed = loginBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "dados inválidos" });

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user || user.passwordHash !== hash(parsed.data.password) || !user.restaurantId) {
      return reply.code(401).send({ error: "credenciais inválidas" });
    }

    const token = app.jwt.sign(
      { sub: user.id, restaurantId: user.restaurantId, role: user.role },
      { expiresIn: "7d" },
    );
    return { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
  });

  app.get("/auth/me", { preHandler: [authGuard] }, async (req) => {
    const { sub } = req.user as any;
    const user = await prisma.user.findUnique({ where: { id: sub }, select: { id: true, name: true, email: true, role: true } });
    if (!user) throw new Error("usuário não encontrado");
    return user;
  });
}
