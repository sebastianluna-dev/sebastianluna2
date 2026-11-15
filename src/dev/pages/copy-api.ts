/**
 * Dev-only endpoint of the copy editor (`/dev/api/copy`, injected by `astro.config.ts` under
 * `astro dev`): swaps one text of a case or an article in its MDX file. It only ever writes inside
 * `src/content/{works,writings}/<locale>/<slug>.mdx`, the path `copySourcePath` derives.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { APIRoute } from 'astro';
import { format, resolveConfig } from 'prettier';
import { DEFAULT_LOCALE } from '@/i18n/locales';
import { copySourcePath, replaceCopy } from '@/lib/copy-edit';

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export const POST: APIRoute = async ({ request }) => {
  if (!import.meta.env.DEV) return json({ ok: false, reason: 'unavailable' }, 404);
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const { path, before, after } = body ?? {};
  if (typeof path !== 'string' || typeof before !== 'string' || typeof after !== 'string') {
    return json({ ok: false, reason: 'unsafe' }, 400);
  }
  const relative = copySourcePath(path, DEFAULT_LOCALE);
  if (!relative) return json({ ok: false, reason: 'missing' }, 404);

  const file = new URL(`../../../${relative}`, import.meta.url);
  const source = await readFile(file, 'utf8').catch(() => null);
  if (source === null) return json({ ok: false, reason: 'missing' }, 404);

  const result = replaceCopy(source, before, after);
  if (!result.ok) return json(result, 422);
  // Saved the way the repository formats it, so a correction never leaves the file unformatted.
  const formatted = await format(result.source, {
    ...(await resolveConfig(fileURLToPath(file))),
    filepath: fileURLToPath(file),
  }).catch(() => result.source);
  await writeFile(file, formatted, 'utf8');
  return json({ ok: true, file: relative });
};
