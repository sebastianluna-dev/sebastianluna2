/**
 * Plays the "typing… → bubble" sequence of the chat asides (CA-09…CA-12) over their SSR markup.
 *
 * - The calendar comes from `chatSchedule` (lib/chat-sequence.ts) and runs on a pausable clock: once the
 *   aside enters `CHAT_ASIDE.rootMargin` (0 0 −22 % 0) it plays once; while it is out of the viewport
 *   the clock and every running animation pause, and they resume where they were.
 * - An aside that is already above the viewport when the page binds (back navigation, deep link) is
 *   left as it is, complete. So are all of them with reduced motion, or in the no-JS rescue.
 * - Only this script hides the conversation (`chat-aside_state_waiting`); a change to reduced motion
 *   or a navigation finishes it at once in its final state.
 * - Rebinds on `astro:page-load` and tears everything down on `astro:before-swap`.
 */
import { CHAT_ASIDE } from '@/components/motion/presets';
import { prefersReducedMotion, watchReducedMotion } from '@/lib/motion-policy';
import { scriptsActive } from '@/lib/scripts-ready';
import {
  bubbleAnimation,
  chatSchedule,
  dueEvents,
  hashSeed,
  pausableClock,
  rainEmoji,
  rainParticles,
  tapbackAnimation,
  type ChatAnimation,
  type ChatEvent,
} from '@/lib/chat-sequence';
import type { ChatMessage } from './types';

const ROOT_SELECTOR = '[data-chat-aside]';
const WAITING = 'chat-aside_state_waiting';
const AVATAR_ON = 'chat-aside__avatar_state_on';
const TYPING_ON = 'chat-aside__typing_state_on';
const FX_CLASS = 'chat-aside__fx';
const PARTICLE_CLASS = 'chat-aside__particle';

const bound = new Map<HTMLElement, () => void>();
let started = false;

interface RowParts {
  avatar: HTMLElement | null;
  who: HTMLElement | null;
  wrap: HTMLElement;
  bubble: HTMLElement;
  typing: HTMLElement;
  tapback: HTMLElement | null;
}

function springEasing(): string {
  const { easing, fallbackEasing } = CHAT_ASIDE.spring;
  try {
    return CSS.supports('animation-timing-function', easing) ? easing : fallbackEasing;
  } catch {
    return fallbackEasing;
  }
}

