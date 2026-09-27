// Deliberately broken, to exercise the PR gate's failure reports. Reverted next.
export function probe(): number {
  debugger;
  const n: number   = 'not a number';
  return n;
}
