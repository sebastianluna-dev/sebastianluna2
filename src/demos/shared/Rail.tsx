import { useRef, type KeyboardEvent } from 'react';
import { railIndexForKey } from './rail-keys';
import styles from './rail.module.css';

export interface RailOption<Id extends string> {
  id: Id;
  label: string;
}

interface RailProps<Id extends string> {
  /** Accessible name of the group: what the states are of. */
  label: string;
  options: readonly RailOption<Id>[];
  value: Id;
  onChange: (id: Id) => void;
  /** Read out when the state changes (`aria-live`), e.g. the caption of the chosen state. */
  status?: string;
}

/**
 * The state rail of a demo: a radiogroup of pills the reader walks with a click or the arrow keys,
 * as the scenes of the reference do. Colours come from the `--d-rail-*` tokens of the demo.
 */
export function Rail<Id extends string>({
  label,
  options,
  value,
  onChange,
  status,
}: RailProps<Id>) {
  const group = useRef<HTMLDivElement>(null);
  const current = Math.max(
    0,
    options.findIndex((option) => option.id === value),
  );

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const next = railIndexForKey(current, event.key, options.length);
    const option = next === null ? undefined : options[next];
    if (!option) return;
    event.preventDefault();
    onChange(option.id);
    group.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next ?? 0]?.focus();
  }

  return (
    <div className={styles.rail}>
      <div
        ref={group}
        className={styles.rail__group}
        role="radiogroup"
        aria-label={label}
        onKeyDown={onKeyDown}
      >
        {options.map((option) => {
          const checked = option.id === value;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              className={styles.rail__option}
              onClick={() => onChange(option.id)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {status !== undefined && (
        <p className={styles.rail__status} aria-live="polite">
          {status}
        </p>
      )}
    </div>
  );
}
