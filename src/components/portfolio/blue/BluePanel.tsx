/**
 * Blue panel (design-spec §4 blue/, §6.1, §7.3; BL-04…BL-09, BL-12; decisiones.md 16, 19, 21).
 *
 * A 380 px sidebar on the right that pushes the page, or a full-screen sheet from the bottom on
 * phones and short touch screens (`BLUE.sheetQuery`). `section#blue-panel role=dialog`: next to the
 * sidebar the page stays usable (`aria-modal=false`); the sheet covers it, so there it is modal and
 * the launcher makes the page inert. While closed it is `inert` and, once its slide ends,
 * `visibility: hidden`. Mounted on demand by
 * `blue-launcher.client.ts` through `mountBluePanel`, which keeps the open state and the focus
 * return; this island renders the conversation.
 *
 * - Messages: the visitor's pops in (BL-06), Blue's rises and is revealed in chunks (BL-07), both
 *   with motion springs; with reduced motion they just appear.
 * - Answers are markdown-lite rendered as React elements (no HTML from the model). Internal links
 *   navigate with the router and outline their section (BL-09); external ones open a new tab.
 * - The log is `aria-live=off`; one polite status announces "thinking", each finished answer and
 *   the errors, so a screen reader is not flooded by every fragment.
 * - Its stylesheet (`blue-panel.css`) ships with the launcher: <ClientRouter/> drops the head styles
 *   a dynamic import adds, and the panel outlives navigations.
 */
import {
  Component,
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type SubmitEvent as ReactSubmitEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { motion, useReducedMotion } from 'motion/react';
import { navigate } from 'astro:transitions/client';
import { BLUE } from '@/components/motion/presets';
import { CONTACT_EMAILS } from '@/data/profile';
import { SITE_URL } from '@/data/site';
import { HTML_LANG, type Locale } from '@/i18n/locales';
import { blue as blueEn } from '@/i18n/messages/en/blue';
import { common as commonEn } from '@/i18n/messages/en/common';
import { blue as blueEs } from '@/i18n/messages/es/blue';
import { common as commonEs } from '@/i18n/messages/es/common';
import { CHAT_LIMITS } from '@/lib/blue/protocol';
import { charCount, type BlueMessage } from '@/lib/blue/client/conversation';
import { waitUnit, type BlueError } from '@/lib/blue/client/errors';
import {
  markdownToText,
  parseMarkdownLite,
  type BlockNode,
  type InlineNode,
} from '@/lib/blue/client/markdown';
import { nextRevealEnd, pendingChunks, revealStepMs } from '@/lib/blue/client/reveal';
import { NAV_SYNC_EVENT } from '@/lib/pill-nav';
import { BLUE_PANEL_ID } from './blue-dom';
import { guideTo } from './guide';
import { useChat } from './useChat';
import { GREETING_SOUND_DELAY_MS } from '@/lib/sound/recipes';
import { playInterfaceSound } from '@/lib/sound/interface-sound';

type BlueCopy = typeof blueEs;
const COPY: Record<Locale, { blue: BlueCopy; newTab: string }> = {
  es: { blue: blueEs, newTab: commonEs.opensInNewTab },
  en: { blue: blueEn, newTab: commonEn.opensInNewTab },
};

/** The counter shows from this share of the limit on. */
const COUNTER_FROM = 0.9;
/** Distance (px) from the bottom under which the log keeps following new text. */
const PIN_SLACK_PX = 32;

/** `{name}` placeholders; the i18n `format` would bring both whole catalogues into this chunk. */
function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.hasOwn(values, key) ? String(values[key]) : match,
  );
}

function siteOrigins(): string[] {
  const origins = [location.origin];
  try {
    origins.push(new URL(SITE_URL).origin);
  } catch {
    // SITE_URL is always absolute; nothing to add otherwise.
  }
  return origins;
}

function errorText(error: BlueError, locale: Locale): string {
  const { errors } = COPY[locale].blue;
  const email = CONTACT_EMAILS[locale];
  switch (error.kind) {
    case 'rate_limited': {
      if (!error.retryAfter) return errors.rateLimitedSoon;
      const { value, unit } = waitUnit(error.retryAfter);
      const wait = new Intl.RelativeTimeFormat(HTML_LANG[locale], { numeric: 'always' }).format(
        value,
        unit,
      );
      return fill(errors.rateLimited, { wait });
    }
    case 'budget':
      return fill(errors.budget, { email });
    case 'not_configured':
      return fill(errors.notConfigured, { email });
    case 'offline':
      return errors.offline;
    case 'too_large':
      return errors.tooLarge;
    case 'upstream':
      return errors.upstream;
  }
}

