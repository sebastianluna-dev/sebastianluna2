/**
 * Skeuomorphic Aqua button (design-spec §4 ui/AquaButton; EF-01…EF-04, TE-08).
 *
 * The skin is CSS (`aqua-button.css`) and the SSR already paints the final button, so it shows
 * without JS; the island only adds motion. Two `useSpring` values drive the size variants (EF-01
 * hover, EF-02 pressed) through `--aqua-hover` / `--aqua-press`, and two more the magnetic pull
 * (EF-03) through `translate` on the body and its children. Colours come from the role tokens
 * `--pf-aqua-{neutral,accent}-*`, which switch palette with the theme without remounting (TE-08).
 *
 * Text kind: the link's name is the invisible sizer; the visible copy in the skin is `aria-hidden`
 * so screen readers do not read it twice (accesibilidad D-25). Icon kind: the name is visually
 * hidden text next to the decorative icon.
 */
import { useEffect, useRef, type MouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { useSpring, type MotionValue } from 'motion/react';
import { AQUA_MAGNETIC, AQUA_SPRINGS } from '@/components/motion/presets';
import { prefersReducedMotion, watchReducedMotion } from '@/lib/motion-policy';
import './aqua-button.css';

export type AquaVariant = 'neutral' | 'accent';

export interface AquaIcon {
  /** SVG path data, painted with `currentColor`. */
  path: string;
  viewBox?: string;
}

export interface AquaButtonProps {
  href: string;
  /** Visible text (text kind) or the button's name (icon kind). */
  label: string;
  variant?: AquaVariant;
  /** Opens in a new tab; pass the full accessible name in `accessibleName`. */
  external?: boolean;
  /** Accessible name when it differs from the visible text (icon variant, new tab). */
  accessibleName?: string;
  /** Icon kind (footer socials): 44 × 44 with this icon instead of the text. */
  icon?: AquaIcon;
  /**
   * Address that the site-wide email handler copies on click, showing the toast
   * (decisiones.md 22). Without JS, or without the handler, the `mailto:` href opens as usual.
   */
  copyEmail?: string;
}

const VARIANT_SPRING = AQUA_SPRINGS.variants;
const MAGNETIC_SPRING = AQUA_SPRINGS.magnetic;
const MAGNETIC = AQUA_MAGNETIC;
const MAGNETIC_QUERY = AQUA_MAGNETIC.query;

type Spring = MotionValue<number>;

function drive(value: Spring, target: number, reduced: boolean) {
  if (reduced) value.jump(target);
  else value.set(target);
}

function isSamePageHash(anchor: HTMLAnchorElement): boolean {
  const url = new URL(anchor.href, location.href);
  return (
    url.hash.length > 1 &&
    url.origin === location.origin &&
    url.pathname === location.pathname &&
    url.search === location.search
  );
}

export function AquaButton({
  href,
  label,
  variant = 'neutral',
  external = false,
  accessibleName,
  icon,
  copyEmail,
}: AquaButtonProps) {
  const anchorRef = useRef<HTMLAnchorElement>(null);
  const bodyRef = useRef<HTMLSpanElement>(null);
  const hovered = useRef(false);
  const pressed = useRef(false);

  const hover = useSpring(0, VARIANT_SPRING);
  const press = useSpring(0, VARIANT_SPRING);
  const pullX = useSpring(0, MAGNETIC_SPRING);
  const pullY = useSpring(0, MAGNETIC_SPRING);

  const applyVariant = () => {
    const anchor = anchorRef.current;
    const reduced = prefersReducedMotion();
    const isPressed = pressed.current;
    const isHovered = hovered.current || isPressed;
    // Pressed keeps the hover geometry underneath, as the reference's `hover pressed` classes.
    drive(hover, isHovered ? 1 : 0, reduced);
    drive(press, isPressed ? 1 : 0, reduced);
    if (anchor) anchor.dataset.aquaState = isPressed ? 'pressed' : isHovered ? 'hover' : 'rest';
  };

  // Size variants: write the spring values on the link for the CSS to use.
  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const write = (name: string) => (v: number) => anchor.style.setProperty(name, v.toFixed(4));
    const offHover = hover.on('change', write('--aqua-hover'));
    const offPress = press.on('change', write('--aqua-press'));
    return () => {
      offHover();
      offPress();
    };
  }, [hover, press]);

  // EF-03: magnetic pull towards the pointer, only while it can be seen and used.
  useEffect(() => {
    const anchor = anchorRef.current;
    const body = bodyRef.current;
    if (!anchor || !body) return;
    const children = Array.from(body.children) as HTMLElement[];
    const childShare = MAGNETIC.childDistance / MAGNETIC.distance;
    const media = matchMedia(MAGNETIC_QUERY);
    let inView = false;
    let active = false;

    const write = () => {
      const x = pullX.get();
      const y = pullY.get();
      body.style.translate = x || y ? `${x}px ${y}px` : '';
      const value = x || y ? `${x * childShare}px ${y * childShare}px` : '';
      for (const child of children) child.style.translate = value;
    };
    const offX = pullX.on('change', write);
    const offY = pullY.on('change', write);

    const release = () => {
      drive(pullX, 0, prefersReducedMotion());
      drive(pullY, 0, prefersReducedMotion());
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      // The body's box without its own pull (the reference reads the untransformed rect).
      const rect = body.getBoundingClientRect();
      const left = rect.left - pullX.get();
      const top = rect.top - pullY.get();
      const area = MAGNETIC.hoverArea;
      const inside =
        event.clientX >= left - area &&
        event.clientX <= left + rect.width + area &&
        event.clientY >= top - area &&
        event.clientY <= top + rect.height + area;
      if (!inside) {
        release();
        return;
      }
      const halfW = rect.width / 2;
      const halfH = rect.height / 2;
      pullX.set(((event.clientX - (left + halfW)) / halfW) * MAGNETIC.distance);
      pullY.set(((event.clientY - (top + halfH)) / halfH) * MAGNETIC.distance);
    };

    const listen = (on: boolean) => {
      const root = document.documentElement;
      if (on) {
        window.addEventListener('pointermove', onMove, { passive: true });
        window.addEventListener('scroll', release, { capture: true, passive: true });
        window.addEventListener('resize', release);
        window.addEventListener('blur', release);
        root.addEventListener('pointerleave', release);
      } else {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('scroll', release, { capture: true });
        window.removeEventListener('resize', release);
        window.removeEventListener('blur', release);
        root.removeEventListener('pointerleave', release);
      }
    };

    const update = () => {
      const next =
        inView &&
        media.matches &&
        !prefersReducedMotion() &&
        document.visibilityState === 'visible';
      if (next === active) return;
      active = next;
      listen(active);
      if (!active) release();
    };

    const observer = new IntersectionObserver(([entry]) => {
      inView = entry?.isIntersecting ?? false;
      update();
    });
    observer.observe(anchor);
    media.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);
    const stopWatching = watchReducedMotion(() => {
      update();
      applyVariant();
    });

    return () => {
      observer.disconnect();
      media.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', update);
      stopWatching();
      if (active) listen(false);
      offX();
      offY();
    };
    // applyVariant only reads refs and stable springs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pullX, pullY]);

  // EF-01/EF-02: hover and press start on the body, as in the reference, where they live on the
  // moving pill (with the pull, the hover holds while the pointer is over the translated body).
  // They end when the pointer leaves the whole link, which also cancels a press (measured: leaving
  // while the button is down returns to rest). Ending on the link instead of the body avoids the
  // reference's flicker when the pointer sits in the strip the hover shrink uncovers.
  const onPointerEnter = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === 'touch') return; // hover is a fine-pointer gesture
    hovered.current = true;
    applyVariant();
  };

  const onPointerLeave = () => {
    hovered.current = false;
    pressed.current = false;
    applyVariant();
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (event.button !== 0) return;
    pressed.current = true;
    applyVariant();
    const end = () => {
      pressed.current = false;
      applyVariant();
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  };

  // HO-05: a link to a section of this page scrolls smoothly (`auto` with reduced motion). The
  // router still performs the navigation, so history and the focus start point stay native; only
  // this one fragment jump runs with `scroll-behavior: smooth` (html keeps `auto`, spec §9.2).
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const anchor = event.currentTarget;
    if (event.defaultPrevented || event.button !== 0 || external) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (!isSamePageHash(anchor) || prefersReducedMotion()) return;
    const root = document.documentElement;
    root.style.scrollBehavior = 'smooth';
    requestAnimationFrame(() => root.style.removeProperty('scroll-behavior'));
  };

  const kind = icon ? 'icon' : 'text';
  const name = accessibleName ?? label;

  return (
    <a
      ref={anchorRef}
      className={`aqua-button aqua-button_kind_${kind} aqua-button_variant_${variant}`}
      href={href}
      aria-label={!icon && accessibleName ? accessibleName : undefined}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      draggable={false}
      data-copy-email={copyEmail}
      onPointerLeave={onPointerLeave}
      onClick={onClick}
    >
      {icon ? (
        <span className="sr-only">{name}</span>
      ) : (
        <span className="aqua-button__sizer">{label}</span>
      )}
      <span className="aqua-button__skin" aria-hidden="true">
        <span className="aqua-button__shadow" />
        <span
          ref={bodyRef}
          className="aqua-button__body"
          onPointerEnter={onPointerEnter}
          onPointerDown={onPointerDown}
        >
          <span className="aqua-button__reflection" />
          {icon ? (
            <svg
              className="aqua-button__icon"
              viewBox={icon.viewBox ?? '0 0 24 24'}
              fill="currentColor"
              focusable="false"
            >
              <path d={icon.path} />
            </svg>
          ) : (
            <span className="aqua-button__label">{label}</span>
          )}
        </span>
      </span>
    </a>
  );
}
