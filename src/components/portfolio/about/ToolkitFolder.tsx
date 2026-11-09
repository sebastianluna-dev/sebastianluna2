/**
 * /about "My toolkit" folder (about-spec §5.2, fase7-plan §1.3): a blue folder drawn in CSS inside a
 * 440 × 480 design box scaled to its slot (`designScale`). One spring progress drives everything
 * (`TOOLKIT_FOLDER.progress`, geometry in `@/lib/toolkit-folder`):
 *
 * - Closed: the stamps of the active collection peek over the front; the scene tilts towards a fine
 *   pointer (±1° X, ±1.5° Y). Hover or visible focus on the lid makes it peek (−3° X).
 * - Open (click on the lid, `aria-expanded`): the folder drops and turns, the lid falls back and the
 *   stamps fan out. Under a fine pointer a stamp lifts, tilts and shows its name.
 * - A lamp switches collection: progress dips below 0 (the stamps sink and fade), the content swaps
 *   at `switch.swapAt` and the folder opens again. ←/→ wrap, Home/End jump; Escape closes and
 *   returns focus to the lid.
 *
 * The SSR paints the closed folder with the first collection, its lamps and lid `disabled` until the
 * island hydrates, plus the active collection as visually hidden text. Reduced motion: every spring
 * jumps and nothing tilts. The CSS (`toolkit-folder.css`) is imported by ToolkitSection.astro.
 */
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from 'motion/react';
import { TOOLKIT_FOLDER } from '@/components/motion/presets';
import { TOOLKIT, type ToolkitCollectionId, type ToolkitTool } from '@/data/toolkit';
import {
  FOLDER_DESIGN,
  FOLDER_PARTS,
  designScale,
  folderPose,
  lampCenter,
  nameOffset,
  nextLampIndex,
  sceneTilt,
  stampPose,
  stampZIndex,
} from '@/lib/toolkit-folder';

export interface ToolkitFolderLabels {
  open: string;
  close: string;
  collectionsLabel: string;
  collections: Record<ToolkitCollectionId, string>;
}

export interface ToolkitFolderProps {
  labels: ToolkitFolderLabels;
}

interface SpringPreset {
  stiffness: number;
  damping: number;
  mass: number;
}

const springOf = ({ stiffness, damping, mass }: SpringPreset) => ({ stiffness, damping, mass });

const FINE_POINTER = '(hover: hover) and (pointer: fine)';
const { body, front, stamp: STAMP } = FOLDER_PARTS;
/** Where the front's top edge is in the design box, before the drop. */
const FRONT_TOP = body.top + front.top;
/** Room the clip leaves around the stamps on every side but the bottom (px). */
const CLIP_SLACK = 400;

const subscribeNothing = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

function finePointer(): boolean {
  return typeof matchMedia === 'function' && matchMedia(FINE_POINTER).matches;
}

function drive(value: MotionValue<number>, target: number, reduced: boolean) {
  if (reduced) value.jump(target);
  else value.set(target);
}

interface StampProps {
  tool: ToolkitTool;
  index: number;
  count: number;
  progress: MotionValue<number>;
  open: boolean;
  reduced: boolean;
}

function Stamp({ tool, index, count, progress, open, reduced }: StampProps) {
  const [showTag, setShowTag] = useState(false);
  const hover = springOf(TOOLKIT_FOLDER.stampHover);
  const lift = useSpring(0, hover);
  const tiltX = useSpring(0, hover);
  const tiltY = useSpring(0, hover);
  const x = useTransform(progress, (p) => stampPose(index, count, p).x);
  const poseY = useTransform(progress, (p) => stampPose(index, count, p).y);
  const y = useTransform([poseY, lift], ([base, up]: number[]) => (base ?? 0) - (up ?? 0));
  const rotate = useTransform(progress, (p) => stampPose(index, count, p).rotate);
  const scale = useTransform(progress, (p) => stampPose(index, count, p).scale);
  const opacity = useTransform(progress, (p) => stampPose(index, count, p).opacity);

  const rest = useCallback(() => {
    setShowTag(false);
    drive(lift, 0, reduced);
    drive(tiltX, 0, reduced);
    drive(tiltY, 0, reduced);
  }, [lift, tiltX, tiltY, reduced]);

  // Closing drops any hover lift (the tag hides through `open` below).
  useEffect(() => {
    if (open) return;
    drive(lift, 0, reduced);
    drive(tiltX, 0, reduced);
    drive(tiltY, 0, reduced);
  }, [open, lift, tiltX, tiltY, reduced]);

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!open || event.pointerType !== 'mouse' || !finePointer()) return;
    setShowTag(true);
    drive(lift, TOOLKIT_FOLDER.stampHover.lift, reduced);
    if (reduced) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const u = (event.clientX - rect.left) / rect.width;
    const v = (event.clientY - rect.top) / rect.height;
    const tilt = sceneTilt(u, v, {
      maxX: TOOLKIT_FOLDER.stampHover.tiltX,
      maxY: TOOLKIT_FOLDER.stampHover.tiltY,
    });
    tiltX.set(tilt.rotateX);
    tiltY.set(tilt.rotateY);
  };

  return (
    <motion.div
      className="toolkit-folder__stamp"
      role={open ? 'img' : undefined}
      aria-label={open ? tool.name : undefined}
      aria-hidden={open ? undefined : true}
      tabIndex={open ? 0 : -1}
      data-hovered={(open && showTag) || undefined}
      style={{
        x,
        y,
        rotate,
        scale,
        opacity,
        rotateX: tiltX,
        rotateY: tiltY,
        zIndex: stampZIndex(index, count),
        left: FOLDER_DESIGN.width / 2 - STAMP.width / 2,
        width: STAMP.width,
        height: STAMP.height,
      }}
      onPointerMove={onPointerMove}
      onPointerLeave={rest}
      onFocus={() => {
        if (!open) return;
        setShowTag(true);
        drive(lift, TOOLKIT_FOLDER.stampHover.lift, reduced);
      }}
      onBlur={rest}
    >
      <span
        className="toolkit-folder__sticker"
        style={{ '--tool-color': tool.color } as CSSProperties}
      >
        <svg
          className="toolkit-folder__logo"
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path d={tool.path} fill="currentColor" />
        </svg>
        <span className="toolkit-folder__sheen" />
      </span>
      <span className="toolkit-folder__tag" aria-hidden="true">
        {tool.name}
      </span>
    </motion.div>
  );
}

