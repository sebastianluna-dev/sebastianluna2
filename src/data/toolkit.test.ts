import { describe, expect, it } from 'vitest';
import { about as aboutEn } from '@/i18n/messages/en/about';
import { about as aboutEs } from '@/i18n/messages/es/about';
import { TOOLKIT } from './toolkit';

describe('TOOLKIT', () => {
  it('has five collections of three or four tools', () => {
    expect(TOOLKIT).toHaveLength(5);
    for (const collection of TOOLKIT) {
      expect(collection.tools.length).toBeGreaterThanOrEqual(3);
      expect(collection.tools.length).toBeLessThanOrEqual(4);
    }
  });

  it('uses unique collection ids, lamps and tools', () => {
    expect(new Set(TOOLKIT.map((c) => c.id)).size).toBe(TOOLKIT.length);
    expect(TOOLKIT.map((c) => c.lamp)).toEqual([1, 2, 3, 4, 5]);
    const tools = TOOLKIT.flatMap((c) => c.tools.map((t) => t.id));
    expect(new Set(tools).size).toBe(tools.length);
  });

  it('names every collection in both languages', () => {
    for (const collection of TOOLKIT) {
      expect(aboutEs.toolkit.collections[collection.id]).toBeTruthy();
      expect(aboutEn.toolkit.collections[collection.id]).toBeTruthy();
    }
    expect(Object.keys(aboutEs.toolkit.collections)).toEqual(TOOLKIT.map((c) => c.id));
  });

  it('carries a drawable logo and a brand colour for every tool', () => {
    for (const tool of TOOLKIT.flatMap((c) => c.tools)) {
      expect(tool.name.length).toBeGreaterThan(0);
      expect(tool.path.length).toBeGreaterThan(10);
      expect(tool.color).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  it('shows Claude Code by its product name', () => {
    const names = TOOLKIT.flatMap((c) => c.tools.map((t) => t.name));
    expect(names).toContain('Claude Code');
    expect(names).not.toContain('Claude');
  });
});
