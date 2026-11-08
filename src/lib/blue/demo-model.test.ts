import { describe, expect, it } from 'vitest';
import { getMessages } from '@/i18n/t';
import { createDemoModel, demoChunks } from './demo-model';
import { buildModelParams } from './handler';
import type { ModelEvent } from './model';

const SERVER = { es: getMessages('es').blue.server, en: getMessages('en').blue.server };

const params = buildModelParams({ locale: 'es', messages: [{ role: 'user', content: 'Hola' }] });

describe('demoChunks', () => {
  it('splits into words that join back into the text', () => {
    const text = SERVER.es.demo;
    const chunks = demoChunks(text);
    expect(chunks.length).toBeGreaterThan(10);
    expect(chunks.join('')).toBe(text);
  });
});

describe('createDemoModel', () => {
  it.each(['es', 'en'] as const)('streams the %s demo text and ends the turn', async (locale) => {
    const stream = createDemoModel(0).stream({
      params,
      locale,
      signal: new AbortController().signal,
    });
    const events: ModelEvent[] = [];
    for await (const event of stream) events.push(event);
    const text = events.map((e) => (e.delta?.type === 'text_delta' ? e.delta.text : '')).join('');
    expect(text).toBe(SERVER[locale].demo);
    expect(events.at(-2)).toEqual({ type: 'message_delta', delta: { stop_reason: 'end_turn' } });
  });

  it('marks itself as a demo in both languages', () => {
    expect(SERVER.es.demo).toMatch(/demostración/);
    expect(SERVER.en.demo).toMatch(/demo/);
  });

  it('stops when aborted', async () => {
    const controller = new AbortController();
    const stream = createDemoModel(5).stream({ params, locale: 'en', signal: controller.signal });
    const seen: ModelEvent[] = [];
    await expect(
      (async () => {
        for await (const event of stream) {
          seen.push(event);
          if (seen.length === 3) controller.abort();
        }
      })(),
    ).rejects.toBeDefined();
    expect(seen).toHaveLength(3);
  });
});