// ------------------------------------------------------------------ icons and mark

function Icon({ path, className }: { path: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d={path} />
    </svg>
  );
}

const ICONS = {
  close: 'M4 4l8 8M12 4l-8 8',
  arrow: 'M3 8h10M9 4l4 4-4 4',
  stop: 'M5.5 5.5h5v5h-5z',
  compose:
    'M9.5 2.5H4A1.5 1.5 0 0 0 2.5 4v8A1.5 1.5 0 0 0 4 13.5h8a1.5 1.5 0 0 0 1.5-1.5V6.5M7 9l.5-2 5-5 1.5 1.5-5 5z',
};

/** Blue's app icon in the header: a glossy blue tile with a light face and two eyes (CSS only). */
function BlueAvatar() {
  return (
    <span className="pf-blue-panel__avatar" aria-hidden="true">
      <span className="pf-blue-panel__avatar-gloss" />
      <span className="pf-blue-panel__avatar-face" />
      <span className="pf-blue-panel__avatar-eye" />
      <span className="pf-blue-panel__avatar-eye pf-blue-panel__avatar-eye_side_right" />
    </span>
  );
}

// ------------------------------------------------------------------ markdown-lite

interface LinkHandlers {
  newTab: string;
  onInternal: (event: ReactMouseEvent<HTMLAnchorElement>, href: string) => void;
}

function Inline({ nodes, links }: { nodes: InlineNode[]; links: LinkHandlers }): ReactNode {
  return nodes.map((node, i) => {
    switch (node.type) {
      case 'text':
        return node.text;
      case 'break':
        return <br key={i} />;
      case 'code':
        return <code key={i}>{node.text}</code>;
      case 'strong':
        return (
          <strong key={i}>
            <Inline nodes={node.children} links={links} />
          </strong>
        );
      case 'em':
        return (
          <em key={i}>
            <Inline nodes={node.children} links={links} />
          </em>
        );
      case 'link': {
        const children = <Inline nodes={node.children} links={links} />;
        if (node.kind === 'internal') {
          return (
            <a key={i} href={node.href} onClick={(event) => links.onInternal(event, node.href)}>
              {children}
            </a>
          );
        }
        if (node.kind === 'mailto') {
          return (
            <a key={i} href={node.href} data-copy-email={node.href.slice('mailto:'.length)}>
              {children}
            </a>
          );
        }
        return (
          <a key={i} href={node.href} target="_blank" rel="noopener noreferrer">
            {children}
            <span className="sr-only"> {links.newTab}</span>
          </a>
        );
      }
    }
  });
}

/**
 * Last line of defence around a rendered answer: if a model's text ever trips the renderer, that one
 * answer falls back to plain text instead of React unmounting the whole panel.
 */
class PlainTextFallback extends Component<
  { text: string; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? <p>{this.props.text}</p> : this.props.children;
  }
}

function Markdown({ blocks, links }: { blocks: BlockNode[]; links: LinkHandlers }) {
  return blocks.map((block, i) => {
    if (block.type === 'paragraph') {
      return (
        <p key={i}>
          <Inline nodes={block.children} links={links} />
        </p>
      );
    }
    const items = block.items.map((item, j) => (
      <li key={j}>
        <Inline nodes={item} links={links} />
      </li>
    ));
    return block.ordered ? (
      <ol key={i} start={block.start}>
        {items}
      </ol>
    ) : (
      <ul key={i}>{items}</ul>
    );
  });
}

// ------------------------------------------------------------------ messages

/**
 * BL-07: how much of a growing answer is on screen. The timer depends only on what is shown and
 * whether a chunk is ready, never on the text itself: fragments arrive faster than a reveal step,
 * and rescheduling on each one would hold the whole answer back until the stream ends.
 */
