/**
 * Keyboard of a state rail (a radiogroup): the arrows move to the neighbour and wrap, Home and End
 * jump to the ends. Returns the index to select, or `null` when the key is not the rail's.
 */
export function railIndexForKey(current: number, key: string, count: number): number | null {
  if (count <= 0) return null;
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return (current + 1) % count;
    case 'ArrowLeft':
    case 'ArrowUp':
      return (current - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}
