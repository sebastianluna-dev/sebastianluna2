import type { APIRoute } from 'astro';

// Rendered on demand: this is the only Vercel function of the site.
export const prerender = false;

// Placeholder until the Blue chat lands (phase 6).
export const POST: APIRoute = () =>
  new Response(JSON.stringify({ error: 'not_implemented' }), {
    status: 501,
    headers: { 'Content-Type': 'application/json' },
  });
