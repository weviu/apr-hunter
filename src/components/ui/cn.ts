/**
 * Minimal className joiner — filters out falsy values and joins with spaces.
 * Keeps the primitives dependency-free. Caller-supplied `className` is always
 * appended last so it can override earlier utilities.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