export function ToolkitFolder({ labels }: ToolkitFolderProps) {
  const reducedPreference = useReducedMotion();
  const reduced = reducedPreference ?? false;
  const rootRef = useRef<HTMLDivElement>(null);
  const lidRef = useRef<HTMLButtonElement>(null);
  const lampRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const stampsId = useId();
  const listId = useId();

  // False in the SSR and the hydration render, true after: the controls stay disabled until then.
  const hydrated = useSyncExternalStore(subscribeNothing, clientSnapshot, serverSnapshot);
  const [open, setOpen] = useState(false);
  /** Lamp the user picked (lights up and names itself at once). */
  const [selected, setSelected] = useState(0);
  /** Collection whose stamps are in the folder (swaps at the bottom of the dip). */
  const [shown, setShown] = useState(0);
  const [scale, setScale] = useState<number | undefined>(undefined);
  const pending = useRef<number | null>(null);

  const progress = useSpring(0, springOf(TOOLKIT_FOLDER.progress));
  const peek = useSpring(0, springOf(TOOLKIT_FOLDER.peek));
  const tiltX = useSpring(0, springOf(TOOLKIT_FOLDER.tilt));
  const tiltY = useSpring(0, springOf(TOOLKIT_FOLDER.tilt));
  const nameX = useSpring(nameOffset(0), springOf(TOOLKIT_FOLDER.labelSlide));
  const markX = useSpring(lampCenter(0), springOf(TOOLKIT_FOLDER.labelSlide));

  const folderY = useTransform(progress, (p) => folderPose(p).y);
  const folderRotate = useTransform(progress, (p) => folderPose(p).rotate);
  const floorScaleX = useTransform(progress, (p) => folderPose(p).floorScaleX);
  const lidRotateX = useTransform(
    [progress, peek],
    ([p, k]: number[]) => folderPose(p ?? 0).lidRotateX + (k ?? 0),
  );
  // Inside the pocket the stamps end `pocket` px below the lid's top edge; beside the folder they
  // stay whole, as they would be seen past its sides.
  const stampsClip = useTransform(progress, (p) => {
    const pose = folderPose(p);
    const cut = FRONT_TOP + pose.y + pose.pocket;
    const left = body.left;
    const right = body.left + body.width;
    const far = FOLDER_DESIGN.width + CLIP_SLACK;
    const low = FOLDER_DESIGN.height + CLIP_SLACK;
    return `polygon(-${CLIP_SLACK}px -${CLIP_SLACK}px, ${far}px -${CLIP_SLACK}px, ${far}px ${low}px, ${right}px ${low}px, ${right}px ${cut}px, ${left}px ${cut}px, ${left}px ${low}px, -${CLIP_SLACK}px ${low}px)`;
  });

  // Scale the design box to the slot the island is given.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      setScale(designScale(entry.contentRect.width, entry.contentRect.height));
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  // The content swaps when the dip crosses `swapAt`, then the folder opens again.
  useMotionValueEvent(progress, 'change', (p) => {
    if (pending.current === null || p > TOOLKIT_FOLDER.switch.swapAt) return;
    setShown(pending.current);
    pending.current = null;
    progress.set(1);
  });

  useEffect(() => {
    drive(nameX, nameOffset(selected), reduced);
    drive(markX, lampCenter(selected), reduced);
  }, [selected, nameX, markX, reduced]);

  const setOpenState = (next: boolean) => {
    setOpen(next);
    pending.current = null;
    if (!next) setShown(selected);
    drive(progress, next ? 1 : 0, reduced);
    if (next) {
      drive(tiltX, 0, reduced);
      drive(tiltY, 0, reduced);
    }
  };

  const choose = (index: number) => {
    setSelected(index);
    if (index === shown && pending.current === null) {
      if (!open) setOpenState(true);
      return;
    }
    setOpen(true);
    drive(tiltX, 0, reduced);
    drive(tiltY, 0, reduced);
    if (reduced) {
      pending.current = null;
      setShown(index);
      progress.jump(1);
      return;
    }
    pending.current = index;
    progress.set(TOOLKIT_FOLDER.switch.dip);
  };

  const onLampKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const next = nextLampIndex(selected, event.key, TOOLKIT.length);
    if (next === undefined) return;
    event.preventDefault();
    lampRefs.current[next]?.focus();
    choose(next);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape' || !open) return;
    event.preventDefault();
    setOpenState(false);
    lidRef.current?.focus();
  };

  const onScenePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (open || reduced || event.pointerType !== 'mouse' || !finePointer()) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const tilt = sceneTilt(
      (event.clientX - rect.left) / rect.width,
      (event.clientY - rect.top) / rect.height,
      TOOLKIT_FOLDER.tilt,
    );
    tiltX.set(tilt.rotateX);
    tiltY.set(tilt.rotateY);
  };

  const onSceneLeave = () => {
    drive(tiltX, 0, reduced);
    drive(tiltY, 0, reduced);
  };

  const startPeek = () => {
    if (!reduced) peek.set(TOOLKIT_FOLDER.peek.rotateX);
  };
  const endPeek = () => drive(peek, 0, reduced);

  const collection = TOOLKIT[shown] ?? TOOLKIT[0]!;
  const selectedCollection = TOOLKIT[selected] ?? TOOLKIT[0]!;
  const folderStyle = {
    y: folderY,
    rotate: folderRotate,
    left: body.left,
    top: body.top,
    width: body.width,
    height: body.height,
  };

  return (
    <div
      ref={rootRef}
      className="toolkit-folder"
      data-open={open || undefined}
      style={
        {
          '--toolkit-folder-scale': scale,
          '--toolkit-folder-tag-fade': `${TOOLKIT_FOLDER.tagFadeMs}ms`,
        } as CSSProperties
      }
      onKeyDown={onKeyDown}
    >
      <div className="toolkit-folder__stage">
        <motion.div
          className="toolkit-folder__scene"
          style={{ rotateX: tiltX, rotateY: tiltY }}
          onPointerMove={onScenePointerMove}
          onPointerLeave={onSceneLeave}
        >
          <motion.div
            className="toolkit-folder__floor"
            style={{ y: folderY, scaleX: floorScaleX }}
          />
          <motion.div className="toolkit-folder__layer" style={folderStyle}>
            <span className="toolkit-folder__tab" />
            <span className="toolkit-folder__back" />
          </motion.div>
          <motion.div
            className="toolkit-folder__stamps"
            id={stampsId}
            style={{ clipPath: stampsClip }}
          >
            {collection.tools.map((tool, index) => (
              <Stamp
                key={`${collection.id}-${tool.id}`}
                tool={tool}
                index={index}
                count={collection.tools.length}
                progress={progress}
                open={open}
                reduced={reduced}
              />
            ))}
          </motion.div>
          <motion.div
            className="toolkit-folder__layer toolkit-folder__layer_part_front"
            style={folderStyle}
          >
            <motion.div className="toolkit-folder__front" style={{ rotateX: lidRotateX }}>
              <span className="toolkit-folder__slit" />
              <button
                ref={lidRef}
                type="button"
                className="toolkit-folder__lid"
                aria-label={open ? labels.close : labels.open}
                aria-expanded={open}
                aria-controls={stampsId}
                aria-describedby={listId}
                disabled={!hydrated}
                onClick={() => setOpenState(!open)}
                onPointerEnter={(event) => {
                  if (event.pointerType === 'mouse') startPeek();
                }}
                onPointerLeave={endPeek}
                onFocus={(event) => {
                  if (event.currentTarget.matches(':focus-visible')) startPeek();
                }}
                onBlur={endPeek}
              />
              <motion.span className="toolkit-folder__name" style={{ x: nameX }} aria-hidden="true">
                {labels.collections[selectedCollection.id]}
              </motion.span>
              <motion.span className="toolkit-folder__mark" style={{ x: markX }} />
              <div
                className="toolkit-folder__lamps"
                role="group"
                aria-label={labels.collectionsLabel}
              >
                {TOOLKIT.map((item, index) => (
                  <button
                    key={item.id}
                    ref={(node) => {
                      lampRefs.current[index] = node;
                    }}
                    type="button"
                    className={`toolkit-folder__lamp toolkit-folder__lamp_color_${item.lamp}`}
                    aria-label={labels.collections[item.id]}
                    aria-pressed={index === selected}
                    disabled={!hydrated}
                    onClick={() => choose(index)}
                    onKeyDown={onLampKeyDown}
                  >
                    <span className="toolkit-folder__fog" />
                    <span className="toolkit-folder__halo" />
                    <span className="toolkit-folder__core" />
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
      <div className="sr-only" id={listId}>
        <p>{labels.collections[collection.id]}</p>
        <ul>
          {collection.tools.map((tool) => (
            <li key={tool.id}>{tool.name}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