function readMessages(root: HTMLElement): ChatMessage[] {
  try {
    const value: unknown = JSON.parse(root.dataset.chatMessages ?? '[]');
    return Array.isArray(value) ? (value as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

function readRows(root: HTMLElement): RowParts[] | null {
  const rows: RowParts[] = [];
  for (const row of root.querySelectorAll<HTMLElement>('[data-chat-row]')) {
    const wrap = row.querySelector<HTMLElement>('[data-chat-bubble]');
    const bubble = row.querySelector<HTMLElement>('[data-chat-text]');
    const typing = row.querySelector<HTMLElement>('[data-chat-typing]');
    if (!wrap || !bubble || !typing) return null;
    rows.push({
      avatar: row.querySelector<HTMLElement>('[data-chat-avatar]'),
      who: row.querySelector<HTMLElement>('[data-chat-who]'),
      wrap,
      bubble,
      typing,
      tapback: row.querySelector<HTMLElement>('[data-chat-tapback]'),
    });
  }
  return rows;
}

function bind(root: HTMLElement): () => void {
  const messages = readMessages(root);
  const rows = readRows(root);
  if (!messages.length || !rows || rows.length !== messages.length) return () => {};
  // Already read, or no motion wanted: the SSR conversation stays as it is.
  if (prefersReducedMotion() || root.getBoundingClientRect().bottom < 0) return () => {};

  const meta = root.querySelector<HTMLElement>('[data-chat-meta]');
  const status = root.querySelector<HTMLElement>('[data-chat-status]');
  const { events } = chatSchedule(messages, { meta: Boolean(meta) });
  const spring = springEasing();
  const animations = new Set<Animation>();
  const touched = new Set<HTMLElement>();
  let fxLayer: HTMLElement | null = null;
  let next = 0;
  let timer = 0;
  const clock = pausableClock(() => performance.now());
  let triggered = false;
  let visible = false;
  let finished = false;

  root.classList.add(WAITING);

  const track = (animation: Animation) => {
    animations.add(animation);
    const drop = () => animations.delete(animation);
    animation.finished.then(drop, drop);
    if (!clock.running) animation.pause();
    return animation;
  };

  const animate = (
    el: Element,
    { keyframes, durationMs, easing }: ChatAnimation,
    options: KeyframeAnimationOptions = {},
  ) => track(el.animate(keyframes as Keyframe[], { duration: durationMs, easing, ...options }));

  const show = (el: HTMLElement, opacity: '0' | '1') => {
    el.style.opacity = opacity;
    touched.add(el);
  };

  const fadeIn = (
    el: HTMLElement | null,
    { durationMs, easing }: { durationMs: number; easing: string },
  ) => {
    if (!el) return;
    show(el, '1');
    animate(
      el,
      { keyframes: [{ opacity: 0 }, { opacity: 1 }], durationMs, easing },
      { fill: 'backwards' },
    );
  };

  // CA-09: the avatar pops in, or slides down from the previous bubble of the same run.
  const avatarIn = (index: number) => {
    const { avatar } = rows[index]!;
    if (!avatar) return;
    const previous = index > 0 && messages[index - 1]!.from === messages[index]!.from;
    const before = previous ? rows[index - 1]!.avatar : null;
    if (before) {
      const dy = before.getBoundingClientRect().top - avatar.getBoundingClientRect().top;
      before.classList.remove(AVATAR_ON);
      avatar.classList.add(AVATAR_ON);
      if (dy) {
        animate(avatar, {
          keyframes: [{ transform: `translateY(${dy}px)` }, { transform: 'none' }],
          durationMs: CHAT_ASIDE.avatar.slideMs,
          easing: spring,
        });
      }
      return;
    }
    avatar.classList.add(AVATAR_ON);
    animate(avatar, {
      keyframes: [
        { opacity: 0, transform: `scale(${CHAT_ASIDE.avatar.fromScale})` },
        { opacity: 1, transform: 'none' },
      ],
      durationMs: CHAT_ASIDE.avatar.popMs,
      easing: spring,
    });
  };

  const typingIn = (index: number) => {
    const { who, wrap, bubble, typing } = rows[index]!;
    avatarIn(index);
    fadeIn(who, CHAT_ASIDE.who); // CA-09
    show(wrap, '1');
    show(bubble, '0');
    typing.classList.add(TYPING_ON);
    const { from, inMs } = CHAT_ASIDE.typing;
    animate(typing, {
      keyframes: [
        { opacity: 0, transform: `translateY(${from.y}px) scale(${from.scale})` },
        { opacity: 1, transform: 'none' },
      ],
      durationMs: inMs,
      easing: spring,
    });
  };

  const reveal = (index: number) => {
    const { wrap, bubble, typing } = rows[index]!;
    const { outMs, outEasing, outScale } = CHAT_ASIDE.typing;
    animate(
      typing,
      {
        keyframes: [{ opacity: 1 }, { opacity: 0, transform: `scale(${outScale})` }],
        durationMs: outMs,
        easing: outEasing,
      },
      { fill: 'forwards' },
    );
    show(bubble, '1');
    animate(wrap, bubbleAnimation(messages[index]!.fx, spring));
    animate(bubble, {
      keyframes: [{ opacity: 0 }, { opacity: 1 }],
      durationMs: CHAT_ASIDE.text.durationMs,
      easing: CHAT_ASIDE.text.easing,
    });
  };

  // CA-12: a seeded burst from the bubble plus a fall over the whole aside.
  const rain = (index: number) => {
    const glyphs = rainEmoji(messages[index]!);
    const { wrap } = rows[index]!;
    const box = root.getBoundingClientRect();
    const bubbleBox = wrap.getBoundingClientRect();
    const particles = rainParticles(
      glyphs,
      {
        width: root.clientWidth,
        height: root.clientHeight,
        originX: (bubbleBox.left + bubbleBox.right) / 2 - box.left,
        originY: bubbleBox.top - box.top,
      },
      hashSeed(`${index}|${messages[index]!.text}`),
    );
    if (!particles.length) return;
    if (!fxLayer) {
      fxLayer = document.createElement('div');
      fxLayer.className = FX_CLASS;
      fxLayer.setAttribute('aria-hidden', 'true');
      root.append(fxLayer);
    }
    const layer = fxLayer;
    let left = particles.length;
    for (const particle of particles) {
      const glyph = document.createElement('span');
      glyph.className = PARTICLE_CLASS;
      glyph.textContent = particle.glyph;
      layer.append(glyph);
      const animation = animate(glyph, particle, { delay: particle.delayMs, fill: 'both' });
      const remove = () => {
        glyph.remove();
        left -= 1;
        if (left === 0 && layer === fxLayer) {
          layer.remove();
          fxLayer = null;
        }
      };
      animation.finished.then(remove, remove);
    }
  };

  const tapback = (target: number) => {
    const el = rows[target]?.tapback;
    if (!el) return;
    show(el, '1');
    animate(el, tapbackAnimation());
  };

  const end = () => {
    fadeIn(status, CHAT_ASIDE.status);
    root.classList.remove(WAITING);
    for (const { avatar, tapback: tap } of rows) {
      avatar?.classList.remove(AVATAR_ON);
      if (tap) tap.style.opacity = '';
    }
    finished = true;
  };

  const fire = (event: ChatEvent) => {
    switch (event.type) {
      case 'meta':
        fadeIn(meta, CHAT_ASIDE.meta);
        break;
      case 'typing':
        typingIn(event.index);
        break;
      case 'reveal':
        reveal(event.index);
        break;
      case 'typingHide':
        rows[event.index]!.typing.classList.remove(TYPING_ON);
        break;
      case 'rain':
        rain(event.index);
        break;
      case 'tapback':
        if (event.target !== undefined) tapback(event.target);
        break;
      case 'end':
        end();
        break;
    }
  };

  const run = () => {
    timer = 0;
    const due = dueEvents(events, next, clock.elapsed());
    next = due.next;
    for (const event of due.fired) fire(event);
    if (due.waitMs !== null) timer = window.setTimeout(run, due.waitMs);
  };

  const play = () => {
    if (clock.running || !triggered) return;
    clock.resume();
    for (const animation of animations) if (animation.playState === 'paused') animation.play();
    run();
  };

  const pause = () => {
    if (!clock.running) return;
    clock.pause();
    window.clearTimeout(timer);
    timer = 0;
    for (const animation of animations) if (animation.playState === 'running') animation.pause();
  };

  // Final state at once: cancels what runs and drops every inline style the sequence set.
  const complete = () => {
    pause();
    for (const animation of animations) animation.cancel();
    animations.clear();
    fxLayer?.remove();
    fxLayer = null;
    for (const el of touched) el.style.opacity = '';
    for (const { avatar, typing } of rows) {
      avatar?.classList.remove(AVATAR_ON);
      typing.classList.remove(TYPING_ON);
    }
    root.classList.remove(WAITING);
    next = events.length;
    finished = true;
  };

  const visibility = new IntersectionObserver(([entry]) => {
    visible = Boolean(entry?.isIntersecting);
    if (visible) play();
    else pause();
    if (finished && !animations.size) visibility.disconnect();
  });
  const trigger = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting) return;
      trigger.disconnect();
      triggered = true;
      // Inside the −22 % margin is also inside the viewport.
      visible = true;
      play();
    },
    { rootMargin: CHAT_ASIDE.rootMargin, threshold: 0 },
  );
  visibility.observe(root);
  trigger.observe(root);

  const stopWatching = watchReducedMotion((reduced) => {
    if (reduced) complete();
  });

  return () => {
    trigger.disconnect();
    visibility.disconnect();
    stopWatching();
    complete();
  };
}

function bindAll() {
  if (!scriptsActive()) return;
  for (const root of document.querySelectorAll<HTMLElement>(ROOT_SELECTOR)) {
    if (!bound.has(root)) bound.set(root, bind(root));
  }
}

function releaseAll() {
  for (const teardown of bound.values()) teardown();
  bound.clear();
}

/** Starts once per document; `<ClientRouter/>` navigations rebind and release. */
export function startChatAsides(): void {
  if (started || typeof document === 'undefined') return;
  started = true;
  if (
    typeof IntersectionObserver === 'undefined' ||
    typeof Element.prototype.animate !== 'function'
  ) {
    return;
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindAll, { once: true });
  } else {
    bindAll();
  }
  document.addEventListener('astro:page-load', bindAll);
  document.addEventListener('astro:before-swap', releaseAll);
}
