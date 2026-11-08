import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import { getMessages } from '@/i18n/t';
import BlueLauncher from './BlueLauncher.astro';

async function render(locale: 'es' | 'en') {
  const container = await AstroContainer.create();
  return container.renderToString(BlueLauncher, { props: { locale } });
}

describe('BlueLauncher', () => {
  it('renders a collapsed button with a fixed, localised name and no panel yet', async () => {
    for (const locale of ['es', 'en'] as const) {
      const html = await render(locale);
      expect(html).toMatch(
        /<button type="button"[^>]*data-blue-launcher[^>]*aria-expanded="false"/,
      );
      // aria-controls only once the panel exists (the launcher adds it after mounting it).
      expect(html).not.toContain('aria-controls');
      const label = /data-blue-launcher-label>([^<]*)<\/span>/.exec(html)?.[1]?.trim();
      expect(label).toBe(getMessages(locale).blue.launcher);
      expect(html).toMatch(/<div class="pf-blue__host" data-blue-host><\/div>/);
    }
  });

  it('persists across navigations and appears with the launcher preset (BL-01)', async () => {
    const html = await render('es');
    expect(html).toContain('data-astro-transition-persist="pf-blue"');
    expect(html).toContain('data-appear="popInS093SpringB020028"');
  });

  it('keeps the mark out of the accessibility tree', async () => {
    expect(await render('es')).toMatch(
      /<svg class="pf-blue-launcher__mark"[^>]*aria-hidden="true"/,
    );
  });
});