function useReveal(target: string, final: boolean, animate: boolean): string {
  const [shown, setShown] = useState(animate ? 0 : target.length);
  const ready = animate && pendingChunks(target, shown, final) > 0;
  const stepMs = useEffectEvent(() => revealStepMs(pendingChunks(target, shown, final), final));
  const step = useEffectEvent(() => setShown(nextRevealEnd(target, shown, final)));
  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(step, stepMs());
    return () => window.clearTimeout(timer);
  }, [ready, shown]);
  return animate ? target.slice(0, shown) : target;
}

interface MessageProps {
  message: BlueMessage;
  /** The answer is complete (not the one streaming). */
  final: boolean;
  /** Plays the entrance and the chunked reveal (new in this session, motion allowed). */
  animate: boolean;
  copy: BlueCopy;
  links: LinkHandlers;
  origins: string[];
}

function Message({ message, final, animate, copy, links, origins }: MessageProps) {
  const isUser = message.role === 'user';
  const text = useReveal(message.content, final, animate && !isUser);
  const entrance = isUser ? BLUE.userMessage : BLUE.assistantMessage;
  return (
    <motion.li
      className={`pf-blue-panel__message pf-blue-panel__message_role_${message.role}`}
      initial={animate ? entrance.initial : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={entrance.spring}
      style={{ transformOrigin: entrance.origin }}
    >
      <span className="sr-only">{isUser ? copy.speakerYou : copy.speakerBlue} </span>
      {isUser ? (
        <p className="pf-blue-panel__bubble">{text}</p>
      ) : (
        <div className="pf-blue-panel__answer pf-serif">
          <PlainTextFallback text={text}>
            <Markdown blocks={parseMarkdownLite(text, { siteOrigins: origins })} links={links} />
          </PlainTextFallback>
        </div>
      )}
      {message.state === 'stopped' && <p className="pf-blue-panel__note">{copy.stopped}</p>}
    </motion.li>
  );
}

// ------------------------------------------------------------------ panel

interface PanelSnapshot {
  open: boolean;
  locale: Locale;
  /** Open as the full-screen sheet, which covers the page (`BLUE.sheetQuery`). */
  modal: boolean;
}

interface PanelStore {
  get(): PanelSnapshot;
  set(patch: Partial<PanelSnapshot>): void;
  subscribe(listener: () => void): () => void;
  /** The mounted panel registers how to focus its question box; returns the unregister. */
  setFocuser(focus: () => void): () => void;
  focusInput(): void;
}

function createPanelStore(initial: PanelSnapshot): PanelStore {
  let snapshot = initial;
  let focuser: (() => void) | null = null;
  const listeners = new Set<() => void>();
  return {
    get: () => snapshot,
    set(patch) {
      snapshot = { ...snapshot, ...patch };
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setFocuser(focus) {
      focuser = focus;
      return () => {
        if (focuser === focus) focuser = null;
      };
    },
    focusInput: () => focuser?.(),
  };
}

interface BluePanelProps {
  store: PanelStore;
  onClose: () => void;
}

function BluePanel({ store, onClose }: BluePanelProps) {
  const { open, locale, modal } = useSyncExternalStore(store.subscribe, store.get, store.get);
  const { blue: copy, newTab } = COPY[locale];
  const reduced = useReducedMotion() ?? false;
  const chat = useChat(locale);
  const { messages, status, error, replyId } = chat.state;
  const [draft, setDraft] = useState('');
  const [restored] = useState(() => new Set(messages.map((m) => m.id)));
  const [origins] = useState(siteOrigins);

  const titleId = useId();
  const inputId = useId();
  const counterId = useId();
  const suggestionsId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);

  const focusInput = () => inputRef.current?.focus({ preventScroll: true });

  useEffect(
    () => store.setFocuser(() => inputRef.current?.focus({ preventScroll: true })),
    [store],
  );

  // Open: focus the question box. Close: stop the answer in progress (useChat keeps what arrived).
  const onOpenChange = useEffectEvent((isOpen: boolean) => {
    if (isOpen) {
      // A new conversation: Blue greets with a chirp once the open pops are over.
      if (messages.length === 0) {
        window.setTimeout(() => playInterfaceSound('droid'), GREETING_SOUND_DELAY_MS);
      }
      pinned.current = true;
      const log = logRef.current;
      if (log) log.scrollTop = log.scrollHeight;
      inputRef.current?.focus({ preventScroll: true });
    } else {
      chat.stop();
    }
  });
  useEffect(() => onOpenChange(open), [open]);

  // Follow the conversation while the reader is at the bottom; leave it alone if they scrolled up.
  useEffect(() => {
    const log = logRef.current;
    const content = contentRef.current;
    if (!log || !content) return;
    const onScroll = () => {
      pinned.current = log.scrollHeight - log.scrollTop - log.clientHeight < PIN_SLACK_PX;
    };
    const observer = new ResizeObserver(() => {
      if (pinned.current) log.scrollTop = log.scrollHeight;
    });
    log.addEventListener('scroll', onScroll, { passive: true });
    observer.observe(content);
    return () => {
      log.removeEventListener('scroll', onScroll);
      observer.disconnect();
    };
  }, []);

  const busy = chat.busy;
  const count = charCount(draft);
  const max = CHAT_LIMITS.maxMessageChars;
  const tooLong = count > max;
  const canSend = draft.trim().length > 0 && !tooLong;
  const showCounter = count >= max * COUNTER_FROM;

  function ask(text: string) {
    pinned.current = true;
    chat.send(text);
  }

  function submit(event?: ReactSubmitEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (busy || !canSend) return;
    ask(draft);
    setDraft('');
  }

  function onInputKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    submit();
  }

  function onSendClick(event: ReactMouseEvent<HTMLButtonElement>) {
    if (busy) {
      event.preventDefault();
      chat.stop();
      focusInput();
    } else if (!canSend) {
      event.preventDefault();
    }
  }

  function followInternal(event: ReactMouseEvent<HTMLAnchorElement>, href: string) {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const url = new URL(href, location.href);
    // The sheet covers the page: get out of the way.
    if (modal) onClose();
    if (url.pathname === location.pathname && url.search === location.search) {
      if (url.href !== location.href) history.pushState(history.state, '', url.href);
      window.dispatchEvent(new Event(NAV_SYNC_EVENT));
      guideTo(url.hash);
      return;
    }
    if (url.hash) {
      document.addEventListener('astro:page-load', () => guideTo(url.hash), { once: true });
    }
    void navigate(`${url.pathname}${url.search}${url.hash}`);
  }

  const links: LinkHandlers = { newTab, onInternal: followInternal };

  const last = messages.at(-1);
  const announcement =
    status === 'waiting' || status === 'streaming'
      ? copy.thinking
      : status === 'error' && error
        ? errorText(error, locale)
        : last?.role === 'assistant' && !restored.has(last.id)
          ? last.state === 'stopped'
            ? copy.stopped
            : markdownToText(parseMarkdownLite(last.content))
          : '';

  const showSuggestions = messages.length === 0 && !busy;
  const errorBlocks = error
    ? parseMarkdownLite(errorText(error, locale), { siteOrigins: origins })
    : [];

  return (
    <section
      id={BLUE_PANEL_ID}
      className="pf-blue-panel"
      role="dialog"
      aria-modal={open && modal}
      aria-labelledby={titleId}
      data-open={open ? '' : undefined}
      inert={!open}
    >
      {/* A div, not <header>: inside the dialog it would read as a second banner. */}
      <div className="pf-blue-panel__header">
        <BlueAvatar />
        <div className="pf-blue-panel__heading">
          <h2 id={titleId} className="pf-blue-panel__title">
            {copy.title}
          </h2>
          <p className="pf-blue-panel__subtitle">{copy.subtitle}</p>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            className="pf-blue-panel__icon-button"
            onClick={() => {
              chat.reset();
              setDraft('');
              focusInput();
            }}
          >
            <Icon className="pf-blue-panel__icon" path={ICONS.compose} />
            <span className="sr-only">{copy.newChat}</span>
          </button>
        )}
        <button type="button" className="pf-blue-panel__icon-button" onClick={onClose}>
          <Icon className="pf-blue-panel__icon" path={ICONS.close} />
          <span className="sr-only">{copy.close}</span>
        </button>
      </div>

      <div
        ref={logRef}
        className="pf-blue-panel__log"
        role="log"
        aria-live="off"
        aria-label={copy.logLabel}
        tabIndex={0}
      >
        <div ref={contentRef} className="pf-blue-panel__content">
          <ol className="pf-blue-panel__messages">
            <li className="pf-blue-panel__message pf-blue-panel__message_role_assistant">
              <span className="sr-only">{copy.speakerBlue} </span>
              <div className="pf-blue-panel__answer pf-serif">
                <p>{copy.greeting}</p>
              </div>
            </li>
            {messages.map((message) => (
              <Message
                key={message.id}
                message={message}
                final={message.id !== replyId}
                animate={!reduced && !restored.has(message.id)}
                copy={copy}
                links={links}
                origins={origins}
              />
            ))}
          </ol>
          {status === 'waiting' && (
            <p className="pf-blue-panel__thinking" aria-hidden="true">
              {copy.thinking}
            </p>
          )}
          {status === 'error' && error && (
            <div className="pf-blue-panel__error">
              <Markdown blocks={errorBlocks} links={links} />
              {error.kind === 'too_large' ? (
                <button
                  type="button"
                  className="pf-blue-panel__pill"
                  onClick={() => {
                    chat.reset();
                    focusInput();
                  }}
                >
                  {copy.newChat}
                </button>
              ) : error.kind !== 'budget' && error.kind !== 'not_configured' ? (
                <button
                  type="button"
                  className="pf-blue-panel__pill"
                  onClick={() => {
                    pinned.current = true;
                    chat.retry();
                    focusInput();
                  }}
                >
                  {copy.retry}
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {showSuggestions && (
        <div className="pf-blue-panel__suggestions">
          <p id={suggestionsId} className="pf-blue-panel__caption">
            {copy.suggestionsLabel}
          </p>
          <ul className="pf-blue-panel__suggestion-list" aria-labelledby={suggestionsId}>
            {copy.suggestions.map((suggestion) => (
              <li key={suggestion}>
                <button
                  type="button"
                  className="pf-blue-panel__suggestion"
                  onClick={() => {
                    ask(suggestion);
                    focusInput();
                  }}
                >
                  {suggestion}
                  <Icon className="pf-blue-panel__suggestion-arrow" path={ICONS.arrow} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form className="pf-blue-panel__composer" onSubmit={submit}>
        <div className="pf-blue-panel__field">
          <label className="pf-blue-panel__label" htmlFor={inputId}>
            {copy.inputLabel}
          </label>
          <textarea
            ref={inputRef}
            id={inputId}
            className="pf-blue-panel__input"
            rows={1}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onInputKeyDown}
            aria-describedby={showCounter ? counterId : undefined}
            aria-invalid={tooLong || undefined}
            enterKeyHint="send"
          />
          <button
            type="submit"
            className="pf-blue-panel__send"
            data-busy={busy ? '' : undefined}
            aria-disabled={!busy && !canSend}
            onClick={onSendClick}
          >
            <Icon className="pf-blue-panel__send-icon" path={busy ? ICONS.stop : ICONS.arrow} />
            <span className="sr-only">{busy ? copy.stop : copy.send}</span>
          </button>
        </div>
        {showCounter && (
          <p id={counterId} className="pf-blue-panel__counter" data-over={tooLong ? '' : undefined}>
            {tooLong ? fill(copy.tooLong, { max }) : fill(copy.counter, { count, max })}
          </p>
        )}
      </form>

      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </section>
  );
}

// ------------------------------------------------------------------ mount (called by the launcher)

export interface BluePanelHandle {
  /** The element the panel is rendered into (persisted across navigations). */
  host: HTMLElement;
  setOpen(open: boolean): void;
  /** The sheet covers the page (the launcher makes the rest of the page inert). */
  setModal(modal: boolean): void;
  setLocale(locale: Locale): void;
  focusInput(): void;
  unmount(): void;
}

export function mountBluePanel(
  host: HTMLElement,
  options: { locale: Locale; onClose: () => void },
): BluePanelHandle {
  const store = createPanelStore({ open: false, locale: options.locale, modal: false });
  const root = createRoot(host);
  // Committed closed right away, so the first open has a closed state to slide from.
  flushSync(() => root.render(<BluePanel store={store} onClose={options.onClose} />));
  // Resolve that closed style now: the first open then transitions from it (BL-04).
  if (host.firstElementChild) void getComputedStyle(host.firstElementChild).opacity;
  return {
    host,
    setOpen: (open) => store.set({ open }),
    setModal: (modal) => {
      if (store.get().modal !== modal) store.set({ modal });
    },
    setLocale: (locale) => {
      if (store.get().locale !== locale) store.set({ locale });
    },
    focusInput: () => store.focusInput(),
    unmount: () => root.unmount(),
  };
}
