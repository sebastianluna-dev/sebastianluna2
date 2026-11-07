import { describe, expect, it } from 'vitest';
import { themeInlineScript } from '@/components/portfolio/theme/theme.inline';
import { markScriptsReady, scriptsActive, SCRIPTS_READY_CLASS } from './scripts-ready';

function fakeRoot(...initial: string[]) {
  const classes = new Set(initial);
  return {
    classes,
    root: {
      classList: {
        add: (name: string) => classes.add(name),
        contains: (name: string) => classes.has(name),
      },
    } as unknown as Element,
  };
}

describe('scripts-ready', () => {
  it('marks the root with the class the inline bootstrap waits for', () => {
    const { root, classes } = fakeRoot('js');
    markScriptsReady(root);
    expect(classes.has(SCRIPTS_READY_CLASS)).toBe(true);
    expect(themeInlineScript).toContain(SCRIPTS_READY_CLASS);
  });

  it('reports the JS render only while html has `js`', () => {
    expect(scriptsActive(fakeRoot('js').root)).toBe(true);
    expect(scriptsActive(fakeRoot('no-js').root)).toBe(false);
  });
});
