// IDN labels: a U-label (`bücher`) and its A-label (`xn--bcher-kva`), the
// form DNS carries it in.

const ldh = /^[\da-z-]+$/;

/**
 * The A-label for a U-label, or `undefined` when UTS #46 rejects it or maps
 * it to something other than one IDN label (plain ASCII, or two labels, as
 * `。` becomes a dot).
 *
 * @remarks
 * Converts by way of the WHATWG URL host parser, which every runtime the
 * package supports has and which applies UTS #46 with its bidi and joiner
 * checks. It leaves hyphens and lengths alone, so the caller checks those.
 */
export function toALabel(label: string): string | undefined {
  let host: string;
  try {
    host = new URL(`http://x.${label}`).hostname;
  } catch {
    return undefined;
  }
  const aLabel = host.slice(2);
  return aLabel.startsWith('xn--') && ldh.test(aLabel) ? aLabel : undefined;
}
