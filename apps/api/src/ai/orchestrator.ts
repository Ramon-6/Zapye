import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { buildSystemPrompt } from "./prompt.js";
import { toolDefinitions, toolHandlers, type ToolContext } from "./tools.js";

const MAX_TOOL_ITERATIONS = 6;
const HISTORY_LIMIT = 20;

const anthropic = env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }) : null;
const openai = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;

async function runTool(ctx: ToolContext, name: string, args: any) {
  const handler = toolHandlers[name];
  if (!handler) return { error: `tool desconhecida: ${name}` };
  try {
    return await handler(ctx, args ?? {});
  } catch (err) {
    return { error: (err as Error).message };
  }
}

/**
 * Processa uma mensagem do cliente e devolve a resposta em texto da IA.
 * Multi-turn com tool-calling; o restaurante/cliente nunca vêm do modelo.
 */
export async function runAgent(opts: {
  ctx: ToolContext;
  restaurantName: string;
  extraTone?: string | null;
  userText: string;
}): Promise<string> {
  const system = buildSystemPrompt({ restaurantName: opts.restaurantName, extraTone: opts.extraTone });

  // histórico recente da conversa
  const history = await prisma.message.findMany({
    where: { conversationId: opts.ctx.conversationId },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
  });
  history.reverse();

  if (env.AI_PROVIDER === "anthropic") {
    return runAnthropic(system, history, opts);
  }
  return runOpenAI(system, history, opts);
}

// ──────────────────────────── Claude ────────────────────────────
async function runAnthropic(system: string, history: any[], opts: any): Promise<string> {
  if (!anthropic) throw new Error("ANTHROPIC_API_KEY ausente");

  const tools = toolDefinitions.map((t) => ({
    name: t.name, description: t.description, input_schema: t.parameters as any,
  }));

  const messages: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.sender === "CLIENT" ? "user" : "assistant",
    content: m.content,
  }));
  messages.push({ role: "user", content: opts.userText });

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const res = await anthropic.messages.create({
      model: env.ANTHROPIC_MODEL, max_tokens: 1024, system, tools, messages,
    });

    const toolUses = res.content.filter((c) => c.type === "tool_use") as Anthropic.ToolUseBlock[];
    if (toolUses.length === 0) {
      return res.content.filter((c) => c.type === "text").map((c: any) => c.text).join("\n").trim();
    }

    messages.push({ role: "assistant", content: res.content });
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      const out = await runTool(opts.ctx, tu.name, tu.input);
      results.push({ type: "tool_result", tool_use_id: tu.id, content: JSON.stringify(out) });
    }
    messages.push({ role: "user", content: results });
  }
  return "Desculpa, tive um problema pra montar seu pedido. Vou chamar um atendente. 🙏";
}

// ──────────────────────────── OpenAI ────────────────────────────
async function runOpenAI(system: string, history: any[], opts: any): Promise<string> {
  if (!openai) throw new Error("OPENAI_API_KEY ausente");

  const tools = toolDefinitions.map((t) => ({
    type: "function" as const,
    function: { name: t.name, description: t.description, parameters: t.parameters as any },
  }));

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: system },
    ...history.map((m) => ({
      role: (m.sender === "CLIENT" ? "user" : "assistant") as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: opts.userText },
  ];

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const res = await openai.chat.completions.create({
      model: env.OPENAI_MODEL, messages, tools, tool_choice: "auto",
    });
    const msg = res.choices[0].message;
    if (!msg.tool_calls?.length) return (msg.content ?? "").trim();

    messages.push(msg);
    for (const call of msg.tool_calls) {
      const args = JSON.parse(call.function.arguments || "{}");
      const out = await runTool(opts.ctx, call.function.name, args);
      messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(out) });
    }
  }
  return "Desculpa, tive um problema pra montar seu pedido. Vou chamar um atendente. 🙏";
}
