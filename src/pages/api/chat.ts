import type { APIRoute } from 'astro';
import {
  ANTHROPIC_API_KEY,
  BLUE_IP_SALT,
  UPSTASH_REDIS_REST_TOKEN,
  UPSTASH_REDIS_REST_URL,
} from 'astro:env/server';
import { SITE_URL } from '@/data/site';
import { createDemoModel } from '@/lib/blue/demo-model';
import { createChatHandler } from '@/lib/blue/handler';
import { createAnthropicModel, type ChatModel } from '@/lib/blue/model';
import { createChatLimiter } from '@/lib/blue/rate-limit';

// Rendered on demand: this is the only Vercel function of the site.
export const prerender = false;

function resolveModel(): ChatModel | null {
  if (ANTHROPIC_API_KEY) return createAnthropicModel(ANTHROPIC_API_KEY);
  // Without a key: a marked demo answer in development, `503 not_configured` everywhere else.
  if (import.meta.env.DEV) {
    console.warn('[blue] ANTHROPIC_API_KEY is not set; the chat answers in local demo mode.');
    return createDemoModel();
  }
  return null;
}

let handler: ReturnType<typeof createChatHandler> | undefined;

// Built once per function instance, so the memory limiter keeps its counts between requests.
function getHandler() {
  handler ??= createChatHandler({
    model: resolveModel(),
    limiter: createChatLimiter({ url: UPSTASH_REDIS_REST_URL, token: UPSTASH_REDIS_REST_TOKEN }),
    siteUrl: SITE_URL,
    // The salt, else the Upstash token: either way a secret the keys in Redis do not reveal.
    ipSecret: BLUE_IP_SALT || UPSTASH_REDIS_REST_TOKEN,
  });
  return handler;
}

function clientAddressOf(context: Parameters<APIRoute>[0]): string | undefined {
  try {
    return context.clientAddress;
  } catch {
    // Astro throws when the adapter cannot tell; the handler falls back to the headers.
    return undefined;
  }
}

/** Every method goes through the handler, which answers 405 with `Allow: POST` to all but POST. */
export const ALL: APIRoute = (context) =>
  getHandler()({ request: context.request, clientAddress: clientAddressOf(context) });
